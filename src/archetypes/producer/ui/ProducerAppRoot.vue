<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref } from 'vue';
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
import HeadlinePanel from './panels/HeadlinePanel.vue';
import ProducerPanel from './panels/ProducerPanel.vue';
import UpgradeTray from './panels/UpgradeTray.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
const showAchievements = ref(false);

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

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  engine.load();
  currentScreen.value = Screen.Game;
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  currentScreen.value = Screen.Slots;
}

// BalanceWorkbench takes a thunk so it can re-evaluate if the active mod
// swaps at runtime. The module list itself is static for the lifetime of
// the mounted engine, so no `computed` is needed — a plain lookup inside
// the thunk keeps the cost at zero until the dev overlay actually opens.
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
    @start="startGame"
  />
  <AppFrame
    v-else
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <div class="producer-header">
        <button
          class="title-button"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="returnToSlots"
        >
          <h2>Bakery</h2>
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
              Producer — Bakery
            </h4>
            <p>
              Click to bake cookies. Buy producers to bake automatically. Stack upgrades +
              achievements for the compounding multiplier that makes the curve go.
            </p>
          </Popover>
          <button
            class="btn-sm"
            @click="showAchievements = true"
          >
            Achievements
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
    <ThreePanelShell>
      <template #left>
        <ProducerPanel />
      </template>
      <HeadlinePanel />
      <template #right>
        <UpgradeTray />
      </template>
    </ThreePanelShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics v-if="isDev" />
  <AchievementGridDialog
    v-if="showAchievements"
    @close="showAchievements = false"
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
.producer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.producer-header h2 {
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
