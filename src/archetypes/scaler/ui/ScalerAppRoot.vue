<!--
  Scaler app root — placeholder.
  Sub-leaf 2b.2 replaces this with the SidebarMainShell + Tabs composition.
  Exists as a real SFC at the planned location so boot.ts can already import
  it; the gallery card surfaces and the engine ticks even before the UI lands.
-->
<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { type Engine } from 'open-loop-engine';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import { manifest } from '../manifest';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);

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

onMounted(() => {
  document.body.dataset.archetype = 'scaler';
});
onUnmounted(() => {
  delete document.body.dataset.archetype;
});
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    :app-name="manifest.name"
    @start="startGame"
  />
  <div
    v-else
    class="scaler-stub"
  >
    <header class="scaler-stub__header">
      <h2>{{ manifest.name }}</h2>
      <button
        class="btn-sm"
        @click="returnToSlots"
      >
        Save & exit
      </button>
    </header>
    <main class="scaler-stub__body">
      <p>Composables ready. Tier panels land in sub-leaf 2b.2.</p>
      <p>Engine is running — open the dev panel (F12) to inspect via the Balance Workbench.</p>
    </main>
  </div>
</template>

<style scoped>
.scaler-stub {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}
.scaler-stub__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap);
  border-bottom: 1px solid var(--color-border);
}
.scaler-stub__body {
  padding: var(--gap);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>
