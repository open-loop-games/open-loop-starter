<!--
  HustlePanel — the left column: the crew's economy, its bunks and its training floors.

  Hustlers, ley taps and the tech floors are engine producers, so their rows are
  `createProducerRow`; coffin squats and plain floors are scaling purchasables, so theirs
  are `createPurchasableRow`. Rows render through ProducerList's `#row` slot as BuyCards,
  because a card that is the button and a lieutenant's mark are shapes the flat row
  contract cannot hold. The price lines are the engine's (`readPriceLines`).

  A tech floor is bought once and opens its kind to every floor; a plain floor is one more
  floor. Both climb one price ladder. A floor a prerequisite has not opened is listed
  anyway, locked on what it waits on: the row's `prerequisite`. How the floors split their
  time is the FloorQueue under them.
-->
<script setup lang="ts">
import { toNumber, type Purchasable } from '@open-loop/engine';
import {
  ProducerList,
  createProducerRow,
  createPurchasableRow,
  readPriceLines,
} from '@/ui/compositions';
import {
  BARRACKS,
  ECON,
  FLOORS,
  SQUATS,
  type BarracksDef,
  type EconDef,
} from '../../data/buildings';
import { UNITS } from '../../data/units';
import { getMatch } from '../../modules';
import { useHandledBy } from '../handled-by';
import { grouped, rate } from '../format';
import BuyCard from './BuyCard.vue';
import FloorQueue from './FloorQueue.vue';

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

// ─── Training floors: a tech floor per kind, then plain floors, on one price ladder ───

interface FloorExtra {
  item: Purchasable;
  note: () => string;
  count?: () => string;
}

/** "Opens Razorboys (94 scrip each) to every floor. Counts as one floor." */
function opens(def: BarracksDef): string {
  const cost = tune.unit[def.trains];
  const aether = cost.aether.value ? ` + ${grouped(cost.aether.value)} aether` : '';
  const price =
    def.floors > 1 ? `One floor, at ${def.floors}× a floor's price.` : 'Counts as one floor.';
  return `Opens ${UNITS[def.trains].name} (${grouped(cost.scrip.value)} scrip${aether} each) to every floor. ${price}`;
}

const techRows = BARRACKS.map((def) => {
  const prod = p.barracks.getProducer(def.id)!;
  return createProducerRow<FloorExtra>(prod, {
    displayName: def.name,
    prerequisite: `needs ${def.requiresText}`,
    extra: { item: prod.repeatable!, note: () => opens(def) },
  });
});

const plainRow = createPurchasableRow<FloorExtra>(p.floors, {
  displayName: FLOORS.name,
  prerequisite: 'needs a tech floor',
  extra: {
    item: p.floors,
    note: () => `${FLOORS.blurb} The queue below splits them.`,
    count: () => String(p.floorCount()),
  },
});

const floorRows = [...techRows, plainRow];
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
        <BuyCard
          :title="row.displayName"
          :note="row.extra!.note()"
          :count="row.extra!.count?.()"
          :prices="readPriceLines(row.extra!.item)"
          :can="row.canPurchase(1)"
          :maxed="row.extra!.item.maxed.value"
          done-label="open"
          :locked="row.unmet.value[0]"
          :automated="row.extra!.item.maxed.value ? undefined : quartermaster"
          @buy="purchase()"
        />
      </template>
    </ProducerList>
    <FloorQueue />
  </section>
</template>

<style scoped>
.hustle :deep(.producer-list__header) {
  display: block;
}
.hustle :deep(.producer-list__rows) {
  gap: var(--gap-sm);
}
</style>
