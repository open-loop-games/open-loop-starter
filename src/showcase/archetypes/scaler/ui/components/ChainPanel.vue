<!--
  ChainPanel — a prestige layer's cascading chain on starter's `ProducerList`:
  the Network (Legacy, makes Hope), the Parallel Earths (Continuity, makes
  Echoes) or the Imprints (Canon, makes Myth). Each rung shows what was bought
  and, apart, what the rung above has made; a rung shows once the one below it
  is staffed. The ink is the layer's: signal, orbit or foil.
-->
<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type ProducerCategory,
  type Resource,
} from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { ProducerList, createProducerRow } from '@/ui/compositions';
import { EARTHS, IMPRINTS, NETWORK, type ChainSpec, type ChainTierDef } from '../../data';
import { getCanon, getContinuity, getLegacy, getRun } from '../../modules';
import { fmt, fmtMult, fmtRate } from '../format';

const props = defineProps<{ kind: 'network' | 'earths' | 'imprints' }>();

interface Chain {
  title: string;
  ink: '' | 'orbit' | 'foil';
  lede: string;
  effect: string;
  costLabel: string;
  spec: ChainSpec;
  chain: ProducerCategory<ChainTierDef>;
  currency: Resource;
  cost: Resource;
}

const legacy = getLegacy();
const continuity = getContinuity();
const chains: Record<typeof props.kind, () => Chain> = {
  network: () => ({
    title: 'The Network',
    ink: '',
    lede: 'Bought with Legacy; a Rewrite takes it. Hope starts over every timeline.',
    effect: 'every hero',
    costLabel: 'Legacy',
    spec: NETWORK,
    chain: legacy.network,
    currency: getRun().hope,
    cost: legacy.legacy,
  }),
  earths: () => ({
    title: 'Parallel Earths',
    ink: 'orbit',
    lede: 'Bought with Continuity; an Age takes them. Echoes start over every Rewrite.',
    effect: 'Legacy gain and Hope',
    costLabel: 'Continuity',
    spec: EARTHS,
    chain: continuity.earths,
    currency: legacy.echo,
    cost: continuity.continuity,
  }),
  imprints: () => ({
    title: 'Imprints',
    ink: 'foil',
    lede: 'Bought with Canon; nothing takes them. Myth starts over every Age.',
    effect: 'Continuity gain and Echoes',
    costLabel: 'Canon',
    spec: IMPRINTS,
    chain: getCanon().imprints,
    currency: continuity.myth,
    cost: getCanon().canon,
  }),
};
const c = chains[props.kind]();
const multiplier = computed(() => Decimal.add(1, c.currency.value).pow(c.spec.power));

interface Rung {
  def: ChainTierDef;
  /** Units the rung above has made. */
  made: ComputedRef<DecimalSource>;
  /** What this rung makes: the currency for rung 1, the rung below otherwise. */
  makes: string;
}

const all = c.chain.getAll();
const rows = all.map(({ def, producer }, i) => {
  const below = i === 0 ? null : all[i - 1].producer;
  return createProducerRow<Rung>(producer, {
    displayName: def.displayName,
    unlocked: computed(
      () =>
        below === null ||
        Decimal.gt(producer.count.value, 0) ||
        Decimal.gt(below.ownedCount.value, 0),
    ),
    extra: {
      def,
      made: producer.extraCount,
      makes: i === 0 ? c.currency.displayName : all[i - 1].def.displayName,
    },
  });
});
</script>

<template>
  <section class="panel chain" :class="c.ink">
    <ProducerList :rows="rows" :cost-label="c.costLabel" bulk-mode-source="none">
      <template #header>
        <div class="head">
          <div>
            <span class="caption" :class="c.ink">{{ c.title }}</span>
            <p class="lede">{{ c.lede }}</p>
          </div>
          <div class="yield num">
            <div class="amount">{{ fmt(c.currency.value) }} {{ c.currency.displayName }}</div>
            <div class="effect">{{ c.effect }} {{ fmtMult(multiplier) }}</div>
          </div>
        </div>
      </template>
      <template #row="{ row, purchase }">
        <div class="rung reveal" :class="{ idle: !row.canPurchase(1) }">
          <div class="rank num">{{ row.extra!.def.tier }}</div>
          <div class="who">
            <div class="name">{{ row.displayName }}</div>
            <div class="blurb">{{ row.extra!.def.blurb }}</div>
          </div>
          <div class="stats num">
            <div class="owned">
              ×{{ fmt(row.count.value) }}
              <span v-if="Decimal.gt(row.extra!.made.value, 0)" class="made">
                +{{ fmt(row.extra!.made.value) }}
              </span>
            </div>
            <div class="rate">+{{ fmtRate(row.displayRate.value) }} {{ row.extra!.makes }}/s</div>
          </div>
          <div class="buys">
            <Button
              repeat
              class="act"
              :class="c.ink"
              :disabled="!row.canPurchase(1)"
              :data-testid="`buy-${row.id}`"
              @click="purchase"
            >
              Buy <span class="num">{{ fmt(row.cost(1)) }}</span>
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
.chain :deep(.producer-list__header) {
  justify-content: stretch;
}
.head {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.yield {
  text-align: right;
}
.amount {
  font-size: 18px;
  color: var(--signal);
}
.orbit .amount {
  color: var(--orbit);
}
.foil .amount {
  color: var(--foil);
}
.effect {
  font-size: 11px;
  color: var(--newsprint-dim);
}
.chain :deep(.producer-list__rows) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rung {
  display: grid;
  grid-template-columns: 44px 1fr 170px 230px;
  align-items: center;
  gap: 14px;
  background: var(--night-raised);
  border: 2px solid var(--gutter-ink);
  border-left: 6px solid var(--signal);
  padding: 10px 12px;
}
.orbit .rung {
  border-left-color: var(--orbit);
}
.foil .rung {
  border-left-color: var(--foil);
}
.rung.idle {
  border-left-color: var(--newsprint-faint);
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
.stats {
  text-align: right;
}
.owned {
  font-size: 16px;
}
.made {
  font-size: 11px;
  color: var(--steel);
}
.rate {
  color: var(--newsprint-dim);
  font-size: 11px;
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
