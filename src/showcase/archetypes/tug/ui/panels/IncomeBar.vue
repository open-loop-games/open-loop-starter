<script setup lang="ts">
import { useIncomeUpgrades } from '../../composables';
import { useFormatting } from '@/composables/useFormatting';
import { getIncome } from '../../modules';
import Button from '@/ui/components/Button.vue';
import type { IncomeUpgradeRow } from '../../composables/useIncomeUpgrades';

/**
 * Income display + player income-upgrade shop.
 *
 * Top row: per-side accrual rates and current balances. Displayed rate is
 * the static baseline preview (8/s, symmetric); the runtime rate flows
 * through `incomeRateChain` and includes any upgrade multipliers each side
 * has bought, but rendering the chain'd rate per side requires injecting
 * the chain here. Live balances reflect actual accrual.
 *
 * Tile row: player income-upgrade tiers — sequential, tier N requires
 * tier N-1 bought. Disabled state covers both unaffordable AND
 * sequentially-gated cases; engine's `canPurchase` is the unified flag.
 */
const player = getIncome('player');
const ai = getIncome('ai');
const playerUpgrades = useIncomeUpgrades('player');
const { format, formatTime } = useFormatting();

const baseRate = 8;

const resourceLabel = 'minerals';

function fmtSec(s: number): string {
  if (!Number.isFinite(s)) return '∞';
  return formatTime(s);
}

// Two-line ROI tooltip: "Pays off in X" mirrors producer vocabulary;
// "Catches rush at Y" answers the macro-vs-rush question directly.
// Native `:title` attribute renders `\n` as a line break — cheapest
// landing without pulling in a tooltip component.
function rowTooltip(row: IncomeUpgradeRow): string {
  if (row.bought.value) return `×${row.def.multiplier} income (active)`;
  return [
    `×${row.def.multiplier} income`,
    `Pays off in ${fmtSec(row.paybackSeconds.value)}`,
    `Catches rush at ${fmtSec(row.crossoverSeconds.value)}`,
  ].join('\n');
}
</script>

<template>
  <div class="olui-surface income-bar">
    <div class="income-bar__rows">
      <div class="income-bar__row income-bar__row--player">
        <span class="income-bar__label">Terran</span>
        <span class="income-bar__rate">+{{ format(baseRate, 1) }} {{ resourceLabel }}/s</span>
        <span class="income-bar__balance">
          {{ format(player, 0) }}
        </span>
      </div>
      <div class="income-bar__row income-bar__row--ai">
        <span class="income-bar__label">Protoss</span>
        <span class="income-bar__rate">+{{ format(baseRate, 1) }} {{ resourceLabel }}/s</span>
        <span class="income-bar__balance">
          {{ format(ai, 0) }}
        </span>
      </div>
    </div>
    <div class="income-bar__upgrades">
      <Button
        v-for="row in playerUpgrades.rows.value"
        :key="row.def.id"
        class="olui-purchase-card upgrade-tile"
        :class="{
          'upgrade-tile--bought': row.bought.value,
          'upgrade-tile--ready': row.canPurchase.value && !row.bought.value,
        }"
        :disabled="!row.canPurchase.value || row.bought.value"
        :title="rowTooltip(row)"
        @click="row.buy()"
      >
        <div class="upgrade-tile__title">
          {{ row.def.name }}
        </div>
        <div class="upgrade-tile__effect">×{{ row.def.multiplier }}</div>
        <div class="upgrade-tile__cost">
          <template v-if="row.bought.value"> bought </template>
          <template v-else> {{ format(row.cost.value, 0) }} {{ resourceLabel }} </template>
        </div>
        <div v-if="!row.bought.value" class="upgrade-tile__roi">
          pays {{ fmtSec(row.paybackSeconds.value) }} · catches
          {{ fmtSec(row.crossoverSeconds.value) }}
        </div>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.income-bar {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-sm) var(--gap);
}

.income-bar__rows {
  display: flex;
  gap: var(--gap);
}

.income-bar__row {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  flex: 1 1 0;
  font-variant-numeric: tabular-nums;
}

.income-bar__row--player .income-bar__label {
  color: var(--color-primary, #4a9eff);
}

.income-bar__row--ai .income-bar__label {
  color: var(--color-danger, #e54c4c);
}

.income-bar__label {
  font-weight: 600;
}

.income-bar__rate {
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.9em;
}

.income-bar__balance {
  margin-left: auto;
  font-weight: 600;
}

.income-bar__upgrades {
  display: flex;
  gap: var(--gap-sm);
}

.upgrade-tile {
  flex: 1 1 0;
  gap: 2px;
}

.upgrade-tile:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.upgrade-tile--ready {
  border-color: var(--color-primary, #4a9eff);
}

.upgrade-tile--bought {
  border-color: var(--color-success, #4caf50);
  background: color-mix(in srgb, var(--color-success, #4caf50) 12%, var(--color-bg));
  opacity: 1;
}

.upgrade-tile__title {
  font-weight: 600;
  font-size: 0.9em;
}

.upgrade-tile__effect {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.upgrade-tile__cost {
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}

.upgrade-tile__roi {
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}
</style>
