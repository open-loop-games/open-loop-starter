<!--
  HustlePanel — the left column: the crew's economy, its bunks and its training floors.

  Hustlers, ley taps and the tech floors are engine producers, so their rows are
  `createProducerRow`; coffin squats and plain floors are scaling purchasables, so theirs
  are `createPurchasableRow`. Rows render through ProducerList's `#row` slot as BuyCards,
  because a card that is the button and a lieutenant's mark are shapes the flat row
  contract cannot hold. The price lines are the engine's (`readPriceLines`).

  Hustlers work at nodes: the safehouse, and each district the crew owns. Every node climbs
  its own ladder to its own limit, so a card reads its count against that limit and its
  next price. A district's rackets hang under the safehouse's card, the same hustlers on
  turf the map can take away; they stay listed while the district is not yours, locked on
  taking it, so the map's prize is in view before it is won.

  A tech floor is bought once and opens its kind to every floor; a plain floor is one more
  floor. Both climb one price ladder. An opened tech floor folds to one line naming the kind
  it opened, so a long match does not stack up cards that no longer ask anything. A floor a
  prerequisite has not opened is listed anyway, locked on what it waits on: the row's
  `prerequisite`. How the floors split their time is the FloorQueue under them.

  The Syndicate charter is the rung between the tiers, so it is listed after the tier-one
  tech floors and directly above the first floor it opens. Its locked line reads the
  charter's own unmet requirement.
-->
<script setup lang="ts">
import { unref } from 'vue';
import { toNumber, type Purchasable } from '@open-loop/engine';
import {
  ProducerList,
  createProducerRow,
  createPurchasableRow,
  readPriceLines,
  readUnmet,
} from '@/ui/compositions';
import {
  BARRACKS,
  CHARTER,
  ECON,
  FLOORS,
  RESEARCH,
  SQUATS,
  prerequisiteText,
  type BarracksDef,
} from '../../data/buildings';
import { DISTRICTS } from '../../data/contracts';
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
  limit: () => string;
  /** A district's rackets: listed under the safehouse, come and go with the district. */
  district?: true;
}

/** What a district's rackets wait on: the district, said to be the rival's while it is. */
function waitsOn(i: number): string {
  const name = DISTRICTS[i]!.name;
  return match.owner[i]!.value === 'e' ? `${name}, theirs now` : name;
}

const econRows = ECON.map((def) => {
  const prod = p.econ.getProducer(def.id)!;
  const item = prod.purchasable!;
  const each = () => `+${rate(toNumber(prod.computedRate.value))} ${def.output}/s each.`;
  const i = def.district;
  return createProducerRow<HustleExtra>(prod, {
    displayName: def.name,
    // A district's rackets stay listed while the seat does not own it, locked on taking it.
    ...(i === undefined ? {} : { prerequisite: () => `needs ${waitsOn(i)}` }),
    extra: {
      item,
      note: () =>
        i === undefined
          ? `${def.blurb} ${each()}`
          : `${each()} They scatter if ${DISTRICTS[i]!.name} falls.`,
      count: () => String(toNumber(prod.ownedCount.value)),
      limit: () => String(toNumber(unref(item.limit))),
      ...(i === undefined ? {} : { district: true as const }),
    },
  });
});

const squatRow = createPurchasableRow<HustleExtra>(p.squats, {
  displayName: SQUATS.name,
  extra: {
    item: p.squats,
    note: () => `${SQUATS.blurb} +${tune.supplyPer.value} bunks.`,
    count: () => String(Math.floor(p.supplyUsed())),
    limit: () => String(p.supplyCap.value),
  },
});

const hustleRows = [...econRows, squatRow];

// ─── Training floors: a tech floor per kind, then plain floors, on one price ladder ───

interface FloorExtra {
  item: Purchasable;
  note: () => string;
  count?: () => string;
  /** What the card says once bought. Default: open. */
  doneLabel?: string;
  /** Replaces the row's first unmet prerequisite as the locked line. */
  locked?: () => string | undefined;
  /** The charter's card: the rung between the tiers. */
  rung?: true;
}

/** "Opens Razorboys (94 scrip each) to every floor. Counts as one floor." */
function opens(def: BarracksDef): string {
  const cost = tune.unit[def.trains];
  const aether = cost.aether.value ? ` + ${grouped(cost.aether.value)} aether` : '';
  return `Opens ${UNITS[def.trains].name} (${grouped(cost.scrip.value)} scrip${aether} each) to every floor. Counts as one floor.`;
}

