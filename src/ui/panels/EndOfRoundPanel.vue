<script setup lang="ts">
import { computed, toValue } from 'vue';
import { Decimal, format, type DecimalSource, type Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CreepWarfareKey } from '@/modules/mods/creep-vs-creep';
import { META_CURRENCY_NAME, META_UPGRADE_DEFS } from '@/modules/mods/creep-vs-creep/content';

const state = useModule(CreepWarfareKey);

const countdown = computed(() => Math.ceil(state.round.countdown.value));
const meta = computed(() => format(Decimal.floor(state.round.metaCurrency.value)));
const awarded = computed(() => format(state.round.awardedReward.value));
const stats = computed(() => state.round.stats.value);
const capacity = computed(() => state.goals.capacity.value);

const entries = computed(() =>
  META_UPGRADE_DEFS.map((def) => {
    const p = state.meta.get(def.id);
    return { def, p };
  }).filter((e): e is { def: typeof e.def; p: Purchasable } => e.p != null),
);

function buy(p: Purchasable) {
  if (p.canPurchase.value) p.purchase();
}

function startNext() {
  state.round.startNextRound();
}
</script>

<template>
  <section class="eor-panel">
    <header class="eor-header">
      <h3>Round Complete</h3>
      <span class="countdown">Auto-advance in {{ countdown }}s</span>
    </header>

    <div class="summary">
      <div class="row">
        <span class="label">Territory held</span>
        <span class="value">{{ stats.territory }} cells</span>
      </div>
      <div class="row">
        <span class="label">Hotspots held</span>
        <span class="value">{{ stats.hotspotsHeld }}</span>
      </div>
      <div class="row">
        <span class="label">Surviving factions</span>
        <span class="value">{{ stats.survivingFactions }}</span>
      </div>
      <div class="row reward">
        <span class="label">{{ META_CURRENCY_NAME }} earned</span>
        <span class="value">+{{ awarded }}</span>
      </div>
      <div class="row">
        <span class="label">Total {{ META_CURRENCY_NAME }}</span>
        <span class="value">{{ meta }}</span>
      </div>
      <div class="row">
        <span class="label">Goal slots</span>
        <span class="value">{{ capacity }}</span>
      </div>
    </div>

    <h4>Permanent Upgrades</h4>
    <div class="upgrade-list">
      <div
        v-for="{ def, p } in entries"
        :key="def.id"
        class="upgrade-card"
      >
        <div class="info">
          <span class="title">{{ def.name }}</span>
          <span class="desc">{{ def.description }}</span>
          <span class="owned">
            Level {{ format(p.amount.value) }} /
            {{ format(toValue(p.limit) as DecimalSource) }}
          </span>
        </div>
        <button
          class="btn-sm"
          :disabled="!p.canPurchase.value"
          @click="buy(p)"
        >
          <template v-if="p.maxed.value">
            Maxed
          </template>
          <template v-else>
            Buy ({{ format(p.getCost()) }})
          </template>
        </button>
      </div>
    </div>

    <button
      class="btn-primary next-btn"
      @click="startNext"
    >
      Start Next Round
    </button>
  </section>
</template>

<style scoped>
.eor-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.eor-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.eor-header h3 {
  font-size: 1.1em;
  margin: 0;
}
.countdown {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.row {
  display: flex;
  justify-content: space-between;
}
.row.reward .value {
  color: var(--color-primary);
  font-weight: 700;
}
.label {
  color: var(--color-text-muted);
}
.value {
  font-weight: 600;
}
.upgrade-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.upgrade-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.title {
  font-weight: 600;
}
.desc,
.owned {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.next-btn {
  align-self: flex-end;
}
</style>
