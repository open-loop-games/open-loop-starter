<script setup lang="ts">
import { ref, provide, watchEffect } from 'vue';
import Decimal from 'break_eternity.js';
import { createEngine, processOfflineTime, format } from 'open-loop-engine';
import { Screen } from '@/types';
import { allModules } from '@/modules';
import { stockSettings } from '@/modules/settings';
import { demoState } from '@/modules/demo';
import { useTheme } from '@/composables/useTheme';
import { useNotation } from '@/composables/useNotation';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import GameScreen from '@/ui/screens/GameScreen.vue';
import OfflineReportModal from '@/ui/components/OfflineReportModal.vue';

const currentScreen = ref<Screen>(Screen.Slots);

const engine = createEngine({
  gameId: 'open-loop-starter',
  tickRate: 20,
  autoSaveInterval: 60000,
});

for (const mod of allModules) {
  engine.use(mod);
}

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
  watchEffect(() => {
    if (stockSettings?.confirmOnClose.value && currentScreen.value === Screen.Game) {
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
    if (elapsed > 60 && stockSettings?.offlineProgress.value) {
      // Snapshot before
      const xpBefore = demoState ? Decimal.floor(demoState.woodcutting.xp.value) : Decimal.dZero;

      const processed = processOfflineTime(engine.loop, elapsed);

      // Compute gains
      if (processed > 0 && demoState) {
        const xpAfter = Decimal.floor(demoState.woodcutting.xp.value);
        const xpGain = xpAfter.sub(xpBefore);
        const gains: Record<string, string> = {};
        if (xpGain.gt(0)) {
          gains['Woodcutting XP'] = '+' + format(xpGain);
        }
        offlineReport.value = { elapsed: processed, gains };
      }
    }
  }

  currentScreen.value = Screen.Game;
}
</script>

<template>
  <SlotScreen v-if="currentScreen === Screen.Slots" :engine="engine" @start="startGame" />
  <GameScreen v-else-if="currentScreen === Screen.Game" />
  <OfflineReportModal
    v-if="offlineReport"
    :elapsed="offlineReport.elapsed"
    :gains="offlineReport.gains"
    @close="offlineReport = null"
  />
</template>
