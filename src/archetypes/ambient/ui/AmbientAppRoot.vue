<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { processOfflineTime, type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, SingleColumnShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import Popover from '@/ui/components/Popover.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import { useToasts } from '@/composables/useToasts';
import { manifest } from '../manifest';
import { AmbientDataKey, ArcKey, SessionClockKey, UnlocksKey } from '../modules';
import IdleScenePanel from './panels/IdleScenePanel.vue';
import AutoProducerList from './panels/AutoProducerList.vue';
import UnlockTray from './panels/UnlockTray.vue';
import WelcomeBackOverlay from './panels/WelcomeBackOverlay.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

function onKey(e: KeyboardEvent): void {
  if (!isDev) return;
  if (e.key === 'F12') {
    e.preventDefault();
    showDevPanel.value = !showDevPanel.value;
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));

const stack = useModalStack();
function openSave(): void {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
}
function openSettings(): void {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
}
function openAchievements(): void {
  const id = stack.push(AchievementGridDialog, { onClose: () => stack.remove(id) });
}

const WELCOME_BACK_MIN_GAP_SEC = 60;
const WELCOME_BACK_UNLOCK_ID = 'returns-welcomed';
function maybeShowWelcomeBack(gapSec: number): void {
  if (gapSec < WELCOME_BACK_MIN_GAP_SEC) return;
  const unlocks = engine.tryInject(UnlocksKey);
  if (unlocks?.getPurchasable(WELCOME_BACK_UNLOCK_ID)?.active.value !== true) return;
  const id = stack.push(WelcomeBackOverlay, {
    gapSec,
    onClose: () => stack.remove(id),
  });
}

const { addToast } = useToasts();
let stopArcWatcher: (() => void) | null = null;
function armArcFlavourEvent(): void {
  stopArcWatcher?.();
  const arc = engine.tryInject(ArcKey);
  if (!arc) return;
  const announcedAtStart = arc.announced.value;
  stopArcWatcher = watch(
    arc.announced,
    (isAnnounced, wasAnnounced) => {
      if (!isAnnounced || wasAnnounced || announcedAtStart) return;
      addToast('Arc closed — Cozy Farm', arc.flavour, false);
    },
    { flush: 'sync' },
  );
}

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  const result = engine.load();

  // Resume sequence (session-clock.ts inline doc): write the wall-clock
  // catch-up gap before processOfflineTime so SessionClock observers see
  // the correct gap during the catch-up advance, then refresh
  // elapsedAtResume so secondsSinceLastResume measures live-session time
  // only (excluding the catch-up).
  let resumeGapSec = 0;
  if (result.success && result.timestamp != null) {
    const sessionClock = engine.tryInject(SessionClockKey);
    const data = engine.tryInject(AmbientDataKey);
    const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
    resumeGapSec = gap;
    if (sessionClock) sessionClock.lastResumeGapSec.value = gap;
    if (gap > 0) {
      const cap = data ? Number(data.balance.offlineCapHours) * 3600 : undefined;
      processOfflineTime(engine.loop, gap, { maxOfflineSeconds: cap });
    }
    sessionClock?.refreshElapsedAtResume();
  }

  armArcFlavourEvent();
  currentScreen.value = Screen.Game;
  maybeShowWelcomeBack(resumeGapSec);
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  stopArcWatcher?.();
  stopArcWatcher = null;
  currentScreen.value = Screen.Slots;
}

// Almanac (achievement-grid) is gated by the `garden-almanac` UI-affordance
// unlock. Inline tryInject — the unlocks category is only injectable after
// engine.start(), and Screen.Game is the gate that guarantees that's run.
const almanacUnlocked = computed(() => {
  if (currentScreen.value !== Screen.Game) return false;
  const unlocks = engine.tryInject(UnlocksKey);
  return unlocks?.getPurchasable('garden-almanac')?.active.value === true;
});

function getActiveModules(): EngineModule[] {
  const activeId = engine.activeModId;
  if (!activeId) return [];
  return engine.mods.find((m) => m.id === activeId)?.modules ?? [];
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <AppFrame
    v-else
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <div class="ambient-header">
        <button
          class="title-button"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="returnToSlots"
        >
          <h2>Cozy Farm</h2>
        </button>
        <div class="header-actions">
          <Popover
            align="end"
            :side-offset="8"
          >
            <template #trigger>
              <button
                class="btn-sm"
                data-testid="open-info"
              >
                ?
              </button>
            </template>
            <h4 style="margin-bottom: 6px">
              Ambient — Cozy Farm
            </h4>
            <p>
              Tend a quiet garden that grows on its own. Producers buy themselves into view as
              sprouts pile up. Come back later and watch the seasons turn.
            </p>
          </Popover>
          <button
            v-if="almanacUnlocked"
            class="btn-sm"
            data-testid="open-achievements"
            @click="openAchievements"
          >
            Almanac
          </button>
          <button
            class="btn-sm"
            @click="openSave"
          >
            Save
          </button>
          <button
            class="btn-sm"
            @click="openSettings"
          >
            Settings
          </button>
        </div>
      </div>
    </template>
    <SingleColumnShell max-width="720px">
      <IdleScenePanel />
      <AutoProducerList />
      <UnlockTray />
    </SingleColumnShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics v-if="isDev" />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench
      :engine="engine"
      :modules="getActiveModules"
    />
  </DevPanelOverlay>
</template>

<style scoped>
.ambient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.ambient-header h2 {
  font-size: 1.1em;
}

.title-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.title-button:hover h2 {
  color: var(--color-primary);
}

.header-actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>
