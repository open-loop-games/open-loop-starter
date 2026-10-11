<!--
  LeversPanel — the two permanent levers on the Fragments wallet (the `addUpgrade`
  catalog), phosphor-styled. NOT the one-shot UpgradeGrid: these are leveled, gated
  levers with a distinct pace/reach identity.
    • Reinforce (reach) — freely sold; raises the ceiling, +0 run length under the peg.
    • Dampen (g-bender) — the sole pace lever; reach-gated, bends g toward 1.
  Reads the purchasable primitives directly (cost / canPurchase / purchase).
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { getUpgrades, getBuild } from '../../modules';
import { UPGRADE_BALANCE } from '../../data/upgrades';

const upgrades = getUpgrades();
const build = getBuild();

const reachLevel = computed(() => Number(upgrades.reach.count.value));
const reachCost = computed(() => new Decimal(upgrades.reach.getCost(1)));
const reachCanBuy = computed(() => upgrades.reach.canPurchase.value);

const bendLevel = computed(() => upgrades.gBendLevel.value);
const bendCost = computed(() => new Decimal(upgrades.gBender.getCost(1)));
const bendCanBuy = computed(() => upgrades.gBender.canPurchase.value);
const bendGateReq = computed(() => (bendLevel.value + 1) * UPGRADE_BALANCE.gBendGateStep);
const bendGated = computed(() => build.powerLevel.value < bendGateReq.value);
</script>

<template>
  <div class="cyc-panel">
    <h3 class="cyc-slab">Levers</h3>

    <div class="cyc-lever">
      <div class="cyc-lever__meta">
        <div class="cyc-lever__t">Reinforce</div>
        <div class="cyc-lever__d">Raise the clear-rate ceiling. Pure reach — +0 run length.</div>
      </div>
      <span class="cyc-lever__lv">L{{ reachLevel }}</span>
      <Button
        class="cyc-btn"
        :class="{ broke: !reachCanBuy }"
        :disabled="!reachCanBuy"
        @click="upgrades.reach.purchase(1)"
      >
        ◈ {{ format(reachCost, 0) }}
      </Button>
    </div>

    <div class="cyc-lever">
      <div class="cyc-lever__meta">
        <div class="cyc-lever__t">Dampen</div>
        <div class="cyc-lever__d">
          <template v-if="bendGated"> Reach-gated — needs Power L ≥ {{ bendGateReq }}. </template>
          <template v-else> Bend g toward 1 — the sole pace lever. Lengthens every run. </template>
        </div>
      </div>
      <span class="cyc-lever__lv">L{{ bendLevel }}</span>
      <Button
        class="cyc-btn"
        :class="{ broke: !bendCanBuy }"
        :disabled="!bendCanBuy"
        @click="upgrades.gBender.purchase(1)"
      >
        <template v-if="bendGated"> locked </template>
        <template v-else> ◈ {{ format(bendCost, 0) }} </template>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.cyc-lever {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  background: rgba(7, 16, 22, 0.6);
  border: 1px solid var(--cyc-grn2);
}
.cyc-lever + .cyc-lever {
  margin-top: 8px;
}
.cyc-lever__meta {
  flex: 1;
  min-width: 0;
}
.cyc-lever__t {
  font-size: 11.5px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--cyc-grn);
}
.cyc-lever__d {
  font-size: 9.5px;
  opacity: 0.6;
  line-height: 1.3;
}
.cyc-lever__lv {
  font-size: 10.5px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.cyc-btn {
  background: transparent;
  border: 1px solid var(--cyc-grn);
  color: var(--cyc-grn);
  font: 700 10.5px/1 var(--cyc-mono);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 6px 9px;
  cursor: pointer;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cyc-btn.broke {
  border-color: var(--cyc-grndim);
  color: var(--cyc-grn2);
  cursor: not-allowed;
}
</style>
