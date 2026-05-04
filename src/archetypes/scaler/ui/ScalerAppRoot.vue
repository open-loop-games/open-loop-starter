<!--
  Scaler app root. Mounts SidebarMainShell with:
    #sidebarResources → ResourceBar (always-visible 5-currency strip)
    #sidebar          → Achievements button
    default           → Tabs over the 3 tier panels

  Modifier-chain breakdowns live in the per-row ProducerTooltip — the
  sidebar can't fit 5 chains × 12+ factors per tier without monopolising
  the screen, and the data is naturally per-producer anyway.
-->
<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, SidebarMainShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import Tabs from '@/ui/components/Tabs.vue';
import { manifest } from '../manifest';
import type { Tier } from '../data/types';
import { ANTIMATTER_TIER, PRESTIGE_TIER, TRANSCEND_TIER } from './tier-configs';
import type { ExtraPurchasableRef } from '../composables/useTier';
import TierPanel from './components/TierPanel.vue';
import ResourceBar from './components/ResourceBar.vue';
import AccBoostRow from './components/AccBoostRow.vue';
import ChallengeStrip from './components/ChallengeStrip.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';
import './scaler-theme.css';

// Hide AccBoost from Transcend's UpgradeGrid — it owns its own row in the
// #extras slot below for the cross-currency UI cue.
const transcendVisibleExtras = (ref: ExtraPurchasableRef): boolean => ref.role !== 'acc-boost';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const activeTier = ref<Tier>('antimatter');

const TIER_TABS = [
  { value: 'antimatter', label: 'Antimatter' },
  { value: 'prestige', label: 'Prestige' },
  { value: 'transcend', label: 'Transcend' },
];

// Tabs binds with v-model:string; map through the typed Tier ref.
const tabValue = ref<string>(activeTier.value);
watch(tabValue, (v) => {
  activeTier.value = v as Tier;
});
watch(activeTier, (v) => {
  if (tabValue.value !== v) tabValue.value = v;
});

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);

onMounted(() => {
  document.body.dataset.archetype = 'scaler';
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
});

const stack = useModalStack();

function openAchievements(): void {
  const id = stack.push(AchievementGridDialog, { onClose: () => stack.remove(id) });
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
            Scaler — Synergism (slim port)
          </h4>
          <p>
            Buy producers, watch coins climb, prestige to convert into a stacking multiplier. A
            second layer compresses the first; a third compresses both. Modifier chains stack into
            the headline rate; Transcend challenges grant permanent bonuses.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SidebarMainShell sidebar-width="260px">
      <template #sidebarResources>
        <ResourceBar />
      </template>
      <template #sidebar>
        <button
          class="btn-sm scaler-achievements-btn"
          @click="openAchievements"
        >
          Achievements
        </button>
      </template>
      <Tabs
        v-model="tabValue"
        :items="TIER_TABS"
        class="scaler-tier-tabs"
      >
        <template #panel-antimatter>
          <TierPanel :config="ANTIMATTER_TIER" />
        </template>
        <template #panel-prestige>
          <TierPanel :config="PRESTIGE_TIER" />
        </template>
        <template #panel-transcend>
          <TierPanel
            :config="TRANSCEND_TIER"
            :visible-extras="transcendVisibleExtras"
          >
            <template #extras>
              <AccBoostRow />
              <ChallengeStrip />
            </template>
          </TierPanel>
        </template>
      </Tabs>
    </SidebarMainShell>
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
.scaler-tier-tabs {
  flex: 1;
  min-height: 0;
}
.scaler-achievements-btn {
  align-self: stretch;
  margin-top: var(--gap-sm);
}
</style>