const techRows = BARRACKS.map((def) => {
  const prod = p.barracks.getProducer(def.id)!;
  const item = prod.purchasable!;
  return createProducerRow<FloorExtra>(prod, {
    displayName: def.name,
    prerequisite: () => `needs ${prerequisiteText(def, p.chartered())}`,
    extra: {
      item,
      note: () => (item.maxed.value ? '' : opens(def)),
      doneLabel: `${UNITS[def.trains].name} open`,
    },
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

/** "a, b and c" */
function andList(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const charter = p.tier.getPurchasable(CHARTER.id)!;
const tierTwo = {
  floors: BARRACKS.filter((d) => d.tier === 2),
  research: RESEARCH.filter((d) => d.tier === 2),
};
/** "Opens Black clinic here, and Dermal weave, … in research." */
const charterOpens = [
  tierTwo.floors.length && `${andList(tierTwo.floors.map((d) => d.name))} here`,
  tierTwo.research.length && `${andList(tierTwo.research.map((d) => d.name))} in research`,
].filter(Boolean);
const charterRow = createPurchasableRow<FloorExtra>(charter, {
  displayName: CHARTER.name,
  extra: {
    item: charter,
    // Once held, the card shrinks to its name and mark: the rows it opened say the rest.
    note: () =>
      charter.maxed.value ? '' : `${CHARTER.blurb} Opens ${charterOpens.join(', and ')}.`,
    doneLabel: 'chartered',
    locked: () => {
      const why = readUnmet(charter)[0];
      return why && `needs ${why}`;
    },
    rung: true,
  },
});

const floorRows = [
  ...techRows.filter((_, i) => BARRACKS[i]!.tier !== 2),
  charterRow,
  ...techRows.filter((_, i) => BARRACKS[i]!.tier === 2),
  plainRow,
];
</script>

<template>
  <section class="cc-panel hustle" aria-label="Economy">
    <ProducerList class="hustle__econ" :rows="hustleRows" bulk-mode-source="none">
      <template #header>
        <h2 class="cc-title hustle__head">
          The Hustle<span class="hustle__working"
            ><span class="num">{{ p.hustlers() }}</span> hustlers working</span
          >
        </h2>
      </template>
      <template #row="{ row, purchase }">
        <BuyCard
          :title="row.displayName"
          :note="row.unmet.value.length ? undefined : row.extra!.note()"
          :count="row.extra!.count()"
          :limit="row.extra!.limit()"
          :prices="readPriceLines(row.extra!.item)"
          :can="row.canPurchase(1)"
          :maxed="row.extra!.item.maxed.value"
          done-label="full"
          :locked="row.unmet.value[0]"
          :data-node="row.extra!.district ? 'district' : undefined"
          :automated="row.extra!.item.maxed.value || row.unmet.value.length ? undefined : fixer"
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
          :done-label="row.extra!.doneLabel ?? 'open'"
          :locked="row.extra!.locked ? row.extra!.locked() : row.unmet.value[0]"
          :data-rung="row.extra!.rung"
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
.hustle__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.hustle__working {
  font-family: var(--cc-face-tag);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: none;
  color: var(--cc-chalk-dim);
}
.hustle__working .num {
  color: var(--cc-chalk);
}
/* A district's rackets hang off the safehouse's card on a wire: the same hustlers, worked
   from turf the map can take away. The indent is the group; the left edge stays the
   affordance grammar. */
.hustle :deep(.producer-list__row:has(> .buy[data-node='district'])) {
  position: relative;
  margin-top: -3px;
  padding-left: 14px;
}
.hustle :deep(.producer-list__row:has(> .buy[data-node='district']))::before {
  content: '';
  position: absolute;
  left: 5px;
  top: -6px;
  bottom: 50%;
  width: 7px;
  border-left: 1px solid var(--cc-rain);
  border-bottom: 1px solid var(--cc-rain);
}
/* The wire runs on past a card that has another district under it. */
.hustle
  :deep(
    .producer-list__row:has(> .buy[data-node='district']):has(
        + .producer-list__row > .buy[data-node='district']
      )
  )::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 50%;
  bottom: calc(-1 * var(--gap-sm));
  border-left: 1px solid var(--cc-rain);
}
/* The price is the decision: a node's fifth hire costs four times its first. */
.hustle__econ :deep(.buy__cost:not(.buy__cost--locked, .buy__cost--done)) {
  font-size: 13px;
  font-weight: 600;
}
/* The charter is the rung between the tiers: set off from the floors by the Syndicate's
   brass, while its left edge keeps the shared affordance grammar. */
.hustle :deep(.buy[data-rung='true']) {
  margin-block: 4px;
  border-top: 1px solid color-mix(in srgb, var(--cc-brass) 55%, transparent);
}
.hustle :deep(.buy[data-rung='true'] .buy__title) {
  color: var(--cc-brass);
}
</style>
