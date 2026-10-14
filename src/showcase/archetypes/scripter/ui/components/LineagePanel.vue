<!--
  LineagePanel — what outlasts the student. Graduation sends the student on pilgrimage:
  the dojo resets, Insight banks, and the scroll and the rack stay. The old master's
  scrolls are bought with Insight and outlast every graduation. Below, the student's
  hand: the executor tier, its cadence and how many moves a scroll holds.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { EXECUTOR_TIERS, SCROLLS, META } from '../../data';
import { getDojo, getGate, getGraduation, getKata, getLineage } from '../../modules';
import { fmt, fmtMult } from '../format';

const lineage = getLineage();
const graduation = getGraduation();
const dojo = getDojo();
const gate = getGate();
const kata = getKata();

const fill = computed(() =>
  Math.min(1, Decimal.div(dojo.runKi.value, graduation.threshold.value).toNumber()),
);
const shown = computed(() => lineage.graduations.value > 0 || fill.value > 0.25);
const tierIndex = computed(() => EXECUTOR_TIERS.findIndex((t) => t.id === kata.tier.value));
const nextTier = computed(() => EXECUTOR_TIERS[tierIndex.value + 1] ?? null);
const scrolls = computed(() =>
  SCROLLS.map((def) => {
    const p = lineage.scrolls.getPurchasable(def.id)!;
    const level = lineage.level(def.id);
    const maxed = level >= META[def.id].limit;
    return {
      def,
      p,
      level,
      maxed,
      cost: maxed ? null : META[def.id].base * Math.pow(META[def.id].growth, level),
    };
  }),
);
</script>

<template>
  <section class="if-panel lineage" aria-label="Lineage">
    <h2 class="if-title">
      The hand <small>{{ EXECUTOR_TIERS[tierIndex].displayName }}</small>
    </h2>
    <p class="hand num">
      a beat every {{ kata.beatSeconds.value.toFixed(2) }}s · {{ kata.lineCap.value }} moves on a
      scroll
      <template v-if="nextTier"
        ><br />next: {{ nextTier.displayName }}, by {{ nextTier.hint }}</template
      >
    </p>

    <template v-if="shown">
      <h2 class="if-title if-reveal">
        Graduation <small class="num">Insight {{ fmt(lineage.insight.value) }}</small>
      </h2>
      <div class="if-bar grad" :aria-label="`run Ki toward graduation: ${Math.round(fill * 100)}%`">
        <i :style="{ transform: `scaleX(${fill})` }" />
      </div>
      <div class="grad-row">
        <span class="num"
          >run Ki {{ fmt(dojo.runKi.value) }} / {{ fmt(graduation.threshold.value) }}</span
        >
        <Button
          class="if-act"
          :repeat="false"
          :disabled="graduation.pendingInsight.value < 1"
          data-testid="graduate"
          @click="graduation.graduate()"
        >
          Graduate<template v-if="graduation.pendingInsight.value >= 1">
            +<span class="num">{{ graduation.pendingInsight.value }}</span></template
          >
        </Button>
      </div>
      <p v-if="gate.inBout.value && graduation.pendingInsight.value >= 1" class="warn">
        Graduating now ends the bout without a result.
      </p>
      <p class="dim num">
        {{ lineage.graduations.value }} graduated · Dan {{ fmtMult(lineage.danMultiplier.value) }}
      </p>
      <ul v-if="lineage.graduations.value > 0" class="scrolls">
        <li v-for="s in scrolls" :key="s.def.id" class="scroll">
          <div>
            <span class="name">{{ s.def.displayName }}</span>
            <span v-if="s.level" class="level num"> {{ s.level }}</span>
            <p class="lore">{{ s.def.lore }}</p>
          </div>
          <span v-if="s.maxed" class="stamp">complete</span>
          <Button
            v-else
            class="if-act"
            :repeat="false"
            :disabled="!s.p.canPurchase.value"
            @click="graduation.study(s.def.id)"
          >
            Study <span class="num">{{ s.cost }}</span>
          </Button>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.hand,
.dim {
  margin: 0;
  font-size: 12px;
  color: var(--if-tatami);
}
.if-bar.grad > i {
  background: var(--if-lamplight);
}
.grad-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--if-tatami);
}
.warn {
  margin: 0;
  font-size: 12px;
  color: var(--if-vermilion);
}
.scrolls {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.scroll {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.name {
  font-size: 14px;
}
.level {
  color: var(--if-lamplight);
}
.lore {
  margin: 0;
  font-size: 12px;
  color: var(--if-tatami);
}
.stamp {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--if-indigo);
}
</style>
