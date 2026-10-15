<!--
  HullRefits — what salvage buys besides modules: the ship in service's next hull section,
  the refits once cleared, and calibration once the breach line is open. Hovering the
  section's card outlines the sealed cells it would open on the board; a section the
  schedule puts behind a carrier names that carrier until it falls. Both lists adopt
  UpgradeGrid through its `#card` slot; the section card carries the hover the board reads.
-->
<script setup lang="ts">
import { computed, unref } from 'vue';
import {
  isCostRequirement,
  requirementsMet,
  toNumber,
  type Purchasable,
  type PurchasableCategory,
} from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import type { UpgradeCardData } from '@/ui/compositions';
import { CALIBRATION_STEP, REFIT_MULT } from '../../data';
import { getBoard, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt, times } from '../format';

const yard = getYard();
const board = getBoard();
const fitting = useFitting();

interface Extra {
  /** hull section index, for the board's plating outline; absent on a refit */
  section?: number;
  /** what still bars it besides salvage: a carrier to destroy */
  bars?: () => string[];
}

/** A purchasable's unmet requirements other than its price, by their descriptions. */
const barsOf = (p: Purchasable) => () => {
  const reqs = [p.requirements].flat();
  return reqs
    .filter((r) => !isCostRequirement(r) && !requirementsMet(r))
    .map((r) => unref(r.description) ?? '')
    .filter((d) => d && !d.endsWith('plated'));
};

function cardsOf<D extends { id: string; name: string }>(
  category: PurchasableCategory<D>,
  extra: (def: D, p: Purchasable) => Extra,
): UpgradeCardData<Extra>[] {
  return category.getAll().map(({ def, purchasable: p }) => ({
    id: def.id,
    displayName: def.name,
    description: unref(p.display.description),
    cost: computed(() => toNumber(p.getCost(1))),
    costLabel: 'salvage',
    canPurchase: p.canPurchase,
    owned: p.active,
    purchase: () => p.purchase(1),
    extra: extra(def, p),
  }));
}

const sectionCards = cardsOf(yard.hull, (def, p) => ({ section: def.index, bars: barsOf(p) }));
const refitCards = cardsOf(yard.refits, () => ({}));

/** Sections plate in order, so only the ship's next one is offered. */
const nextSection = computed(() =>
  sectionCards
    .filter((c) => !c.owned.value && yard.hull.getPurchasable(c.id)!.visible.value)
    .slice(0, 1),
);
const shownRefits = computed(() =>
  refitCards.filter((c) => yard.refits.getPurchasable(c.id)!.visible.value),
);
const openRefits = computed(() => shownRefits.value.filter((c) => !c.owned.value));
const installed = computed(() => shownRefits.value.filter((c) => c.owned.value));
const hullArmed = computed(
  () => !nextSection.value.length && board.placed.value.length === board.openCells.value,
);

const calibration = yard.calibration.getPurchasable('calibration')!;
const level = computed(() => toNumber(calibration.count.value));
const calPrice = computed(() => toNumber(calibration.getCost(1)));
</script>

<template>
  <section class="hull-refits">
    <h2 class="hp-head">Hull</h2>
    <UpgradeGrid v-if="nextSection.length" :cards="nextSection" :columns="1" reveal="inline">
      <template #card="{ card: c }">
        <div
          class="hp-card"
          @mouseenter="fitting.sectionHover = c.extra!.section!"
          @mouseleave="fitting.sectionHover = null"
        >
          <div>
            <div class="name">{{ c.displayName }}</div>
            <div class="sub">{{ c.description }}</div>
            <div v-for="b in c.extra!.bars!()" :key="b" class="bar-req">needs {{ b }}</div>
          </div>
          <Button
            class="hp-act"
            :class="{ can: c.canPurchase.value }"
            :disabled="!c.canPurchase.value"
            :repeat="false"
            @click="c.purchase()"
          >
            plate · {{ fmt(c.cost.value) }}
          </Button>
        </div>
      </template>
    </UpgradeGrid>
    <p v-else class="done">Hull fully plated.</p>
    <p v-if="hullArmed" class="done">Every socket armed. The line holds.</p>

    <template v-if="shownRefits.length">
      <h2 class="hp-head">Refits</h2>
      <UpgradeGrid v-if="openRefits.length" :cards="openRefits" :columns="1" reveal="inline">
        <template #card="{ card: c }">
          <div class="hp-card refit">
            <div>
              <div class="name">{{ c.displayName }}</div>
              <div class="sub">
                {{ c.description }}
                <span class="hp-num">{{ times(REFIT_MULT) }}</span>
              </div>
            </div>
            <Button
              class="hp-act"
              :class="{ can: c.canPurchase.value }"
              :disabled="!c.canPurchase.value"
              :repeat="false"
              @click="c.purchase()"
            >
              {{ fmt(c.cost.value) }}
            </Button>
          </div>
        </template>
      </UpgradeGrid>
      <ul v-if="installed.length" class="installed">
        <li v-for="c in installed" :key="c.id">
          {{ c.displayName }} <span class="hp-num">{{ times(REFIT_MULT) }}</span>
        </li>
      </ul>
    </template>

    <template v-if="calibration.visible.value">
      <h2 class="hp-head">Calibration</h2>
      <div class="hp-card calibration">
        <div>
          <div class="name">
            Level <span class="hp-num">{{ level }}</span>
            <span class="now hp-num">{{ times(Math.pow(CALIBRATION_STEP, level)) }}</span>
          </div>
          <div class="sub">
            Every weapon hits harder: <span class="hp-num">{{ times(CALIBRATION_STEP) }}</span> a
            level, no ceiling.
          </div>
        </div>
        <Button
          class="hp-act"
          :class="{ can: calibration.canPurchase.value }"
          :disabled="!calibration.canPurchase.value"
          :aria-label="`Calibrate for ${fmt(calPrice)} salvage`"
          @click="calibration.purchase(1)"
        >
          {{ fmt(calPrice) }}
        </Button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.hp-card {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--hull);
  border: 1px solid var(--hull-seam);
  border-radius: var(--radius-plate);
  animation: hp-decrypt 600ms ease-out both;
}
.name {
  font-family: var(--face-stencil);
  font-weight: 600;
  color: var(--readout);
}
.sub {
  font-size: 12px;
  color: var(--readout-dim);
}
.bar-req {
  margin-top: 3px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--breach);
}
.bar-req::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 5px;
  background: var(--breach);
  clip-path: polygon(50% 0, 100% 35%, 80% 100%, 20% 100%, 0 35%);
}
.installed {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blueprint-dim);
}
.installed li::before {
  content: '✓ ';
  color: var(--blueprint);
}
.calibration .now {
  margin-left: 6px;
  color: var(--blueprint);
}
.done {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--blueprint);
}
</style>
