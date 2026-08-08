<!--
  ReservePanel — the MW economy readout. The model is rate-based (no MW stockpile):
  the grid produces output MW, Lances draw MW to fire, and the surplus is routed to
  line repair in STANDBY. So this shows the live rates, not a stock — headline output,
  a signed net (surplus feeding the line / draw net under fire), and the draw/surplus/
  clear-rate breakdown. Reads `useCommandState`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import { useCommandState } from '../../composables/useCommandState';

const cmd = useCommandState();

const output = computed(() => format(cmd.mwOutput.value, 0));
const draw = computed(() => format(cmd.mwDraw.value, 0));
const surplus = computed(() => format(cmd.mwSurplus.value, 0));
const clearRate = computed(() => format(cmd.clearRate.value, 0));

const net = computed(() => cmd.mwNet.value.toNumber());
const netClass = computed(() => (net.value > 0 ? 'pos' : net.value < 0 ? 'crit' : 'neg'));
const netLabel = computed(() =>
  cmd.buildLocked.value ? 'net under fire' : 'surplus → line repair',
);
</script>

<template>
  <div class="cyc-panel cyc-reserve">
    <h3 class="cyc-slab">Reserve</h3>
    <div class="cyc-reserve__amt">{{ output }}<span class="cyc-reserve__u">MW/s</span></div>
    <div class="cyc-reserve__rate" :class="netClass">
      {{ net >= 0 ? '+' : '' }}{{ format(cmd.mwNet.value, 0) }} MW/s · {{ netLabel }}
    </div>
    <dl class="cyc-reserve__stats">
      <div>
        <dt>Fire draw</dt>
        <dd>−{{ draw }}</dd>
      </div>
      <div>
        <dt>Surplus</dt>
        <dd>{{ surplus }}</dd>
      </div>
      <div>
        <dt>Clear-rate C</dt>
        <dd class="cyc-reserve__c">
          {{ clearRate }}
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.cyc-reserve__amt {
  font-size: 24px;
  line-height: 1;
  color: var(--cyc-grn);
  text-shadow: 0 0 8px rgba(56, 255, 171, 0.35);
  font-variant-numeric: tabular-nums;
}
.cyc-reserve__u {
  font-size: 11px;
  color: var(--cyc-grn2);
  margin-left: 5px;
  letter-spacing: 1px;
}
.cyc-reserve__rate {
  font-size: 12px;
  margin-top: 5px;
  font-variant-numeric: tabular-nums;
}
.cyc-reserve__rate.pos {
  color: var(--cyc-grn);
}
.cyc-reserve__rate.neg {
  color: var(--cyc-amb);
}
.cyc-reserve__rate.crit {
  color: var(--cyc-red);
}
.cyc-reserve__stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 10px 0 0;
}
.cyc-reserve__stats div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--cyc-grndim);
  padding-bottom: 2px;
}
.cyc-reserve__stats dt {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--cyc-grn2);
}
.cyc-reserve__stats dd {
  margin: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--cyc-grn);
}
.cyc-reserve__c {
  color: var(--cyc-blu) !important;
}
</style>
