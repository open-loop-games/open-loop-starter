<!--
  LooperGameView — the in-game subtree (the adventuring loop). Mounts under the
  root's post-start `v-else`, so module reads (the panels' getters) are all safe
  here. The root stays routing + chrome only; see
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { AppFrame, ThreePanelShell, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import TownColumn from './components/TownColumn.vue';
import ActionColumn from './components/ActionColumn.vue';
import HeaderBand from './components/HeaderBand.vue';
import StatsPanel from './components/StatsPanel.vue';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="emit('return')"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Looper — Classic Adventuring
          </h4>
          <p>
            Queue up actions, watch your mana drain, and feel the difference next loop. Skills
            carry; the road remembers; you do too.
          </p>
        </template>
      </SystemHeader>
    </template>
    <ThreePanelShell
      left-width="240px"
      right-width="480px"
    >
      <template #left>
        <StatsPanel />
      </template>
      <TownColumn />
      <template #right>
        <div class="looper-main">
          <HeaderBand />
          <ActionColumn />
        </div>
      </template>
    </ThreePanelShell>
  </AppFrame>
</template>

<style scoped>
.looper-main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}
</style>
