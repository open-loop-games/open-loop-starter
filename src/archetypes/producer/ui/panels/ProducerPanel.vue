<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { BuildingsKey, PrimaryResourceKey } from '../../modules';
import { useProducers, type ProducerRow } from '../../composables/useProducers';
import { useBulkMode, type BulkMode } from '@/composables/useBulkMode';
import { useFormatting } from '@/composables/useFormatting';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import ProducerTooltip from '../components/ProducerTooltip.vue';

const buildings = useModule(BuildingsKey);
const primary = useModule(PrimaryResourceKey);
const rows = useProducers();
const totalRate = computed(() => buildings.getTotalRate(primary));
const { mode, resolveAmount } = useBulkMode();
const { format, formatWhole } = useFormatting();

const LADDER: BulkMode[] = [1, 10, 100, 'max'];

function pendingAmount(row: ProducerRow): DecimalSource {
  return resolveAmount(row.maxAffordable.value);
}

function pendingCost(row: ProducerRow): DecimalSource {
  const amt = pendingAmount(row);
  return Decimal.gt(amt, 0) ? row.getCost(amt) : row.getCost(1);
}

function buyLabel(row: ProducerRow): string {
  const amt = Decimal.fromValue(pendingAmount(row));
  if (mode.value === 1 || amt.lte(1)) return 'Hire';
  return `Hire ×${formatWhole(amt)}`;
}

function buy(row: ProducerRow): void {
  if (mode.value === 'max') {
    row.purchaseMax();
    return;
  }
  const amt = resolveAmount(row.maxAffordable.value);
  if (Decimal.gt(amt, 0)) row.purchase(amt);
}

function totalPerSecond(row: ProducerRow): DecimalSource {
  return Decimal.mul(row.rate.value, row.count.value);
}
</script>

<template>
  <div class="kitchen-roster">
    <header class="kitchen-roster__header">
      <h3 class="kitchen-roster__title">
        <span class="kitchen-roster__title-mark">&#10086;</span>
        The Roster
      </h3>
      <BulkModeSelector :ladder="LADDER" />
    </header>
    <ul class="kitchen-roster__list">
      <ProducerTooltip
        v-for="row in rows"
        :key="row.def.id"
        :row="row"
        :total-rate="totalRate"
        :pending-amount="pendingAmount(row)"
      >
        <li
          class="roster-card"
          :class="{
            'is-empty': Decimal.eq(row.count.value, 0),
          }"
          :data-testid="`producer-${row.def.id}`"
        >
          <div class="roster-card__name-row">
            <span class="roster-card__name">{{ row.def.name }}</span>
            <span class="roster-card__count">
              <span class="roster-card__count-number">{{ format(row.count.value, 0) }}</span>
              <span class="roster-card__count-unit">on staff</span>
            </span>
          </div>

          <div class="roster-card__meta">
            <span class="roster-card__meta-cell">
              <span class="roster-card__meta-value">{{ format(row.rate.value, 1) }}</span>
              <span class="roster-card__meta-label">/sec ea</span>
            </span>
            <span class="roster-card__meta-divider" />
            <span class="roster-card__meta-cell">
              <span class="roster-card__meta-value">{{ format(totalPerSecond(row), 1) }}</span>
              <span class="roster-card__meta-label">/sec total</span>
            </span>
          </div>

          <button
            type="button"
            class="ticket"
            :class="{ 'is-affordable': row.canAfford(1) }"
            :disabled="!row.canAfford(1)"
            :data-testid="`buy-${row.def.id}`"
            @click="buy(row)"
          >
            <span class="ticket__notch ticket__notch--left" />
            <span class="ticket__label">{{ buyLabel(row) }}</span>
            <span class="ticket__cost">{{ format(pendingCost(row), 0) }}</span>
            <span class="ticket__notch ticket__notch--right" />
          </button>
        </li>
      </ProducerTooltip>
    </ul>
  </div>
</template>

<style scoped>
.kitchen-roster {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
}

.kitchen-roster__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
}

.kitchen-roster__title {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 700;
  font-size: 0.92em;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bakery-mahogany, #5a2f10);
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.kitchen-roster__title-mark {
  color: var(--bakery-brass, #b1782a);
  font-size: 1em;
  transform: translateY(2px);
}

.kitchen-roster__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ─── Roster card ────────────────────────────────────────────────────── */
.roster-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, rgba(255, 245, 215, 0.55) 0%, rgba(241, 226, 188, 0.35) 100%);
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  border-radius: 4px;
  position: relative;
  transition:
    transform 140ms ease-out,
    box-shadow 140ms ease-out,
    border-color 140ms ease-out;
}

