<!--
  Per-tier upgrades + standalone purchasables (Acc / Mult / AccBoost-shaped
  cumulative purchases). The Transcend AccBoost is rendered via TierPanel's
  `#extras` slot in 2b.3 (cross-currency price, plus the row needs the
  transcend-side label "spend prestigePoints"); UpgradeGrid here covers the
  uniform shape — Antimatter Acc/Mult + Crystal/Transcend category upgrades.
-->
<script setup lang="ts">
import { computed, unref } from 'vue';
import { format, formatWhole } from 'open-loop-engine';
import type { TierState, ExtraPurchasableRef } from '../../composables/useTier';

function title(t: { display: { title: unknown } }): string {
  return (unref(t.display.title) as string | undefined) ?? '';
}
function description(t: { display: { description: unknown } }): string {
  return (unref(t.display.description) as string | undefined) ?? '';
}

const props = defineProps<{
  tier: TierState;
  /** Pass `false` to suppress an extra purchasable (e.g. Transcend AccBoost
   *  rendered via the per-tier extras slot in 2b.3). */
  visibleExtras?: (ref: ExtraPurchasableRef) => boolean;
}>();

const upgradeRows = computed(() => props.tier.upgrades?.value ?? []);

const extras = computed(() =>
  props.tier.extraPurchasables.filter((entry) =>
    props.visibleExtras ? props.visibleExtras(entry.ref) : true,
  ),
);
</script>

<template>
  <section
    v-if="extras.length > 0 || upgradeRows.length > 0"
    class="scaler-upgrade-grid"
  >
    <div
      v-for="entry in extras"
      :key="entry.ref.role"
      class="scaler-upgrade-row scaler-upgrade-row--extra"
      :data-role="entry.ref.role"
    >
      <div class="scaler-upgrade-row__title">
        <span>{{ title(entry.purchasable) || entry.ref.role }}</span>
        <span class="scaler-upgrade-row__level">Level {{ formatWhole(entry.purchasable.amount.value) }}</span>
      </div>
      <div
        v-if="description(entry.purchasable)"
        class="scaler-upgrade-row__desc"
      >
        {{ description(entry.purchasable) }}
      </div>
      <div class="scaler-upgrade-row__effect">
        ×{{ format(entry.purchasable.effect.value, 2) }}
      </div>
      <div class="scaler-upgrade-row__cost">
        Cost {{ format(entry.purchasable.getCost(1), 2) }} {{ entry.ref.costCurrencyDisplay }}
      </div>
      <button
        class="btn-sm scaler-upgrade-row__buy"
        :disabled="!entry.purchasable.canPurchase.value"
        @click="entry.purchasable.purchase(1)"
      >
        Buy
      </button>
    </div>

    <div
      v-for="row in upgradeRows"
      :key="row.def.id"
      class="scaler-upgrade-row scaler-upgrade-row--category"
      :data-bought="row.bought.value"
    >
      <div class="scaler-upgrade-row__title">
        <span>{{ title(row.purchasable) || row.def.id }}</span>
        <span
          v-if="row.bought.value"
          class="scaler-upgrade-row__level"
        >Level {{ formatWhole(row.purchasable.amount.value) }}</span>
      </div>
      <div
        v-if="description(row.purchasable)"
        class="scaler-upgrade-row__desc"
      >
        {{ description(row.purchasable) }}
      </div>
      <div class="scaler-upgrade-row__effect">
        ×{{ format(row.purchasable.effect.value, 2) }}
      </div>
      <div class="scaler-upgrade-row__cost">
        Cost {{ format(row.purchasable.getCost(1), 2) }}
      </div>
      <button
        class="btn-sm scaler-upgrade-row__buy"
        :disabled="!row.canPurchase.value"
        @click="row.purchase()"
      >
        Buy
      </button>
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
