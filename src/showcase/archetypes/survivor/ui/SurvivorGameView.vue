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
import ArenaField from './ArenaField.vue';
import RunHud from './RunHud.vue';
import DebriefOverlay from './DebriefOverlay.vue';

const arena = useModule(ArenaKey);

/** The floor keeps rendering under the debrief — the run you just lost stays on
 *  screen behind the record sheet, which is where the notes came from. */
const running = computed(() => arena.outcome.value === 'running');
</script>

<template>
  <div class="floor">
    <ArenaField />
    <RunHud v-if="running" />
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
