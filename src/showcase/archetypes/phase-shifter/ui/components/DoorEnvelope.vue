<!--
  DoorEnvelope — the next door, drawn as a sealed envelope once its record is
  half met. Sealed it says only that something is taking shape; once the
  record holds it names the door, and opening it is the player's act.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { formatGrouped } from '@/composables/useFormatting';
import { BOX_PAGES, RECONSTRUCT_LEADS, SUSPECTS } from '../../data';
import { getBoard, getBox, getCase, getNight } from '../../modules';

const { life } = getCase();
const box = getBox();
const board = getBoard();
const night = getNight();

const door = computed(() => {
  const opened = life.doorsOpened.value;
  const record =
    opened === 0
      ? { have: new Decimal(box.pagesRead.value), need: BOX_PAGES, unit: 'pages read' }
      : opened === 1
        ? {
            have: new Decimal(board.leads.cumulative!.value),
            need: RECONSTRUCT_LEADS,
            unit: 'leads, all told',
          }
        : opened === 2
          ? {
              have: new Decimal(night.held.value.length),
              need: SUSPECTS.length,
              unit: 'alibis holding',
            }
          : null;
  const entry = life.doors.getAll()[opened];
  if (!record || !entry) return null;
  const fill = Math.min(1, record.have.div(record.need).toNumber());
  return { def: entry.def, fill, ready: entry.purchasable.canPurchase.value, ...record };
});
</script>

<template>
  <section v-if="door && door.fill >= 0.5" class="nc-door" :class="{ ready: door.ready }">
    <Button
      class="nc-envelope"
      :aria-label="door.ready ? door.def.title : 'A door not yet open'"
      :disabled="!door.ready"
      @click="life.open(door.def.id)"
    >
      <span class="title">{{ door.ready ? door.def.title : 'Something is taking shape' }}</span>
      <span v-if="door.ready" class="description">{{ door.def.description }}</span>
      <span class="seal nc-num">
        {{ formatGrouped(Decimal.min(door.have, door.need)) }} / {{ formatGrouped(door.need) }}
        {{ door.unit }}
      </span>
      <ProgressBar :value="door.fill" />
    </Button>
  </section>
</template>

<style scoped>
.nc-door {
  margin-top: 8px;
  animation: nc-arrive 900ms ease-out both;
}
.nc-door :deep(.olui-progress-bar) {
  --progress-bar-fill: var(--nc-string);
  --progress-bar-track: var(--nc-soot-edge);
}
.nc-envelope {
  display: grid;
  gap: 5px;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: var(--nc-soot-raised);
  border: 1px dashed var(--nc-string);
  border-radius: var(--nc-radius);
  color: var(--nc-carbon);
  opacity: 1;
  cursor: not-allowed;
}
.nc-door.ready .nc-envelope {
  border-style: solid;
  color: var(--nc-paper);
  cursor: pointer;
  box-shadow: inset 4px 0 0 var(--nc-string);
}
.nc-envelope .title {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--nc-string);
}
.nc-door.ready .nc-envelope .title {
  color: var(--nc-manila);
}
.nc-envelope .seal {
  font-size: 14px;
}
</style>
