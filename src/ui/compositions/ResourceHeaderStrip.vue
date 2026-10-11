<!--
  ResourceHeaderStrip — top/bottom/sidebar strip of resource readouts.
  Built on HudBar + HudChip; takes a pure-data ResourceReadout[] so any
  archetype's currency module can adapt without per-currency component
  duplication. Per OL-919: orientation+position as props, leading/trailing
  slots for archetype-specific contextual content.

  Reference case for the contract/renderer split: the battery is the
  `ResourceReadout` shape, and this renderer is one default. A game may adopt
  the shape and render it with its OWN component — "want the shape, not the
  markup" is a first-class path, not a fallback. Costume hooks
  (`:deep(.resource-header-strip__…)`) are stable API for stories that keep
  this renderer; `.resource-header-strip` root, `__value` / `__rate` / `__label`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format, type DecimalSource } from '@open-loop/engine';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import type { ResourceReadout, ResourceHighlight } from './ResourceHeaderStrip';

type Orientation = 'horizontal' | 'vertical-sidebar';
type Position = 'top' | 'bottom';

const props = withDefaults(
  defineProps<{
    readouts: ResourceReadout[];
    orientation?: Orientation;
    position?: Position;
  }>(),
  { orientation: 'horizontal', position: 'top' },
);

defineSlots<{
  leading?: () => unknown;
  trailing?: () => unknown;
}>();

const visible = computed(() => props.readouts.filter((r) => r.visible?.value ?? true));

function chipVariant(
  highlight: ResourceHighlight | undefined,
): 'default' | 'big' | 'muted' | 'stat' {
  if (!highlight) return 'default';
  if (highlight === 'deficit') return 'muted';
  if (highlight === 'surplus') return 'big';
  return 'default';
}

function rateSign(value: DecimalSource): string {
  return Decimal.lt(value, 0) ? '' : '+';
}
</script>

<template>
  <div class="resource-header-strip" :data-orientation="orientation" :data-position="position">
    <HudBar>
      <slot name="leading" />
      <HudChip
        v-for="r in visible"
        :key="r.id"
        :variant="chipVariant(r.highlight?.value)"
        :data-readout-id="r.id"
        :data-highlight="r.highlight?.value ?? 'normal'"
      >
        <span class="resource-header-strip__value"
          >{{ format(r.value.value, 0)
          }}<template v-if="r.capacity"> / {{ format(r.capacity.value, 0) }}</template></span
        >
        <span class="resource-header-strip__label">{{ r.label }}</span>
        <span v-if="r.rate" class="resource-header-strip__rate"
          >{{ rateSign(r.rate.value) }}{{ format(r.rate.value, 2) }}/s</span
        >
      </HudChip>
      <slot name="trailing" />
    </HudBar>
  </div>
</template>

<style scoped>
.resource-header-strip[data-orientation='vertical-sidebar'] :deep(.hud-bar) {
  flex-direction: column;
  align-items: stretch;
}
.resource-header-strip__value {
  font-variant-numeric: tabular-nums;
}
.resource-header-strip__label {
  font-size: 0.7em;
  opacity: 0.7;
  margin-left: 0.4em;
}
.resource-header-strip__rate {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  margin-left: 6px;
  font-size: 0.85em;
}
</style>
