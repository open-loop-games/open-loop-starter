<!--
  TugGameView — the in-game subtree. Mounts under the root's post-start `v-else` frame, so
  module getters are safe to read here. See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell, capped at 1240px. Like Warfare 1917, it stacks a horizontal
  battlefield over a production menu, with resources at the top: the causeway wants the
  page's full width and nothing beside it. The keeps' banners are the top bar; under them the causeway, the walls
  (each keep's weapon and the early horn), then the bailey and the heralds. In camp the shell
  gives way to the Chronicle's page.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import { ColumnShell } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { ANCHORS, BOONS } from '../data';
import { getBattle, getCauseway, getChronicle, getKeep } from '../modules';
import Bailey from './components/Bailey.vue';
import Camp from './components/Camp.vue';
import CausewayField from './components/CausewayField.vue';
import Heralds from './components/Heralds.vue';
import KeepBanners from './components/KeepBanners.vue';
import Walls from './components/Walls.vue';

const battle = getBattle();
const inCamp = computed(() => battle.phase.value === 'camp');

// Dev-only state hook for browser probes, on window.__game: the modules, camp setters (the
// field, the twist, a boon), and a skip in quarter-second steps.
if (import.meta.env.DEV) {
  const chronicle = getChronicle();
  useDevHandle(
    {
      field: (rung: number) => (chronicle.rung.value = rung),
      twist: (id: string) => (chronicle.twistId.value = id),
      /** Grants a boon, crediting the renown its volume waits for. */
      grant: (id: string) => {
        const def = BOONS.find((b) => b.id === id)!;
        const xp = (ANCHORS.renownBase * (def.minVolume + 1) * (def.minVolume + 2)) / 2;
        chronicle.renown.addXp(Math.max(0, xp - toNumber(chronicle.renown.xp.value)));
        chronicle.boons.getPurchasable(id)!.purchase(1);
      },
      battle,
      causeway: getCauseway(),
      chronicle,
      keeps: { player: getKeep('player'), rival: getKeep('rival') },
    },
    { chunk: 0.25 },
  );
}
</script>

<template>
  <div class="causeway-page">
    <Camp v-if="inCamp" />
    <ColumnShell v-else max-width="1240px">
      <template #topBar>
        <KeepBanners />
      </template>
      <div class="battle">
        <CausewayField />
        <Walls />
        <div class="under">
          <Bailey />
          <Heralds />
        </div>
      </div>
    </ColumnShell>
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
