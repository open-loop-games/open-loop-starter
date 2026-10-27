<!--
  SurvivorGameView — the in-game subtree. Mounts under the root's post-start `v-else` frame,
  so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: one per screen. The survivor-like majority is a fullscreen arena canvas with a
  peripheral overlay HUD, and full-screen surfaces between runs. So the take is a StageShell
  with its HUD as floats, and the call sheet and the wrap card are ColumnShell pages, because
  a stage clips and they scroll.
-->
<script setup lang="ts">
import { addResource } from '@open-loop/engine';
import { useDevHandle } from '@/composables/useDevHandle';
import { getMeta, getTake } from '../modules';
import CallSheet from './CallSheet.vue';
import TakeView from './TakeView.vue';
import WrapScreen from './WrapScreen.vue';

const take = getTake();

// Dev-only handle for the screenshot loop: window.__game.skip(seconds), the modules, and
// setters for clout and the ledger. The engine runs fixed ticks, so the skip's advance
// already steps the floor one tick at a time and needs no chunk.
if (import.meta.env.DEV) {
  const meta = getMeta();
  useDevHandle({
    take,
    meta,
    grant: (clout: number) => addResource(meta.clout, clout),
    /** Records every star as having wrapped ratings up to `index`, which opens the next. */
    clear: (index: number) => {
      meta.record.bestRatingCleared.value = index;
      for (const w of Object.values(meta.record.wrapped)) w.value = index;
    },
  });
}
</script>

<template>
  <CallSheet v-if="take.view.screen === 'call-sheet'" />
  <TakeView v-else-if="take.view.screen === 'take' || take.view.screen === 'rewrite'" />
  <WrapScreen v-else-if="take.view.screen === 'wrap'" />
</template>
