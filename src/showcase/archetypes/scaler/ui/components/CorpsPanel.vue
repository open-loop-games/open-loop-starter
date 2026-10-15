<!--
  CorpsPanel — the hero corps on starter's `ProducerList`, each row drawn in the
  `#row` slot as a comic rung: the rank, the hero, the rate, and Recruit / Max.
  A rung shows once the one below it is staffed, so the ladder reveals itself.
  Under No Powers the high tiers are stamped and dimmed.
-->
<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Switch from '@/ui/components/Switch.vue';
import { ProducerList, createProducerRow } from '@/ui/compositions';
import { HIGH_TIER_FROM, type TierDef } from '../../data';
import { getAutomation, getPrestige, getRun } from '../../modules';
import { fmt, fmtRate } from '../format';

const run = getRun();
const automation = getAutomation();
const prestige = getPrestige();

const dispatchOnline = computed(() => automation.ladder.isUnlocked('dispatch'));
const noPowers = computed(
  () => prestige.elseworlds.getChallenge('no-powers')?.entered.value ?? false,
);

interface Rung {
  def: TierDef;
  /** Justice per second from one unit. */
  each: ComputedRef<DecimalSource>;
  /** Stamped and dimmed: No Powers silences the high tiers. */
  silenced: ComputedRef<boolean>;
}

// The corps is fixed, so the rows are built once and their reactive parts are refs.
const rows = run.heroes.getAll().map(({ def, producer }, i, all) => {
  const below = i === 0 ? null : all[i - 1].producer;
  return createProducerRow<Rung>(producer, {
    displayName: def.displayName,
    unlocked: computed(
      () =>
        below === null ||
        Decimal.gt(producer.ownedCount.value, 0) ||
        Decimal.gt(below.ownedCount.value, 0),
    ),
    extra: {
      def,
      each: computed(() => producer.computedRate.value),
      silenced: computed(() => noPowers.value && def.tier >= HIGH_TIER_FROM),
    },
  });
});
</script>

<template>
  <section class="panel corps">
    <ProducerList :rows="rows" cost-label="Justice" bulk-mode-source="none">
      <template #header>
        <div class="head">
          <div>
            <span class="caption">The Corps</span>
            <p class="lede">
              Every hero earns Justice on their own. Each recruit costs more than the last.
            </p>
          </div>
          <Switch
            v-if="dispatchOnline"
            v-model="automation.dispatchOn.value"
            v-slot="{ on }"
            class="duty reveal"
            aria-label="Dispatch Desk on duty"
          >
            Dispatch Desk {{ on ? 'on duty' : 'off duty' }}
          </Switch>
        </div>
      </template>
      <template #row="{ row, purchase }">
        <div
          class="rung reveal"
          :class="{ silenced: row.extra!.silenced.value, idle: !row.canPurchase(1) }"
        >
          <div class="rank num">{{ row.extra!.def.tier }}</div>
          <div class="who">
            <div class="name">{{ row.displayName }}</div>
            <div class="blurb">{{ row.extra!.def.blurb }}</div>
            <div v-if="row.extra!.silenced.value" class="stamp">No powers</div>
          </div>
          <div class="stats num">
            <div class="owned">×{{ fmt(row.count.value) }}</div>
            <div class="rate">+{{ fmtRate(row.displayRate.value) }}/s</div>
            <div class="each">{{ fmtRate(row.extra!.each.value) }} each</div>
          </div>
          <div class="buys">
            <Button
              repeat
              class="act"
              :disabled="!row.canPurchase(1)"
              :data-testid="`recruit-${row.id}`"
              @click="purchase"
            >
              Recruit <span class="num">{{ fmt(row.cost(1)) }}</span>
            </Button>
            <Button
              class="act ghost"
              :disabled="!row.canPurchase(1)"
              @click="row.purchase(row.maxAffordable.value)"
            >
              Max
              <span class="num">{{ row.canPurchase(1) ? fmt(row.maxAffordable.value) : '' }}</span>
            </Button>
          </div>
        </div>
      </template>
    </ProducerList>
  </section>
</template>

<style scoped>
.corps :deep(.producer-list__header) {
  justify-content: stretch;
}
.head {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.corps :deep(.producer-list__rows) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rung {
  display: grid;
  grid-template-columns: 44px 1fr 130px 230px;
  align-items: center;
  gap: 14px;
  background: var(--night-raised);
  border: 2px solid var(--gutter-ink);
  border-left: 6px solid var(--signal);
  padding: 10px 12px;
}
.rung.idle {
  border-left-color: var(--newsprint-faint);
}
.rung.silenced {
  border-left-color: var(--cape);
  opacity: 0.55;
}
.rank {
  font-family: var(--face-masthead);
  font-size: 22px;
  text-align: center;
  color: var(--gutter-ink);
  background: var(--newsprint);
  border: 2px solid var(--gutter-ink);
  line-height: 40px;
}
.name {
  font-family: var(--face-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}
.blurb {
  color: var(--newsprint-dim);
  font-size: 13px;
  margin-top: 2px;
}
.stamp {
  margin-top: 4px;
  color: var(--cape);
}
.stats {
  text-align: right;
}
.owned {
  font-size: 16px;
}
.rate {
  color: var(--signal);
  font-size: 11px;
}
.each {
  color: var(--newsprint-dim);
  font-size: 10px;
}
.buys {
  display: grid;
  grid-template-columns: 1fr 70px;
  gap: 8px;
}
.buys .act {
  padding: 8px 6px;
  font-size: 11px;
  white-space: nowrap;
}
</style>
