<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';

const ad = useModule(AntimatterDimensionsKey);

const rows = computed(() =>
  ad.dims.map((dim) => ({
    dim,
    id: dim.def.id,
    name: dim.def.name,
    description: dim.def.description,
    count: format(Decimal.floor(dim.count.value)),
    bought: new Decimal(dim.purchasable.amount.value).toNumber(),
    rate: format(Decimal.mul(dim.computedRate.value, dim.count.value), 2),
    cost: format(dim.purchasable.getCost()),
    canBuy: dim.purchasable.canPurchase.value,
  })),
);

function buy(id: string): void {
  const dim = ad.dims.find((d) => d.def.id === id);
  if (dim && dim.purchasable.canPurchase.value) {
    dim.purchasable.purchase();
  }
}

const tickspeedCount = computed(() => format(Decimal.floor(ad.tickspeed.amount.value)));
const tickspeedCost = computed(() => format(ad.tickspeed.getCost()));
const tickspeedMult = computed(() =>
  format(Decimal.pow(1.1, ad.tickspeed.amount.value), 2),
);
const canBuyTickspeed = computed(() => ad.tickspeed.canPurchase.value);

function buyTickspeed(): void {
  if (ad.tickspeed.canPurchase.value) ad.tickspeed.purchase();
}

const boostCount = computed(() => format(Decimal.floor(ad.boostCount.value)));
const boostCostLabel = computed(() => format(ad.boostCost.value));
const boostMult = computed(() =>
  format(Decimal.add(1, Decimal.mul(ad.boostCount.value, 0.5)), 2),
);

const galaxyCount = computed(() => format(Decimal.floor(ad.galaxyCount.value)));
const galaxyCostLabel = computed(() => format(ad.galaxyCost.value));
const galaxyMult = computed(() => format(Decimal.pow(1.5, ad.galaxyCount.value), 2));

const sacrificeMult = computed(() => format(ad.sacrificeMult.value, 2));
const sacrificeNextGain = computed(() => format(ad.sacrificeGain.value, 2));

function doBoost(): void {
  ad.doBoost();
}
function doGalaxy(): void {
  ad.doGalaxy();
}
function doSacrifice(): void {
  ad.doSacrifice();
}
</script>

<template>
  <section class="ad-dimensions-panel">
    <h3>Dimensions</h3>
    <div class="dim-list">
      <div
        v-for="row in rows"
        :key="row.id"
        class="dim-card"
      >
        <div class="info">
          <span class="name">{{ row.name }}</span>
          <span class="desc">{{ row.description }}</span>
          <span class="stat">
            Count: {{ row.count }}
            <span class="muted">({{ row.bought }} bought)</span>
          </span>
          <RichTooltip>
            <span class="stat stat--hoverable">Produces: {{ row.rate }}/s</span>
            <template #content>
              <ChainBreakdown
                :title="`${row.name} — per-unit rate`"
                :modifier="row.dim.rateChain"
                :base="row.dim.def.baseRate"
                unit="/s"
              />
            </template>
          </RichTooltip>
        </div>
        <button
          v-hold-repeat="() => buy(row.id)"
          class="btn-sm"
          :disabled="!row.canBuy"
        >
          Buy
          <span class="cost">({{ row.cost }})</span>
        </button>
      </div>
    </div>

    <h3 class="section-head">
      Tickspeed
    </h3>
    <div class="mechanic-card">
      <div class="info">
        <span class="stat">Purchased: {{ tickspeedCount }}</span>
        <span class="stat">Current bonus: ×{{ tickspeedMult }} to all Antimatter Dimensions</span>
      </div>
      <button
        v-hold-repeat="buyTickspeed"
        class="btn-sm"
        :disabled="!canBuyTickspeed"
      >
        Buy
        <span class="cost">({{ tickspeedCost }} AM)</span>
      </button>
    </div>

    <h3 class="section-head">
      Dim Boost &amp; Galaxy
    </h3>
    <div class="mechanic-row">
      <div class="mechanic-card">
        <div class="info">
          <span class="name">Dim Boost</span>
          <span class="desc">Reset lower dims for a +0.5× all-dim multiplier per boost.</span>
          <span class="stat">Boosts: {{ boostCount }} · Bonus: ×{{ boostMult }}</span>
          <span class="stat muted">Requires {{ boostCostLabel }} Eighth Dimensions</span>
        </div>
        <button
          class="btn-sm"
          :disabled="!ad.canBoost.value"
          @click="doBoost"
        >
          Boost
        </button>
      </div>
      <div class="mechanic-card">
        <div class="info">
          <span class="name">Antimatter Galaxy</span>
          <span class="desc">Larger reset that includes Dim Boosts. 1.5× per galaxy.</span>
          <span class="stat">Galaxies: {{ galaxyCount }} · Bonus: ×{{ galaxyMult }}</span>
          <span class="stat muted">Requires {{ galaxyCostLabel }} Eighth Dimensions</span>
        </div>
        <button
          class="btn-sm"
          :disabled="!ad.canGalaxy.value"
          @click="doGalaxy"
        >
          Galaxy
        </button>
      </div>
    </div>

    <h3 class="section-head">
      Dimensional Sacrifice
    </h3>
    <div class="mechanic-card">
      <div class="info">
        <span class="desc">Sacrifice Dims 1-7 for a persistent Eighth Dimension multiplier.</span>
        <span class="stat">Current multiplier: ×{{ sacrificeMult }}</span>
        <span class="stat">Next sacrifice gain: ×{{ sacrificeNextGain }}</span>
        <span class="stat muted">Requires at least 1 Eighth Dimension</span>
      </div>
      <button
        class="btn-sm"
        :disabled="!ad.canSacrifice.value"
        @click="doSacrifice"
      >
        Sacrifice
      </button>
    </div>
  </section>
</template>

<style scoped>
.ad-dimensions-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.section-head {
  margin-top: var(--gap);
}
.dim-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.dim-card,
.mechanic-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  gap: var(--gap);
}
.mechanic-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-sm);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name {
  font-weight: 600;
}
.desc,
.stat {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.stat--hoverable {
  border-bottom: 1px dotted var(--color-text-muted);
  cursor: help;
  align-self: flex-start;
}
.muted {
  opacity: 0.7;
}
.cost {
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-left: 4px;
}
</style>
