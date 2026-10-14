<!--
  TugGameView — the in-game subtree. Mounts under the root's post-start `v-else` frame, so
  module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: SingleColumnShell. The lane-push row the shell mapping can classify (Warfare 1917,
  `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md` § lane-push) stacks a
  horizontal battlefield over a production menu, with resources at the top; a sample of one,
  so no majority, but the causeway wants the page's full width and nothing beside it. The
  keeps' banners over the causeway, the bailey and the heralds under it. In camp the shell
  gives way to the Chronicle's page.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { type Engine } from '@open-loop/engine';
import { SingleColumnShell } from '@/lib';
import { getBattle, getCauseway, getChronicle, getKeep } from '../modules';
import Bailey from './components/Bailey.vue';
import Camp from './components/Camp.vue';
import CausewayField from './components/CausewayField.vue';
import Heralds from './components/Heralds.vue';
import KeepBanners from './components/KeepBanners.vue';

const battle = getBattle();
const inCamp = computed(() => battle.phase.value === 'camp');

// Dev-only hook for the screenshot loop: a stable handle on the modules, and a skip that plays
// forward in quarter-second ticks. Read through the hook, not a live `import()` that Vite's
// module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  (window as unknown as Record<string, unknown>).__causeway = {
    engine,
    battle,
    causeway: getCauseway(),
    chronicle: getChronicle(),
    keeps: { player: getKeep('player'), rival: getKeep('rival') },
    skip: (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.25) engine.tickDriver.advanceTime(0.25);
    },
  };
}
</script>

<template>
  <div class="causeway-page">
    <Camp v-if="inCamp" />
    <SingleColumnShell v-else max-width="1240px">
      <div class="battle">
        <KeepBanners />
        <CausewayField />
        <div class="under">
          <Bailey />
          <Heralds />
        </div>
      </div>
    </SingleColumnShell>
  </div>
</template>

<style scoped>
.causeway-page {
  width: 100%;
}
.battle {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.under {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 24px;
  align-items: start;
}
</style>
