<!--
  SurvivorGameView — the in-game subtree. Mounts under the root's post-start `v-else` frame,
  so module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: `Soundstage`, a declared invention rather than a `src/lib/shells/` pick. The
  survivor-like majority in `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`
  is a fullscreen arena canvas with a peripheral overlay HUD and full-screen surfaces between
  runs; `src/lib/shells/` has no shell for it. Between takes the call sheet and the wrap card
  take the whole stage.
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
  <div class="soundstage-page">
    <CallSheet v-if="take.view.screen === 'call-sheet'" />
    <TakeView v-else-if="take.view.screen === 'take' || take.view.screen === 'rewrite'" />
    <WrapScreen v-else-if="take.view.screen === 'wrap'" />
  </div>
</template>

<style scoped>
.soundstage-page {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
