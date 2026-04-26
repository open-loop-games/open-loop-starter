<script setup lang="ts">
import { computed } from 'vue';
import { useIncome, useTugData } from '../../composables';
import { useFormatting } from '@/composables/useFormatting';

/**
 * Income display. Shows player + AI accrual rates and current balances.
 *
 * Income upgrades are out of scope per OL-708 — the data layer carries
 * `incomeUpgrades` defs, but no engine module instantiates a purchasable
 * category for them yet. When the income-upgrades module lands as a
 * fork-extension or follow-up, render the upgrade tiles inside this panel
 * gated on `IncomeUpgradesKey` / category presence.
 */
const data = useTugData();
const player = useIncome('player');
const ai = useIncome('ai');
const { format } = useFormatting();

const baseRate = computed(() => Number(data.balance.baseIncomeRate));
const aiMult = computed(() => data.balance.aiIncomeMultiplier);
const aiRate = computed(() => baseRate.value * aiMult.value);

const resourceLabel = computed(() => data.theme.resourceName.plural);
</script>

<template>
  <div class="income-bar">
    <div class="income-bar__row income-bar__row--player">
      <span class="income-bar__label">{{ data.theme.factionNames[0] }}</span>
      <span class="income-bar__rate">+{{ format(baseRate, 1) }} {{ resourceLabel }}/s</span>
      <span class="income-bar__balance">
        {{ format(player.value.value, 0) }}
      </span>
    </div>
    <div class="income-bar__row income-bar__row--ai">
      <span class="income-bar__label">{{ data.theme.factionNames[1] }}</span>
      <span class="income-bar__rate">+{{ format(aiRate, 1) }} {{ resourceLabel }}/s</span>
      <span class="income-bar__balance">
        {{ format(ai.value.value, 0) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.income-bar {
  display: flex;
  gap: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
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
</style>
