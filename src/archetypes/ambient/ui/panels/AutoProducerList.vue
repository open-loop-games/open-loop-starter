<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from 'open-loop-engine';
import { useAutoProducers, type AutoProducerRow } from '../../composables/useAutoProducers';
import { getAutoProducers, getPrimaryResource, getUnlocks } from '../../modules';
import { useFormatting } from '@/composables/useFormatting';
import RateBreakdownTooltip from '@/ui/components/RateBreakdownTooltip.vue';
import Button from '@/ui/components/Button.vue';
import PlantingGlyph from '../components/PlantingGlyph.vue';

const rows = useAutoProducers();
const unlocks = getUnlocks();
const buildings = getAutoProducers();
const primary = getPrimaryResource();
const totalRate = computed(() => buildings.getTotalRate(primary));
const { format } = useFormatting();

const producerUnlockId = new Map<string, string>();
for (const entry of unlocks.getAll()) {
  if (entry.def.reveals.kind === 'producer') {
    producerUnlockId.set(entry.def.reveals.producerId, entry.def.id);
  }
}

function isVisible(row: AutoProducerRow): boolean {
  const unlockId = producerUnlockId.get(row.def.id);
  if (!unlockId) return true;
  return unlocks.getPurchasable(unlockId)?.active.value === true;
}

const visibleRows = computed(() => rows.value.filter(isVisible));

function buy(row: AutoProducerRow): void {
  if (Decimal.gt(row.maxAffordable.value, 0)) row.purchase(1);
}

function totalPerSecond(row: AutoProducerRow) {
  return Decimal.mul(row.rate.value, row.count.value);
}

const VERBS: Record<string, string> = {
  planter: 'Plant',
  coop: 'Build',
  pond: 'Dig',
  pasture: 'Open',
  orchard: 'Sow',
};
function verbFor(id: string): string {
  return VERBS[id] ?? 'Add';
}
</script>

<template>
  <section class="plantings">
    <h3 class="plantings__title">
      Plantings
    </h3>
    <ul
      v-if="visibleRows.length"
      class="plantings__rows"
    >
      <RateBreakdownTooltip
        v-for="row in visibleRows"
        :key="row.def.id"
        :row="row"
        :total-rate="totalRate"
        breakdown-title="Rate each"
      >
        <li
          class="planting"
          :data-testid="`producer-${row.def.id}`"
        >
          <span class="planting__glyph">
            <PlantingGlyph :producer-id="row.def.id" />
          </span>
          <div class="planting__head">
            <span class="planting__name">{{ row.def.name }}</span>
            <span
              class="planting__leader"
              aria-hidden="true"
            />
            <span class="planting__count">{{ format(row.count.value, 0) }}</span>
          </div>
          <div class="planting__meta">
            {{ format(row.rate.value, 1) }} /sec each &middot; {{ format(totalPerSecond(row), 1) }}
            total
          </div>
          <Button
            class="planting__buy"
            :disabled="!row.canAfford(1)"
            :data-testid="`buy-${row.def.id}`"
            @click="buy(row)"
          >
            <span class="planting__buy-label">{{ verbFor(row.def.id) }}</span>
            <span class="planting__buy-cost">{{ format(row.getCost(1), 0) }}</span>
          </Button>
        </li>
      </RateBreakdownTooltip>
    </ul>
    <p
      v-else
      class="plantings__empty"
    >
      Tilling the earth&hellip;
    </p>
  </section>
</template>

<style scoped>
.plantings {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.plantings__title {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 0.78em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--almanac-moss, var(--color-text-muted));
  text-align: center;
  margin: 0;
}

.plantings__title::after {
  content: '';
  display: block;
  width: 80px;
  height: 1px;
  background: var(--almanac-rule, var(--color-border));
  margin: 6px auto 12px;
}

.plantings__rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
}

.planting {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: baseline;
  column-gap: 12px;
  row-gap: 2px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
}

.planting:last-child {
  border-bottom: none;
}

.planting__glyph {
  grid-row: 1 / span 2;
  align-self: center;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  color: var(--almanac-moss, var(--color-text-muted));
}

.planting__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.planting__name {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.2em;
  color: var(--almanac-evergreen, var(--color-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planting__leader {
  border-bottom: 1px dotted var(--almanac-rule, var(--color-border));
  transform: translateY(-3px);
  min-width: 12px;
  opacity: 0.55;
}

.planting__count {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 600;
  font-size: 1.05em;
  color: var(--almanac-evergreen, var(--color-text));
  font-variant-numeric: tabular-nums oldstyle-nums;
}

.planting__meta {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.95em;
  color: var(--almanac-moss, var(--color-text-muted));
  font-variant-numeric: tabular-nums oldstyle-nums;
  grid-column: 2;
}

.planting__buy {
  grid-row: 1 / span 2;
  align-self: center;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--almanac-rule, var(--color-border));
  border-radius: 2px;
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1em;
  color: var(--almanac-evergreen, var(--color-text));
  cursor: pointer;
  transition:
    background 140ms ease-out,
    color 140ms ease-out,
    border-color 140ms ease-out;
}

.planting__buy:hover:not(:disabled) {
  background: var(--almanac-evergreen, var(--color-primary));
  color: var(--almanac-paper, var(--color-bg));
  border-color: var(--almanac-evergreen, var(--color-primary));
}

.planting__buy:disabled {
  cursor: default;
  color: var(--almanac-pencil, var(--color-text-muted));
  border-color: var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  opacity: 0.7;
}

.planting__buy-label {
  font-weight: 500;
  letter-spacing: 0.02em;
}

.planting__buy-cost {
  font-style: italic;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--almanac-moss, var(--color-text-muted));
}

.planting__buy:hover:not(:disabled) .planting__buy-cost {
  color: var(--almanac-paper, var(--color-bg));
  opacity: 0.85;
}

.planting__buy:disabled .planting__buy-cost {
  color: var(--almanac-pencil, var(--color-text-muted));
}

.plantings__empty {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-size: 0.95em;
  color: var(--almanac-moss, var(--color-text-muted));
  text-align: center;
  padding: var(--gap);
  margin: 0;
}
</style>
