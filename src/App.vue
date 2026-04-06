<script setup lang="ts">
import { ref, provide } from 'vue';
import { createEngine, processOfflineTime } from 'open-loop-engine';
import { Screen } from '@/types';
import { allModules } from '@/modules';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import GameScreen from '@/ui/screens/GameScreen.vue';

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

function startGame(slotId: number, modId?: string) {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();

  const result = engine.load();
  if (result.success && result.timestamp) {
    const elapsed = (Date.now() - result.timestamp) / 1000;
    if (elapsed > 0) {
      processOfflineTime(engine.loop, elapsed);
    }
  }

  currentScreen.value = Screen.Game;
}
</script>

<template>
  <SlotScreen v-if="currentScreen === Screen.Slots" :engine="engine" @start="startGame" />
  <GameScreen v-else-if="currentScreen === Screen.Game" />
</template>
