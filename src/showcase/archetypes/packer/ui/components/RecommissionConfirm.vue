<!--
  RecommissionConfirm — the last word before the yard is cleared, pushed on the scaffold's
  modal stack. Stay on, or dismissing the dialog, closes it; Commission closes it and
  commissions.
-->
<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';
import { fmt, times } from '../format';

const props = defineProps<{
  /** the ship being stood down */
  from: string;
  name: string;
  hullClass: string;
  /** salvage the commissioning grant pays */
  grant: number;
  honours: number;
  honourMult: number;
  /** names of every schematic recovered */
  schematics: string[];
  onConfirm: () => void;
  onClose: () => void;
}>();

function commission(): void {
  props.onClose();
  props.onConfirm();
}
</script>

<template>
  <section class="hp-modal hp-recommission">
    <DialogTitle as-child>
      <h2 class="hp-modal-title">Commission the {{ name }}?</h2>
    </DialogTitle>
    <p class="lead">
      The {{ from }} stands down. A {{ hullClass.toLowerCase() }} takes her place on the line, with
      a commissioning grant of <span class="grant hp-num">{{ fmt(grant) }}</span> salvage to buy her
      opening fit.
    </p>
    <div class="ledger">
      <div class="col clears">
        <h3>Clears</h3>
        <ul>
          <li>the hull plating, back to her core</li>
          <li>every module fabricated, fitted or in the bay</li>
          <li>salvage in hand, refits and calibration</li>
        </ul>
      </div>
      <div class="col stays">
        <h3>Stays</h3>
        <ul>
          <li>
            <span class="hp-num">{{ honours }}</span> honours,
            <span class="hp-num">{{ times(honourMult) }}</span> on every weapon
          </li>
          <li>{{ schematics.length ? schematics.join(', ') : 'no schematics yet' }}</li>
          <li>the breach line, where you pushed it</li>
        </ul>
      </div>
    </div>
    <div class="actions">
      <Button class="hp-act cancel" @click="onClose">Stay on</Button>
      <Button class="hp-act can" @click="commission">Commission</Button>
    </div>
  </section>
</template>

<style scoped>
.lead {
  margin: 0 0 14px;
  color: var(--readout);
}
.grant {
  color: var(--plasma);
  font-weight: 700;
}
.ledger {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
}
.col {
  padding: 8px 10px;
  border: 1px solid var(--hull-seam);
  border-top: 2px solid var(--slag);
  border-radius: var(--radius-plate);
  background: var(--hull);
}
.stays {
  border-top-color: var(--honour);
}
h3 {
  margin: 0 0 4px;
  font-family: var(--face-stencil);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--readout-dim);
}
.stays h3 {
  color: var(--honour);
}
ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--readout);
}
li + li {
  margin-top: 3px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.actions .hp-act {
  font-family: var(--face-stencil);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
  padding: 5px 14px;
}
.actions .cancel {
  cursor: pointer;
  color: var(--readout-dim);
}
.actions .cancel:hover {
  color: var(--readout);
  border-color: var(--blueprint-dim);
}
</style>
