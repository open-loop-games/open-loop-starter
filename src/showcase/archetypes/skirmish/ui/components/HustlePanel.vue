<!--
  HustlePanel — the left column: the crew's economy, its bunks and its training floors.

  Hustlers, ley taps and the training floors are engine producers, so each list is a
  ProducerList over `createProducerRow`; coffin squats are a scaling purchasable, so their
  row is `createPurchasableRow`. Rows render through the `#row` slot as BuyCards, because
  a card that is the button, a lieutenant's mark and a floor's switch are shapes the flat
  row contract cannot hold. The price lines are the engine's (`readPriceLines`).

  A floor a prerequisite has not opened is listed anyway, locked on what it waits on: the
  row's `prerequisite`.
-->
<script setup lang="ts">
import type { Ref } from 'vue';
import { toNumber, type Purchasable } from '@open-loop/engine';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Switch from '@/ui/components/Switch.vue';
import {
  ProducerList,
  createProducerRow,
  createPurchasableRow,
  readPriceLines,
} from '@/ui/compositions';
import { BARRACKS, ECON, SQUATS, type BarracksDef, type EconDef } from '../../data/buildings';
import { UNITS } from '../../data/units';
import { getMatch } from '../../modules';
import { useHandledBy } from '../handled-by';
import { grouped, rate } from '../format';
import BuyCard from './BuyCard.vue';

const match = getMatch();
const { p, tune } = match;
const fixer = useHandledBy('fixer');
const quartermaster = useHandledBy('quartermaster');

interface HustleExtra {
  item: Purchasable;
  note: () => string;
  count: () => string;
}

const econRows = ECON.filter((d): d is EconDef & Required<Pick<EconDef, 'purchase'>> =>
  Boolean(d.purchase),
).map((def) => {
  const prod = p.econ.getProducer(def.id)!;
  return createProducerRow<HustleExtra>(prod, {
    displayName: def.name,
    extra: {
      item: prod.repeatable!,
      note: () => `${def.blurb} +${rate(toNumber(prod.computedRate.value))} ${def.output}/s each.`,
      count: () => String(toNumber(prod.ownedCount.value)),
    },
  });
});

const squatRow = createPurchasableRow<HustleExtra>(p.squats, {
  displayName: SQUATS.name,
  extra: {
    item: p.squats,
    note: () => `${SQUATS.blurb} +${tune.supplyPer.value} bunks.`,
    count: () => `${Math.floor(p.supplyUsed())}/${p.supplyCap.value}`,
  },
});

const hustleRows = [...econRows, squatRow];

interface FloorExtra {
  def: BarracksDef;
  item: Purchasable;
  training: Ref<boolean>;
  status: () => { text: string; stalled: boolean };
  progress: () => number;
}

const floorRows = BARRACKS.map((def) => {
  const prod = p.barracks.getProducer(def.id)!;
  const kind = def.trains;
  return createProducerRow<FloorExtra>(prod, {
    displayName: def.name,
    prerequisite: `needs ${def.requiresText}`,
    extra: {
      def,
      item: prod.repeatable!,
      training: p.training[kind],
      status: () => {
        const owned = toNumber(prod.ownedCount.value);
        if (owned <= 0) return { text: 'idle', stalled: false };
        if (!p.training[kind].value) return { text: 'switched off', stalled: false };
        const limit = prod.limit?.value ?? 'rate';
        if (limit === 'room') return { text: 'no bunks — buy squats', stalled: true };
        if (limit.startsWith('input:'))
          return { text: `short of ${limit.slice(6)}`, stalled: true };
        return { text: `${rate(toNumber(prod.realizedRate!.value) * 60)} / min`, stalled: false };
      },
      progress: () => {
        const r = toNumber(p.reserve[kind].value);
        return r - Math.floor(r);
      },
    },
  });
});

/** "Trains Razorboys: 94 scrip + 12 aether each." */
function trains(def: BarracksDef): string {
  const cost = tune.unit[def.trains];
  const aether = cost.aether.value ? ` + ${grouped(cost.aether.value)} aether` : '';
  return `Trains ${UNITS[def.trains].name}: ${grouped(cost.scrip.value)} scrip${aether} each.`;
}
</script>

<template>
  <section class="cc-panel hustle" aria-label="Economy">
    <ProducerList :rows="hustleRows" bulk-mode-source="none">
      <template #header>
        <h2 class="cc-title">The Hustle</h2>
      </template>
      <template #row="{ row, purchase }">
        <BuyCard
          :title="row.displayName"
          :note="row.extra!.note()"
          :count="row.extra!.count()"
          :prices="readPriceLines(row.extra!.item)"
          :can="row.canPurchase(1)"
          :maxed="row.extra!.item.maxed.value"
          :automated="fixer"
          @buy="purchase()"
        />
      </template>
    </ProducerList>

    <ProducerList :rows="floorRows" bulk-mode-source="none">
      <template #header>
        <h2 class="cc-title">Training floors</h2>
      </template>
      <template #row="{ row, purchase }">
        <div class="floor" :data-stalled="row.extra!.status().stalled">
          <BuyCard
            :title="row.displayName"
            :note="trains(row.extra!.def)"
            :count="String(row.count.value)"
            :prices="readPriceLines(row.extra!.item)"
            :can="row.canPurchase(1)"
            :locked="row.unmet.value[0]"
            :automated="quartermaster"
            @buy="purchase()"
          />
          <div v-if="Number(row.count.value) > 0" class="floor__run">
            <Switch
              v-model="row.extra!.training.value"
              :aria-label="`Training ${UNITS[row.extra!.def.trains].name}`"
            >
              <template #default="{ on }">{{ on ? 'Training' : 'Off' }}</template>
            </Switch>
            <ProgressBar
              class="cc-gauge floor__bar"
              :value="row.extra!.training.value ? row.extra!.progress() : 0"
            />
            <span class="floor__status">{{ row.extra!.status().text }}</span>
          </div>
        </div>
      </template>
    </ProducerList>
  </section>
</template>

<style scoped>
.hustle :deep(.producer-list__header) {
  display: block;
}
.hustle :deep(.producer-list__rows) {
  gap: var(--gap-sm);
}
.floor {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.floor__run {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 0 2px 2px 6px;
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.floor[data-stalled='true'] .floor__status {
  color: var(--cc-short);
}
.floor__bar.cc-gauge {
  --progress-bar-height: 3px;
  --progress-bar-transition: transform 0.25s linear;
}
</style>
