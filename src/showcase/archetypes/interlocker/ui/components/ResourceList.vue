<!--
  ResourceList — dense Kittens-style resource readout for the sidebar.
  Three aligned columns (name | value[/cap] | rate), mirroring canon's
  `display:table` resource panel (kittensgame res/default.css `.res-row`).
  Consumes the same ResourceReadout[] the shared ResourceHeaderStrip uses,
  but the strip's pill-chip model doesn't fit a vertical sidebar — a tight
  table does. Rate is color-coded: green surplus, red deficit.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format, type DecimalSource } from '@open-loop/engine';
import type { ResourceReadout } from '@/ui/compositions';

const props = defineProps<{ readouts: ResourceReadout[] }>();

const visible = computed(() => props.readouts.filter((r) => !(r.hidden?.value ?? false)));

function rateSign(value: DecimalSource): string {
  return Decimal.lt(value, 0) ? '' : '+';
}
function rateTone(value: DecimalSource): 'up' | 'down' | 'flat' {
  if (Decimal.gt(value, 0)) return 'up';
  if (Decimal.lt(value, 0)) return 'down';
  return 'flat';
}
</script>

<template>
  <ul class="resource-list">
    <li
      v-for="r in visible"
      :key="r.id"
      class="resource-list__row"
      :data-readout-id="r.id"
      :data-highlight="r.highlight?.value ?? 'normal'"
    >
      <span class="resource-list__name">{{ r.label }}</span>
      <span class="resource-list__value"
        >{{ format(r.value.value, 0)
        }}<template v-if="r.cap"
          ><span class="resource-list__cap"> / {{ format(r.cap.value, 0) }}</span></template
        ></span
      >
      <span v-if="r.rate" class="resource-list__rate" :data-tone="rateTone(r.rate.value)"
        >{{ rateSign(r.rate.value) }}{{ format(r.rate.value, 2) }}/s</span
      >
      <span v-else class="resource-list__rate" />
    </li>
  </ul>
</template>

<style scoped>
.resource-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  column-gap: var(--gap-sm);
  row-gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.resource-list__row {
  display: contents;
}
.resource-list__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.resource-list__value {
  text-align: right;
  white-space: nowrap;
}
.resource-list__cap {
  color: var(--color-text-muted);
}
.resource-list__rate {
  text-align: right;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 0.92em;
}
.resource-list__rate[data-tone='up'] {
  color: var(--color-success);
}
.resource-list__rate[data-tone='down'] {
  color: var(--color-danger);
}
/* At-cap storage reads muted so the live producers draw the eye. */
.resource-list__row[data-highlight='surplus'] .resource-list__value {
  color: var(--color-text-muted);
}
</style>
