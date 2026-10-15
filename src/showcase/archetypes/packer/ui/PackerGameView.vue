<!--
  PackerGameView — the in-game subtree, mounted under the root's post-start frame. The
  breach line runs full width over the shell: the fabricator on the left, the hull board
  in the centre, fire control and the hull's plating and refits on the right. The
  fitting state (the held module, the hovered cell) is provided here, so the board and
  both consoles read one hand. Escape lets go of the held module.
-->
<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted } from 'vue';
import type { Engine } from '@open-loop/engine';
import { ThreePanelShell } from '@/lib';
import { getBoard, getYard } from '../modules';
import { provideFitting } from './fitting';
import BreachLine from './components/BreachLine.vue';
import Fabricator from './components/Fabricator.vue';
import HullBoard from './components/HullBoard.vue';
import FireControl from './components/FireControl.vue';
import HullRefits from './components/HullRefits.vue';

const fitting = provideFitting();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') fitting.hand = null;
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

// Dev-only state hook for browser probes: reads live module state without an `import()`
// that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__hardpoint = {
    engine,
    yard: getYard(),
    board: getBoard(),
    fitting,
    skip: (seconds: number) => engine.tickDriver.advanceTime(seconds),
  };
}
</script>

<template>
  <div class="hp-deck">
    <BreachLine />
    <ThreePanelShell left-width="minmax(300px, 340px)" right-width="minmax(300px, 340px)">
      <template #left>
        <Fabricator />
      </template>
      <HullBoard />
      <template #right>
        <FireControl />
        <HullRefits />
      </template>
    </ThreePanelShell>
  </div>
</template>

<style scoped>
.hp-deck {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
