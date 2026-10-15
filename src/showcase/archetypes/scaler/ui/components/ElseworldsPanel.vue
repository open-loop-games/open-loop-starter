<!--
  ElseworldsPanel — the graded runs. Each card states its rule, its reward and
  the next tier's goal, with five tier pips: resolved, open, or beyond the cap
  (dashed). Entering one reboots the timeline under the rule; reaching the goal
  before the next Reboot resolves the tier and grows the permanent reward. Dark
  Days opens with the first Rewrite and Lost Earth with the first Age.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ELSEWORLDS, ELSEWORLD_TIERS } from '../../data';
import { getPrestige, getRun } from '../../modules';
import { fmt } from '../format';

const prestige = getPrestige();
const run = getRun();

const cards = computed(() =>
  ELSEWORLDS.flatMap((def) => {
    const c = prestige.elseworlds.getChallenge(def.id)!;
    if (!c.visible.value && !c.completed.value) return [];
    const done = c.completions.value;
    const goal = def.goals[Math.min(done, ELSEWORLD_TIERS - 1)];
    return [
      {
        def,
        done,
        goal,
        entered: c.entered.value,
        maxed: c.maxed.value,
        capped: !c.maxed.value && done >= prestige.elseworldCap.value,
        canEnter: c.canEnter.value,
        fill: c.entered.value ? Math.min(1, Decimal.div(run.runEarned.value, goal).toNumber()) : 0,
        pips: Array.from({ length: ELSEWORLD_TIERS }, (_, i) =>
          i < done ? 'done' : i < prestige.elseworldCap.value ? 'open' : 'locked',
        ),
      },
    ];
  }),
);
</script>

<template>
  <section class="panel elseworlds">
    <span class="caption cape">Elseworlds</span>
    <p class="lede">
      Take on the city's worst night under worse rules. Entering ends your current issue with no
      Legacy. Reach the goal before you Reboot and the tier is resolved: its reward grows and stays.
    </p>
    <ul class="list">
      <li
        v-for="card in cards"
        :key="card.def.id"
        class="elseworld reveal"
        :class="{ entered: card.entered, done: card.maxed }"
      >
        <div class="top">
          <div class="name">{{ card.def.displayName }}</div>
          <ol class="pips" :aria-label="`${card.done} of ${ELSEWORLD_TIERS} tiers resolved`">
            <li v-for="(pip, i) in card.pips" :key="i" :class="pip" />
          </ol>
        </div>
        <p class="rule"><b>Rule.</b> {{ card.def.rule }}</p>
        <p class="reward"><b>Reward.</b> {{ card.def.reward }}</p>
        <div v-if="!card.maxed" class="goal num">
          Tier {{ card.done + 1 }} goal: {{ fmt(card.goal) }} Justice in one run
        </div>
        <template v-if="card.entered">
          <ProgressBar class="meter cape" :value="card.fill" />
          <Button class="act ghost" @click="prestige.abandonElseworld()"> Abandon </Button>
        </template>
        <div v-else-if="card.maxed" class="stamp resolved">Resolved ×{{ ELSEWORLD_TIERS }}</div>
        <div v-else-if="card.capped" class="capped">
          Tier {{ card.done + 1 }} needs the
          {{ card.done < 4 ? 'Elseworld Archives' : 'Canonical Elseworlds' }}.
        </div>
        <Button
          v-else
          class="act cape"
          :disabled="!card.canEnter"
          :data-testid="`enter-${card.def.id}`"
          @click="prestige.enterElseworld(card.def.id)"
        >
          Enter tier {{ card.done + 1 }}
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
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.name {
  font-family: var(--face-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}
.pips {
  display: flex;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.pips li {
  width: 10px;
  height: 10px;
  border: 2px solid var(--newsprint-faint);
  transform: rotate(45deg);
}
.pips li.done {
  background: var(--signal);
  border-color: var(--gutter-ink);
}
.pips li.locked {
  border-style: dashed;
  opacity: 0.6;
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
.capped {
  font-size: 12px;
  color: var(--newsprint-dim);
  border: 2px dashed var(--newsprint-faint);
  padding: 6px 8px;
}
.resolved {
  align-self: flex-start;
  color: var(--steel);
}
</style>
