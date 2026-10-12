<!--
  GameView — the in-game subtree. Mounts under the root's post-start `v-else`
  frame, so module getters / composables / injects are all safe to read
  here (the module graph is installed by the time this component sets up).

  This is where your game lives: pull module state in `<script setup>`, render it
  in the template. Keep the root (`GameAppRoot.vue`) routing-only — never read a
  module there. See `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { SingleColumnShell } from '@/lib';

// Read your modules here, e.g.:
//   import { getMyThing } from '../modules';
//   const thing = getMyThing();
</script>

<template>
  <SingleColumnShell>
    <section class="game-placeholder">
      <h2>Hello from your new game.</h2>
      <p>
        The scaffold is wired: engine, save slots, settings, theme, and the balance workbench all
        work. Start building by adding a module in
        <code>src/game/modules/</code> and rendering its state here.
      </p>
    </section>
  </SingleColumnShell>
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
