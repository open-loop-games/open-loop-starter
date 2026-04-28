<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, ThreePanelShell, useModalStack } from '@/lib';
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
import { ArcKey } from '../modules';
import ActionDrawerPanel from './panels/ActionDrawerPanel.vue';
import QueueEditorPanel from './panels/QueueEditorPanel.vue';
import CurrentLoopPanel from './panels/CurrentLoopPanel.vue';
import SkillsRetentionPanel from './panels/SkillsRetentionPanel.vue';

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

onMounted(() => {
  document.body.dataset.archetype = 'looper';
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
  window.removeEventListener('keydown', onKey);
});

const stack = useModalStack();
function openSave(): void {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
}
function openSettings(): void {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
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
      addToast('Arc closed — Looper', arc.flavour, false);
    },
    { flush: 'sync' },
  );
}

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  engine.load();
  armArcFlavourEvent();
  currentScreen.value = Screen.Game;
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  stopArcWatcher?.();
  stopArcWatcher = null;
  currentScreen.value = Screen.Slots;
}

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
      <div class="looper-header">
        <button
          class="title-button"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="returnToSlots"
        >
          <h2>{{ manifest.name }}</h2>
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
                aria-label="About"
              >
                ?
              </button>
            </template>
            <h4 style="margin-bottom: 6px">
              Looper — Classic Adventuring
            </h4>
            <p>
              Queue up actions, watch your mana drain, and feel the difference next loop. Skills
              carry; the road remembers; you do too.
            </p>
          </Popover>
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
    <ThreePanelShell
      left-width="260px"
      right-width="320px"
    >
      <template #left>
        <ActionDrawerPanel />
      </template>
      <div class="looper-main">
        <CurrentLoopPanel />
        <QueueEditorPanel />
      </div>
      <template #right>
        <SkillsRetentionPanel />
      </template>
    </ThreePanelShell>
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
.looper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.looper-header h2 {
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

.looper-main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}
</style>
