<script setup lang="ts">
import { ref, provide, watchEffect } from 'vue';
import { Decimal, createEngine, processOfflineTime, format } from 'open-loop-engine';
import { Screen } from '@/types';
import { modDefs } from '@/modules';
import { SettingsKey } from '@/modules/settings';
import { GatheringKey } from '@/modules/gathering';
import { useTheme } from '@/composables/useTheme';
import { useNotation } from '@/composables/useNotation';
import { useSaveEvents } from '@/composables/useSaveEvents';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import GameScreen from '@/ui/screens/GameScreen.vue';
import OfflineReportModal from '@/ui/components/OfflineReportModal.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';

const currentScreen = ref<Screen>(Screen.Slots);

const engine = createEngine({
  gameId: 'open-loop-starter',
  tickRate: 20,
  autoSaveInterval: 60000,
  mods: modDefs,
});

useSaveEvents(engine.saveManager!);

provide('engine', engine);
provide('currentScreen', currentScreen);

// Offline report state
const offlineReport = ref<{ elapsed: number; gains: Record<string, string> } | null>(null);

function startGame(slotId: number, modId?: string) {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();

  // Wire up composables that depend on engine being started
  useTheme();
  useNotation();

  // Confirm on close
  const settingsState = engine.tryInject(SettingsKey);
  watchEffect(() => {
    if (settingsState?.settings.confirmOnClose.value && currentScreen.value === Screen.Game) {
      window.onbeforeunload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        return '';
      };
    } else {
      window.onbeforeunload = null;
    }
  });

  const result = engine.load();
  if (result.success && result.timestamp) {
    const elapsed = (Date.now() - result.timestamp) / 1000;
    if (elapsed > 60 && settingsState?.settings.offlineProgress.value) {
      const gatheringState = engine.tryInject(GatheringKey);

      // Snapshot before
      const woodBefore = gatheringState
        ? Decimal.floor(gatheringState.resources.wood.value)
        : Decimal.dZero;
      const stoneBefore = gatheringState
        ? Decimal.floor(gatheringState.resources.stone.value)
        : Decimal.dZero;
      const goldBefore = gatheringState
        ? Decimal.floor(gatheringState.resources.gold.value)
        : Decimal.dZero;

      const processed = processOfflineTime(engine.loop, elapsed);

      if (processed > 0 && gatheringState) {
        const gains: Record<string, string> = {};
        const woodGain = Decimal.floor(gatheringState.resources.wood.value).sub(woodBefore);
        const stoneGain = Decimal.floor(gatheringState.resources.stone.value).sub(stoneBefore);
        const goldGain = Decimal.floor(gatheringState.resources.gold.value).sub(goldBefore);
        if (woodGain.gt(0)) gains['Wood'] = '+' + format(woodGain);
        if (stoneGain.gt(0)) gains['Stone'] = '+' + format(stoneGain);
        if (goldGain.gt(0)) gains['Gold'] = '+' + format(goldGain);
        if (Object.keys(gains).length > 0) {
          offlineReport.value = { elapsed: processed, gains };
        }
      }
    }
  }

  currentScreen.value = Screen.Game;
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    @start="startGame"
  />
  <GameScreen v-else-if="currentScreen === Screen.Game" />
  <OfflineReportModal
    v-if="offlineReport"
    :elapsed="offlineReport.elapsed"
    :gains="offlineReport.gains"
    @close="offlineReport = null"
  />
  <ToastContainer />
</template>
