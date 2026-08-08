<!--
  SurvivorGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so every module read below here is structurally post-start
  (`.claude/rules/app-root-discipline.md`).

  Shell is `free-form`, declared-invention rather than a `src/lib/shells/` pick:
  a fullscreen floor with the readouts pinned over it. That is the survivor-like
  majority in `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`
  (fullscreen arena canvas + peripheral overlay HUD + a full-screen overlay for
  the between-runs surface), formally insufficient-corpus at N_classifiable=2 but
  consistent across all three exemplars. `manifest.shell` names it
  `ContainmentFloor`, the same declared-invention path tug takes.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { usePlayerControl } from '../composables/usePlayerControl';
import ArenaField from './ArenaField.vue';
import RunHud from './RunHud.vue';
import DraftOffers from './DraftOffers.vue';
import DebriefOverlay from './DebriefOverlay.vue';

const arena = useModule(ArenaKey);

// Keyboard control lives at the game-view root rather than in the HUD: it is
// listening on `window`, and the boundary that guarantees a started engine is
// the same one that should own its lifetime.
const control = usePlayerControl();

/** The floor keeps rendering under the debrief — the run you just lost stays on
 *  screen behind the record sheet, which is where the notes came from. Before
 *  the first run the same surface is the briefing (`../modules/arena.ts`). */
const running = computed(() => arena.outcome.value === 'running');
</script>

<template>
  <div class="floor">
    <ArenaField />
    <template v-if="running">
      <RunHud :driving="control.active.value" />
      <DraftOffers v-if="control.active.value" />
    </template>
    <DebriefOverlay v-else />
  </div>
</template>

<style scoped>
.floor {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
</style>
