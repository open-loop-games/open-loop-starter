<!--
  HardpointGauges — the header's live gauges: salvage and the rate the guns recover it, the
  board's firepower (what a carrier is tested against; tractors raise salvage, not this),
  the fire stack's multiplier, and modules fitted against sockets open. It reads module
  state, so it is its own component in SystemHeader's slot and never a root read.

  Adopts the `ResourceReadout` contract with its own renderer: ResourceHeaderStrip's chip
  formats every value with `format(v, 0)`, and these gauges each need their own notation
  (one decimal under ten, a ×multiplier, a dps unit). The contract has no per-readout
  notation field, so each gauge pairs a readout with its formatter here.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import type { ResourceReadout } from '@/ui/compositions';
import { getBoard, getYard } from '../../modules';
import { fmt, times } from '../format';

const yard = getYard();
const board = getBoard();
const placed = computed(() => board.placed.value.length);

interface Gauge {
  readout: ResourceReadout;
  show: (v: DecimalSource) => string;
  unit?: string;
}

const num = (v: DecimalSource) => Decimal.fromValue(v).toNumber();
const gauges: Gauge[] = [
  {
    readout: { id: 'salvage', label: 'salvage', value: yard.salvage, rate: board.salvageRate },
    show: (v) => fmt(v, 0),
  },
  {
    readout: { id: 'firepower', label: 'firepower', value: board.firepower },
    show: (v) => fmt(v),
    unit: 'dps',
  },
  {
    readout: { id: 'stack', label: 'fire stack', value: yard.globalMult },
    show: (v) => times(num(v)),
  },
  {
    readout: { id: 'hull', label: 'hull', value: placed, capacity: board.openCells },
    show: (v) => fmt(v, 0),
  },
];
</script>

<template>
  <dl class="hp-gauges">
    <div v-for="g in gauges" :key="g.readout.id" class="gauge" :class="g.readout.id">
      <dt>{{ g.readout.label }}</dt>
      <dd class="value hp-num">
        {{ g.show(g.readout.value.value)
        }}<small v-if="g.readout.capacity"> / {{ g.show(g.readout.capacity.value) }}</small
        ><small v-if="g.unit"> {{ g.unit }}</small>
      </dd>
      <dd v-if="g.readout.rate" class="rate hp-num">+{{ fmt(g.readout.rate.value) }}/s</dd>
    </div>
  </dl>
</template>

<style scoped>
.hp-gauges {
  display: flex;
  align-items: flex-start;
  gap: 26px;
  margin: 0 14px 0 0;
}
.gauge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 78px;
}
dt {
  font-family: var(--face-stencil);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--readout-dim);
}
dd {
  margin: 0;
}
.value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--readout);
}
.value small {
  margin-left: 0.25em;
  font-size: 12px;
  font-weight: 500;
  color: var(--readout-dim);
}
.salvage .value {
  font-size: 28px;
  color: var(--plasma);
  min-width: 7.5ch;
  text-align: right;
}
.firepower .value {
  min-width: 6.5ch;
  text-align: right;
}
.rate {
  font-size: 12px;
  color: var(--gain);
}
</style>
