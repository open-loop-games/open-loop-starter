<!--
  TugGameView — the in-game subtree (the armada match). Mounts under the root's
  post-start `v-else`, so module reads (the panels' getters, the match-end
  overlay) are all safe here. The root stays routing + chrome only; see
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { AppFrame, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import TugFrameLayout from './TugFrameLayout.vue';
import LaneStrip from './panels/LaneStrip.vue';
import UnitShop from './panels/UnitShop.vue';
import FortressBars from './panels/FortressBars.vue';
import IncomeBar from './panels/IncomeBar.vue';
import CounterMatrixPanel from './panels/CounterMatrixPanel.vue';
import MatchEndSummary from './panels/MatchEndSummary.vue';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();
</script>

<template>
  <AppFrame :stack="stack" :tooltip-delay="400">
    <template #header>
      <SystemHeader app-name="Tug — SciFi Armada" @return-to-slots="emit('return')">
        <template #about>
          <h4 style="margin-bottom: 6px">Tug — SciFi Armada</h4>
          <p>
            Spend minerals to send units down the lane. Counter the AI's composition by picking
            archetypes that beat its dominant unit. Reduce the enemy fortress to zero before yours
            falls — or before the timer runs out.
          </p>
        </template>
      </SystemHeader>
    </template>
    <TugFrameLayout>
      <template #lane>
        <LaneStrip />
      </template>
      <template #shop>
        <UnitShop side="player" />
      </template>
      <template #matrix>
        <CounterMatrixPanel />
      </template>
      <template #income>
        <IncomeBar />
      </template>
      <template #stats>
        <FortressBars />
      </template>
    </TugFrameLayout>
  </AppFrame>
  <MatchEndSummary />
</template>
