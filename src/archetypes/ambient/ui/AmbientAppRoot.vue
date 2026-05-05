<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, provide, ref } from 'vue';
import { Decimal, processOfflineTime, type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, SingleColumnShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import Button from '@/ui/components/Button.vue';
import { manifest } from '../manifest';
import { SessionClockKey, getPrimaryResource, getUnlocks } from '../modules';
import IdleScenePanel from './panels/IdleScenePanel.vue';
import AutoProducerList from './panels/AutoProducerList.vue';
import UnlockTray from './panels/UnlockTray.vue';
import WelcomeBackOverlay from './panels/WelcomeBackOverlay.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';
import './ambient-theme.css';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&' +
  'family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&' +
  'display=swap';

function ensureAlmanacFonts(): void {
  if (document.getElementById('almanac-fonts')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const stylesheet = document.createElement('link');
  stylesheet.id = 'almanac-fonts';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONTS_HREF;
  document.head.append(preconnect1, preconnect2, stylesheet);
}

onMounted(() => {
  document.body.dataset.archetype = 'ambient';
  ensureAlmanacFonts();
});

onUnmounted(() => {
  delete document.body.dataset.archetype;
});

const stack = useModalStack();
function openAchievements(): void {
  const id = stack.push(AchievementGridDialog, { onClose: () => stack.remove(id) });
}

const WELCOME_BACK_MIN_GAP_SEC = 60;
const WELCOME_BACK_UNLOCK_ID = 'returns-welcomed';
function maybeShowWelcomeBack(gapSec: number, sproutDelta: Decimal): void {
  if (gapSec < WELCOME_BACK_MIN_GAP_SEC) return;
  if (getUnlocks().getPurchasable(WELCOME_BACK_UNLOCK_ID)?.active.value !== true) return;
  const id = stack.push(WelcomeBackOverlay, {
    gapSec,
    sproutDelta,
    onClose: () => stack.remove(id),
  });
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
  // only (excluding the catch-up). The pre/post primary snapshot brackets
  // processOfflineTime so the welcome-back overlay can quote the delta
  // grown while away.
  let resumeGapSec = 0;
  let resumeDelta = new Decimal(0);
  if (result.success && result.timestamp != null) {
    const sessionClock = engine.tryInject(SessionClockKey);
    const primary = getPrimaryResource();
    const gap = Math.max(0, (Date.now() - result.timestamp) / 1000);
    resumeGapSec = gap;
    if (sessionClock) sessionClock.lastResumeGapSec.value = gap;
    if (gap > 0) {
      const before = Decimal.fromValue(primary.value);
      processOfflineTime(engine.loop, gap, {
        maxOfflineSeconds: sessionClock?.offlineCapSeconds,
      });
      resumeDelta = Decimal.sub(primary.value, before);
    }
    sessionClock?.refreshElapsedAtResume();
  }

  currentScreen.value = Screen.Game;
  maybeShowWelcomeBack(resumeGapSec, resumeDelta);
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  currentScreen.value = Screen.Slots;
}

// Almanac (achievement-grid) is gated by the `garden-almanac` UI-affordance
// unlock. Reads through the module-scope getter — the unlocks category is
// only populated after engine.start(), and Screen.Game is the gate that
// guarantees that's run.
const almanacUnlocked = computed(() => {
  if (currentScreen.value !== Screen.Game) return false;
  return getUnlocks().getPurchasable('garden-almanac')?.active.value === true;
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
      <SystemHeader @return-to-slots="returnToSlots">
        <template #title>
          <Button
            class="almanac-title"
            data-testid="return-to-slots"
            title="Save and return to save picker"
            @click="returnToSlots"
          >
            <span class="almanac-title__eyebrow">An Almanac of</span>
            <span class="almanac-title__name">Cozy Farm</span>
            <span class="almanac-title__sub">vol. i &middot; printed at home, kept by the sill</span>
          </Button>
        </template>
        <template #about>
          <div class="almanac-info">
            <h4 class="almanac-info__title">
              A Quiet Garden
            </h4>
            <p>
              The garden grows on its own. Open it once in the morning, glance at it while a pot
              boils. Nothing expires. Nothing is about to be overrun. Sprouts pile up whether you
              are watching or not.
            </p>
          </div>
        </template>
        <template #extra-actions>
          <Button
            v-if="almanacUnlocked"
            class="btn-sm"
            data-testid="open-achievements"
            @click="openAchievements"
          >
            Almanac
          </Button>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell max-width="720px">
      <IdleScenePanel />
      <AutoProducerList />
      <UnlockTray />
    </SingleColumnShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics
    v-if="isDev"
    v-model:workbench-open="showDevPanel"
  />
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
/*
 * Almanac title — passed via SystemHeader's #title slot. Outer header
 * skin lives in ambient-theme.css, since .olui-system-header is rendered
 * by SystemHeader and not reachable from this component's scoped CSS.
 */
.almanac-title {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-display, Georgia, serif);
  color: var(--almanac-evergreen, #1f3322);
  text-align: left;
  position: relative;
  transition: color 140ms ease-out;
}

.almanac-title:hover {
  color: var(--almanac-evergreen-soft, #2d4a32);
  background: none;
}

.almanac-title__eyebrow {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.76em;
  letter-spacing: 0.12em;
  color: var(--almanac-moss, #4f6049);
  margin-bottom: 2px;
}

.almanac-title__name {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 500;
  font-style: italic;
  font-size: 2em;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--almanac-evergreen, #1f3322);
}

.almanac-title__sub {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.74em;
  letter-spacing: 0.04em;
  margin-top: 6px;
  color: var(--almanac-pencil, #6b6553);
}

/* ─── About popover content ──────────────────────────────────────────── */
.almanac-info {
  font-family: var(--font-body, Georgia, serif);
  max-width: 280px;
  color: var(--almanac-evergreen, #1f3322);
  line-height: 1.55;
  font-size: 0.92em;
}

.almanac-info__title {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 500;
  font-style: italic;
  font-size: 1.3em;
  letter-spacing: 0.02em;
  color: var(--almanac-evergreen, #1f3322);
  margin: 0 0 8px;
  border-bottom: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  padding-bottom: 6px;
}

.almanac-info p {
  margin: 0;
}
</style>
