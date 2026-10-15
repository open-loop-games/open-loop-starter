<!--
  HullRefits — what salvage buys besides modules: the next hull section to plate, and the
  refits once cleared. Hovering the section's card outlines the sealed cells it would
  open on the board. Both lists adopt UpgradeGrid through its `#card` slot; the section
  card carries the hover the board reads.
-->
<script setup lang="ts">
import { computed, unref } from 'vue';
import { toNumber, type PurchasableCategory } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import type { UpgradeCardData } from '@/ui/compositions';
import { REFIT_MULT } from '../../data';
import { getBoard, getYard } from '../../modules';
import { useFitting } from '../fitting';
import { fmt, times } from '../format';

const yard = getYard();
const board = getBoard();
const fitting = useFitting();

interface Extra {
  /** hull section index, for the board's plating outline; absent on a refit */
  section?: number;
}

function cardsOf<D extends { id: string; name: string }>(
  category: PurchasableCategory<D>,
  extra: (def: D) => Extra,
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
    extra: extra(def),
  }));
}

const sectionCards = cardsOf(yard.hull, (def) => ({ section: def.index }));
const refitCards = cardsOf(yard.refits, () => ({}));

/** Sections plate in order, so only the next one is offered. */
const nextSection = computed(() => sectionCards.filter((c) => !c.owned.value).slice(0, 1));
const shownRefits = computed(() =>
  refitCards.filter((c) => yard.refits.getPurchasable(c.id)!.visible.value),
);
const hullArmed = computed(
  () => !nextSection.value.length && board.placed.value.length === board.openCells.value,
);
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
      <UpgradeGrid :cards="shownRefits" :columns="1" reveal="inline">
        <template #card="{ card: c }">
          <div class="hp-card refit" :class="{ owned: c.owned.value }">
            <div>
              <div class="name">{{ c.displayName }}</div>
              <div class="sub">
                {{ c.description }}
                <span class="hp-num">{{ times(REFIT_MULT) }}</span>
              </div>
            </div>
            <span v-if="c.owned.value" class="installed">installed</span>
            <Button
              v-else
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
.refit.owned {
  opacity: 0.6;
}
.installed {
  font-family: var(--face-stencil);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--blueprint);
}
.done {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--blueprint);
}
</style>
