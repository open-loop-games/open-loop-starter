<!--
  CatalogPanel — the two permanent levers on the Fragments wallet (the `addUpgrade`
  catalog). NOT the one-shot UpgradeGrid composition: these are LEVELED, gated
  levers with a live level and a distinct pace/reach identity, so they render as
  lever cards rather than an upgrade tray. Reads the purchasable primitives
  directly (cost / canPurchase / amount / purchase) and the Button battery.

    • Reinforce (reach) — freely sold; raises D_max, +0 run length under the peg.
    • Dampen (g-bender) — the sole pace lever; reach-gated, bends g toward 1.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { getUpgrades, getBuild } from '../../modules';
import { UPGRADE_BALANCE } from '../../data/upgrades';

const upgrades = getUpgrades();
const build = getBuild();

const reachLevel = computed(() => Number(upgrades.reach.amount.value));
const reachCost = computed(() => new Decimal(upgrades.reach.getCost(1)));
const reachCanBuy = computed(() => upgrades.reach.canPurchase.value);

const bendLevel = computed(() => upgrades.gBendLevel.value);
const bendCost = computed(() => new Decimal(upgrades.gBender.getCost(1)));
const bendCanBuy = computed(() => upgrades.gBender.canPurchase.value);
// The next bend level (L_bend + 1) needs permanent power L ≥ (L_bend+1)·gateStep.
const bendGateReq = computed(() => (bendLevel.value + 1) * UPGRADE_BALANCE.gBendGateStep);
const bendGated = computed(() => build.powerLevel.value < bendGateReq.value);
</script>

<template>
  <section class="catalog">
    <h3 class="catalog__title">
      Permanents
    </h3>

    <!-- Reinforce (reach) -->
    <article
      class="lever lever--reach"
      :data-afford="reachCanBuy ? 'true' : 'false'"
    >
      <div class="lever__head">
        <span class="lever__name">Reinforce</span>
        <span class="lever__level">L{{ reachLevel }}</span>
      </div>
      <p class="lever__desc">
        Raise the ceiling D_max. Pure reach — the peg re-baselines, +0 run length.
      </p>
      <Button
        class="lever__btn"
        :disabled="!reachCanBuy"
        @click="upgrades.reach.purchase(1)"
      >
        {{ format(reachCost, 0) }} Fragments
      </Button>
    </article>

    <!-- Dampen (g-bender) -->
    <article
      class="lever lever--dampen"
      :data-afford="bendCanBuy ? 'true' : 'false'"
      :data-gated="bendGated ? 'true' : 'false'"
    >
      <div class="lever__head">
        <span class="lever__name">Dampen</span>
        <span class="lever__level">L{{ bendLevel }}</span>
      </div>
      <p class="lever__desc">
        Bend the escalation base g toward 1 — the sole pace lever. Every level lengthens the run.
      </p>
      <p
        v-if="bendGated"
        class="lever__gate"
      >
        Reach gate — needs Power L ≥ {{ bendGateReq }}
      </p>
      <Button
        class="lever__btn"
        :disabled="!bendCanBuy"
        @click="upgrades.gBender.purchase(1)"
      >
        <span v-if="bendGated">Locked</span>
        <span v-else>{{ format(bendCost, 0) }} Fragments</span>
      </Button>
    </article>
  </section>
</template>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.catalog__title {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.lever {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--lever-accent);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.lever--reach {
  --lever-accent: var(--cyc-steel);
}
.lever--dampen {
  --lever-accent: var(--cyc-fragment);
}
.lever--dampen[data-gated='true'] {
  --lever-accent: var(--color-border);
  opacity: 0.72;
}
.lever__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.lever__name {
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--color-text);
}
.lever__level {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
  color: var(--lever-accent);
}
.lever__desc {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--color-text-muted);
}
.lever__gate {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cyc-hot);
}
.lever__btn {
  margin-top: 2px;
  padding: 5px var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  cursor: not-allowed;
}
.lever[data-afford='true'] .lever__btn {
  background: color-mix(in srgb, var(--lever-accent) 22%, var(--color-surface));
  color: var(--color-text);
  border-color: var(--lever-accent);
  cursor: pointer;
}
</style>
