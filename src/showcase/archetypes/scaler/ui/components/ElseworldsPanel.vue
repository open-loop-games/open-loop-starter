<!--
  ElseworldsPanel — the graded runs. Each card states its rule, its reward and
  its goal; entering one reboots the timeline under the rule, and reaching the
  goal before the next Reboot makes the reward permanent.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ELSEWORLDS } from '../../data';
import { getPrestige, getRun } from '../../modules';
import { fmt } from '../format';

const prestige = getPrestige();
const run = getRun();

const cards = computed(() =>
  ELSEWORLDS.map((def) => {
    const c = prestige.elseworlds.getChallenge(def.id)!;
    return {
      def,
      entered: c.entered.value,
      done: c.completed.value,
      canEnter: c.canEnter.value && !c.completed.value,
      fill: c.entered.value
        ? Math.min(1, Decimal.div(run.runEarned.value, def.goalJustice).toNumber())
        : 0,
    };
  }),
);
</script>

<template>
  <section class="panel elseworlds">
    <span class="caption cape">Elseworlds</span>
    <p class="lede">
      Take on the city's worst night under worse rules. Entering ends your current issue with no
      Legacy. Reach the goal before you Reboot and the reward is permanent.
    </p>
    <ul class="list">
      <li
        v-for="card in cards"
        :key="card.def.id"
        class="elseworld"
        :class="{ entered: card.entered, done: card.done }"
      >
        <div class="name">{{ card.def.displayName }}</div>
        <p class="rule"><b>Rule.</b> {{ card.def.rule }}</p>
        <p class="reward"><b>Reward.</b> {{ card.def.reward }}</p>
        <div class="goal num">Goal: {{ fmt(card.def.goalJustice) }} Justice in one run</div>
        <template v-if="card.entered">
          <ProgressBar class="meter cape" :value="card.fill" />
          <Button class="act ghost" :repeat="false" @click="prestige.abandonElseworld()">
            Abandon
          </Button>
        </template>
        <div v-else-if="card.done" class="stamp resolved">Resolved</div>
        <Button
          v-else
          class="act cape"
          :repeat="false"
          :disabled="!card.canEnter"
          :data-testid="`enter-${card.def.id}`"
          @click="prestige.enterElseworld(card.def.id)"
        >
          Enter Elseworld
        </Button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.elseworld {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--night-raised);
  border: 2px solid var(--gutter-ink);
  border-top: 5px solid var(--newsprint-faint);
  padding: 10px 12px;
}
.elseworld.entered {
  border-top-color: var(--cape);
}
.elseworld.done {
  border-top-color: var(--steel);
}
.name {
  font-family: var(--face-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}
.rule,
.reward {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--newsprint-dim);
}
.rule b {
  color: var(--cape);
}
.reward b {
  color: var(--signal);
}
.goal {
  font-size: 11px;
}
.resolved {
  align-self: flex-start;
  color: var(--steel);
}
</style>