.roster-card::before {
  /* Hairline ledger-rule across the top */
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--bakery-brass, #b1782a) 30%,
    var(--bakery-brass, #b1782a) 70%,
    transparent 100%
  );
  opacity: 0.35;
}

.roster-card:hover {
  border-color: var(--bakery-rye-line, #b89a6a);
  box-shadow:
    0 1px 0 rgba(255, 240, 200, 0.5) inset,
    0 6px 16px -8px rgba(80, 40, 10, 0.3);
  transform: translateY(-1px);
}

.roster-card.is-empty {
  background:
    repeating-linear-gradient(
      178deg,
      transparent 0,
      transparent 5px,
      rgba(122, 84, 38, 0.04) 5px,
      rgba(122, 84, 38, 0.04) 6px
    ),
    rgba(248, 239, 214, 0.4);
}

.roster-card.is-empty .roster-card__name {
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

/* ─── Name row ───────────────────────────────────────────────────────── */
.roster-card__name-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.roster-card__name {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 600;
  font-style: italic;
  font-size: 1.05em;
  color: var(--bakery-mahogany, #5a2f10);
  letter-spacing: 0.01em;
}

.roster-card__count {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}

.roster-card__count-number {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 36,
    'SOFT' 100,
    'wght' 700;
  font-weight: 700;
  font-size: 1.3em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--bakery-cocoa, #2d1d10);
  line-height: 1;
}

.roster-card__count-unit {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.7em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

/* ─── Meta row (rate per producer + total) ───────────────────────────── */
.roster-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 0.78em;
}

.roster-card__meta-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
}

.roster-card__meta-cell:last-of-type {
  justify-content: flex-end;
  text-align: right;
}

.roster-card__meta-value {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-variant-numeric: tabular-nums;
  color: var(--bakery-cocoa, #2d1d10);
}

.roster-card__meta-label {
  font-style: italic;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

.roster-card__meta-divider {
  width: 1px;
  height: 12px;
  background: var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
}

/* ─── Hire ticket — brass-edged "bakery box claim ticket" ────────────── */
.ticket {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
  padding: 8px 18px;
  background: linear-gradient(180deg, var(--bakery-brass, #b1782a) 0%, #9a6722 100%);
  color: var(--bakery-parchment, #f8efd6);
  border: 1px solid #6b431a;
  border-radius: 2px;
  font-family: var(--font-display, Georgia, serif);
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 220, 160, 0.45),
    inset 0 -1px 0 rgba(40, 20, 5, 0.25),
    0 2px 0 rgba(60, 30, 10, 0.18);
  transition:
    transform 100ms ease-out,
    box-shadow 100ms ease-out,
    background 140ms ease-out;
}

.ticket:hover:not(:disabled) {
  background: linear-gradient(
    180deg,
    var(--bakery-brass-bright, #d99846) 0%,
    var(--bakery-brass, #b1782a) 100%
  );
  color: var(--bakery-cream, #f3e7cc);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 180, 0.55),
    inset 0 -1px 0 rgba(40, 20, 5, 0.2),
    0 4px 8px -2px rgba(60, 30, 10, 0.35);
}

.ticket:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    inset 0 1px 2px rgba(40, 20, 5, 0.25),
    0 1px 0 rgba(60, 30, 10, 0.1);
}

.ticket:disabled {
  cursor: default;
  background: repeating-linear-gradient(
    120deg,
    rgba(122, 84, 38, 0.18) 0,
    rgba(122, 84, 38, 0.18) 4px,
    rgba(122, 84, 38, 0.08) 4px,
    rgba(122, 84, 38, 0.08) 8px
  );
  color: var(--bakery-cocoa-mute, #7a5d3d);
  border-color: var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  box-shadow: none;
}

/* Punched-ticket notches on either side */
.ticket__notch {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  background: var(--bakery-parchment, #f8efd6);
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow: inset 0 1px 1px rgba(40, 20, 5, 0.25);
}
.ticket__notch--left {
  left: -5px;
}
.ticket__notch--right {
  right: -5px;
}

.ticket:disabled .ticket__notch {
  background: var(--bakery-wheat, #ead7ad);
}

.ticket__label {
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.78em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: left;
}

.ticket__cost {
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-size: 0.92em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  text-align: right;
}

.ticket:disabled .ticket__label,
.ticket:disabled .ticket__cost {
  text-shadow: none;
}
</style>
