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
import { inject } from 'vue';
import { addResource, type Engine } from '@open-loop/engine';
import { INTERVAL_RATE, getMeta, getTake } from '../modules';
import CallSheet from './CallSheet.vue';
import TakeView from './TakeView.vue';
import WrapScreen from './WrapScreen.vue';

const take = getTake();

// Dev-only hook for the screenshot loop: a stable handle on the modules, a skip that plays
// the floor forward tick by tick, and setters for clout and the ratings record. Read through
// the hook, not a live `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  const meta = getMeta();
  (window as unknown as Record<string, unknown>).__soundstage = {
    engine,
    take,
    meta,
    skip: (seconds: number) => {
      for (let t = 0; t < seconds * INTERVAL_RATE; t++)
        engine.tickDriver.advanceTime(1 / INTERVAL_RATE);
    },
    grant: (clout: number) => addResource(meta.clout, clout),
    /** Records ratings up to `index` as taken to CUT, which opens the next. */
    clear: (index: number) => (meta.record.bestRatingCleared.value = index),
  };
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
