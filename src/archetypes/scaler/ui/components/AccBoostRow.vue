<!--
  Transcend Accelerator Boost — cross-currency upgrade rendered separately
  from the standard UpgradeGrid for a focused cross-currency price label.
  Cost lives at Transcend tier but pays in prestigePoints (per Synergism's
  Reset.ts:498-499 + Buy.ts:705); the engine enforces it via
  createCostRequirement against the prestigePoints resource — a parameter
  on `createPurchasableCategory`'s `mapPurchasable`, not a separate
  primitive (see triage discussion at OL-823).

  acc-boost lives inside the transcend upgrades category as a regular
  entry; tier-configs marks its id in `externalUpgradeIds` so UpgradeGrid
  skips it and AccBoostRow renders it here in the #extras slot.
-->
<script setup lang="ts">
import { computed, unref } from 'vue';
import { format, formatWhole } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { ScalerTiersKey } from '../../modules';

const tiers = useModule(ScalerTiersKey);
const transcend = tiers.find((t) => t.id === 'transcend');
const accBoostEntry = computed(() => transcend?.upgrades?.getEntry('acc-boost'));
const accBoost = computed(() => accBoostEntry.value?.purchasable);

function title(): string {
  const p = accBoost.value;
  if (!p) return 'Accelerator Boost';
  return (unref(p.display.title) as string | undefined) ?? 'Accelerator Boost';
}
function description(): string {
  const p = accBoost.value;
  if (!p) return '';
  return (unref(p.display.description) as string | undefined) ?? '';
}
</script>

<template>
  <section
    v-if="accBoost"
    class="scaler-acc-boost"
  >
    <header class="scaler-acc-boost__head">
      <h4>{{ title() }}</h4>
      <span class="scaler-acc-boost__level">Level {{ formatWhole(accBoost.amount.value) }}</span>
    </header>
    <p
      v-if="description()"
      class="scaler-acc-boost__desc"
    >
      {{ description() }}
    </p>
    <div class="scaler-acc-boost__numbers">
      <span class="scaler-acc-boost__effect">×{{ format(accBoost.effect.value, 2) }}</span>
      <span class="scaler-acc-boost__cost">
        Cost {{ format(accBoost.getCost(1), 2) }} <em>Prestige Points</em>
      </span>
    </div>
    <button
      class="btn-sm scaler-acc-boost__buy"
      :disabled="!accBoost.canPurchase.value"
      @click="accBoost.purchase(1)"
    >
      Buy 1 Boost
    </button>
  </section>
</template>

<style scoped>
.scaler-acc-boost {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
.scaler-acc-boost__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap-sm);
}
.scaler-acc-boost__head h4 {
  margin: 0;
  font-size: 1em;
  font-weight: 700;
}
.scaler-acc-boost__level {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.scaler-acc-boost__desc {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.scaler-acc-boost__numbers {
  display: flex;
  align-items: baseline;
  gap: var(--gap);
  flex-wrap: wrap;
}
.scaler-acc-boost__effect {
  color: var(--color-primary);
  font-weight: 600;
}
.scaler-acc-boost__cost {
  font-size: 0.9em;
  color: var(--color-text-muted);
}
.scaler-acc-boost__cost em {
  font-style: normal;
  color: var(--color-text);
}
.scaler-acc-boost__buy {
  align-self: flex-start;
}
</style>
