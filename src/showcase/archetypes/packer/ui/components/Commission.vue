<!--
  Commission — the next ship, offered once the last carrier this one was built for has
  fallen. Commissioning clears the yard and the bay; the confirmation, pushed on the
  scaffold's modal stack, says what clears, what stays and the grant she comes with.
  Staying on is a choice too: raised carriers keep coming for a ship that stays.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import { COMMISSION_PURSE, PIECE_BY_ID } from '../../data';
import { getFleet, getLine } from '../../modules';
import { useFitting } from '../fitting';
import { fmt } from '../format';
import { useShipInService } from '../ship';
import RecommissionConfirm from './RecommissionConfirm.vue';

const fleet = getFleet();
const line = getLine();
const fitting = useFitting();
const ship = useShipInService();
const stack = inject(modalStackKey)!;

const offer = computed(() => {
  const next = ship.next.value;
  if (!next || !fleet.shipDone.value) return null;
  return { next, grant: COMMISSION_PURSE[next.id] };
});

function confirm() {
  const o = offer.value;
  if (!o) return;
  stack.push(
    RecommissionConfirm,
    {
      from: ship.def.value.name,
      name: o.next.name,
      hullClass: o.next.classes[0],
      grant: o.grant,
      honours: fleet.honours.value,
      honourMult: fleet.honourMult.value,
      schematics: fleet.decrypted.value.map((p) => PIECE_BY_ID[p].name),
      onConfirm: () => {
        fitting.hand = null;
        fitting.facing = 0;
        line.recommission();
      },
    },
    'sm',
  );
}
</script>

<template>
  <section v-if="offer" class="commission">
    <h2 class="hp-head">Commission</h2>
    <div class="hp-card">
      <div>
        <div class="name">{{ offer.next.name }}</div>
        <div class="sub">
          {{ offer.next.classes[0] }} · comes with
          <span class="grant hp-num">{{ fmt(offer.grant) }}</span> salvage to fit her
        </div>
        <div v-if="!line.canRecommission.value" class="sub wait">the engagement must end first</div>
      </div>
      <Button
        class="hp-act commission-act"
        :class="{ can: line.canRecommission.value }"
        :disabled="!line.canRecommission.value"
        @click="confirm"
      >
        Commission
      </Button>
    </div>
    <p class="stay">Or stay on: raised carriers keep coming for the {{ ship.def.value.name }}.</p>
  </section>
</template>

<style scoped>
.commission {
  animation: hp-decrypt 600ms ease-out both;
}
.hp-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  background: color-mix(in srgb, var(--honour) 6%, var(--hull));
  border: 1px solid color-mix(in srgb, var(--honour) 40%, var(--hull-seam));
  border-radius: var(--radius-plate);
}
.name {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--honour);
}
.sub {
  font-size: 12px;
  color: var(--readout-dim);
}
.grant {
  color: var(--plasma);
  font-weight: 700;
}
.wait {
  color: var(--slag);
}
.commission-act {
  flex: none;
  font-family: var(--face-stencil);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.stay {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--readout-dim);
}
</style>
