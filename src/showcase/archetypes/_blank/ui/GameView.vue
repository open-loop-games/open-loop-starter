<!--
  GameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters / composables / injects are all safe to read
  here (the module graph is installed by the time this component sets up).

  This is where your game lives: pull module state in `<script setup>`, render it
  in the template. Keep the root (`GameAppRoot.vue`) routing-only — never read a
  module there, because it sets up before `engine.start()`.

  Shell: ColumnShell, one column capped at 800px. To grow the layout, fill its
  #topBar, #sideBarLeft or #sideBarRight slot; for a full-viewport stage, use StageShell.
-->
<script setup lang="ts">
import { ColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { getAutomation, getCore } from '../modules';

// Read your modules here through their getters, e.g. `const core = getCore();`.

// Dev-only handle for browser probes: window.__game.skip(seconds), and the
// module APIs a probe reads.
if (import.meta.env.DEV) {
  useDevHandle({ core: getCore(), automation: getAutomation() });
}
</script>

<template>
  <ColumnShell max-width="800px">
    <section class="game-placeholder">
      <h2>Hello from your new game.</h2>
      <p>
        The scaffold is wired: engine, save slots, settings, theme, and the balance workbench all
        work. Start building by adding a module in
        <code>src/game/modules/</code> and rendering its state here.
      </p>
    </section>
  </ColumnShell>
</template>

<style scoped>
.game-placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap-lg);
  text-align: center;
}
</style>
