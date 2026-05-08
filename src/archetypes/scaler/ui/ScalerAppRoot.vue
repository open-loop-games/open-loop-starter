<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, provide, ref } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import { AppFrame, DevPanelOverlay, TabsBarShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import HudBar from '@/ui/components/HudBar.vue';
import { manifest } from '../manifest';
import BuildingsPanel from './BuildingsPanel.vue';
import UpgradesPanel from './UpgradesPanel.vue';
import PrestigePanel from './PrestigePanel.vue';
import RunesPanel from './RunesPanel.vue';
import CoinReadout from './CoinReadout.vue';
import PrestigeReadout from './PrestigeReadout.vue';
import OfferingsReadout from './OfferingsReadout.vue';
import { Decimal } from 'open-loop-engine';
import { getPrestigePoints } from '../modules';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

onMounted(() => {
  document.body.dataset.archetype = 'scaler';
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
});

const stack = useModalStack();

// Top-tab navigation — Synergism's canonical surface lookup. At leaf 1 only
// Buildings + Upgrades exist; later leaves add Achievements / Runes /
// Challenges / Settings as their content lands. TabsRoot wraps the shell so
// the trigger strip sits in the shell's top nav (`#tabs` slot) and the
// content panels render in the main area.
const activeTab = ref<string>('buildings');

// Runes tab unlocks at first prestige. `prestigePoints.cumulative` is
// `lifetime: true` so the latch is one-way once first prestige fires
// (canonical `Tabs.ts:632-634` rides on `player.unlocks.prestige`).
const prestigePoints = getPrestigePoints();
const runesUnlocked = computed(() => Decimal.gt(prestigePoints.cumulative?.value ?? 0, 0));

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
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="returnToSlots"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Scaler — Antimatter Physics
          </h4>
          <p>
            Buy producers, watch costs scale, hit a prestige threshold, ascend. Every tier
            compresses the one below it. The headline is the multiplier you build.
          </p>
        </template>
      </SystemHeader>
    </template>
    <TabsRoot
      v-model="activeTab"
      class="scaler-tabs"
    >
      <TabsBarShell>
        <template #resources>
          <HudBar>
            <CoinReadout />
            <PrestigeReadout />
            <OfferingsReadout />
          </HudBar>
        </template>
        <template #tabs>
          <TabsList class="scaler-tabs__list">
            <TabsTrigger
              value="buildings"
              class="scaler-tabs__trigger"
            >
              Buildings
            </TabsTrigger>
            <TabsTrigger
              value="upgrades"
              class="scaler-tabs__trigger"
            >
              Upgrades
            </TabsTrigger>
            <TabsTrigger
              value="prestige"
              class="scaler-tabs__trigger"
            >
              Prestige
            </TabsTrigger>
            <TabsTrigger
              v-if="runesUnlocked"
              value="runes"
              class="scaler-tabs__trigger"
            >
              Runes
            </TabsTrigger>
          </TabsList>
        </template>
        <TabsContent
          value="buildings"
          class="scaler-tabs__content"
        >
          <BuildingsPanel />
        </TabsContent>
        <TabsContent
          value="upgrades"
          class="scaler-tabs__content"
        >
          <UpgradesPanel />
        </TabsContent>
        <TabsContent
          value="prestige"
          class="scaler-tabs__content"
        >
          <PrestigePanel />
        </TabsContent>
        <TabsContent
          v-if="runesUnlocked"
          value="runes"
          class="scaler-tabs__content"
        >
          <RunesPanel />
        </TabsContent>
      </TabsBarShell>
    </TabsRoot>
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
.scaler-tabs {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.scaler-tabs__list {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}
.scaler-tabs__trigger {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}
.scaler-tabs__trigger[data-state='active'] {
  background: var(--color-accent, var(--color-surface));
  color: var(--color-text);
  border-color: var(--color-accent, var(--color-border));
}
.scaler-tabs__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--gap);
}
</style>
