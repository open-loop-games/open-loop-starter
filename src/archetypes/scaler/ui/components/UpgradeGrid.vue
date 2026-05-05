<!--
  Per-tier upgrades. All entries live in the tier's PurchasableCategory
  (acc + mult on antimatter; crystal upgrades on prestige; acc-boost +
  4 mythos upgrades on transcend). Entries listed in
  `tier.display.externalUpgradeIds` are skipped here so a bespoke UI
  component (e.g. AccBoostRow on transcend) can render them in the
  TierPanel #extras slot.
-->
<script setup lang="ts">
import { computed, unref } from 'vue';
import { format, formatWhole } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';
import type { TierState } from '../../composables/useTier';

function title(t: { display: { title: unknown } }): string {
  return (unref(t.display.title) as string | undefined) ?? '';
}
function description(t: { display: { description: unknown } }): string {
  return (unref(t.display.description) as string | undefined) ?? '';
}

const props = defineProps<{
  tier: TierState;
}>();

const upgradeRows = computed(() => {
  const all = props.tier.upgrades?.value ?? [];
  const exclude = props.tier.display.externalUpgradeIds;
  if (!exclude || exclude.length === 0) return all;
  const excludeSet = new Set(exclude);
  return all.filter((row) => !excludeSet.has(row.def.id));
});
</script>

<template>
  <section v-if="upgradeRows.length > 0" class="scaler-upgrade-grid">
    <div
      v-for="row in upgradeRows"
      :key="row.def.id"
      class="scaler-upgrade-row scaler-upgrade-row--category"
      :data-bought="row.bought.value"
    >
      <div class="scaler-upgrade-row__title">
        <span>{{ title(row.purchasable) || row.def.id }}</span>
        <span v-if="row.bought.value" class="scaler-upgrade-row__level"
          >Level {{ formatWhole(row.purchasable.amount.value) }}</span
        >
      </div>
      <div v-if="description(row.purchasable)" class="scaler-upgrade-row__desc">
        {{ description(row.purchasable) }}
      </div>
      <div class="scaler-upgrade-row__effect">×{{ format(row.purchasable.effect.value, 2) }}</div>
      <div class="scaler-upgrade-row__cost">Cost {{ format(row.purchasable.getCost(1), 2) }}</div>
      <Button
        class="btn-sm scaler-upgrade-row__buy"
        :disabled="!row.canPurchase.value"
        @click="row.purchase()"
      >
        Buy
      </Button>
    </div>
  </section>
</template>

<style scoped>
.scaler-upgrade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--gap-sm);
  padding: var(--gap);
}
.scaler-upgrade-row {
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
.scaler-upgrade-row[data-bought='true'] {
  border-color: var(--color-primary);
}
.scaler-upgrade-row__title {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}
.scaler-upgrade-row__level {
  color: var(--color-text-muted);
  font-weight: 400;
  font-size: 0.85em;
}
.scaler-upgrade-row__desc {
  color: var(--color-text-muted);
  font-size: 0.85em;
  line-height: 1.35;
}
.scaler-upgrade-row__effect {
  font-weight: 600;
  color: var(--color-primary);
}
.scaler-upgrade-row__cost {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.scaler-upgrade-row__buy {
  margin-top: 4px;
  justify-self: stretch;
}
</style>
