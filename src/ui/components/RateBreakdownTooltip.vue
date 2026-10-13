<!--
  RateBreakdownTooltip — Paradox-style hover breakdown for a producer-shaped
  row. Composes RichTooltip + ChainBreakdown + a stat list. Theme-naked
  using `--color-*` / `--gap-*` tokens; a story with a bespoke costume keeps
  its own tooltip wrapper and uses `useRateBreakdown` for shared compute.

  Slot scope is the same `useRateBreakdown` view, so callers can compose
  arbitrary head/extra rows without re-deriving productionRate/marginal math.

  Costume classes: olui-rate-breakdown, olui-rate-breakdown__head, …__stats,
  …__stat, …__stat--marginal. Reactive state from reka-ui (RichTooltip).
-->
<script setup lang="ts">
import { toRef } from 'vue';
import type { DecimalSource } from '@open-loop/engine';
import RichTooltip from './RichTooltip.vue';
import ChainBreakdown from './ChainBreakdown.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useRateBreakdown, type RateBreakdownRow } from '@/composables/useRateBreakdown';

const props = withDefaults(
  defineProps<{
    row: RateBreakdownRow;
    /** Total rate across the same resource — denominator for productionRate %. */
    totalRate: DecimalSource;
    /** Count the marginal projection should reflect. Default 1. */
    pendingCount?: DecimalSource;
    /** Suffix appended to rate displays. Default `' /sec'`. */
    unit?: string;
    /** RichTooltip side preference. Default `'right'`. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** Title for the chain-breakdown block. Default `'Rate each'`. */
    breakdownTitle?: string;
    /** Render the marginal "next purchase" row. Default `true` when
     *  pendingCount > 0. Pass `false` for displays that only show
     *  current-state productionRate. */
    showMarginal?: boolean;
  }>(),
  {
    pendingCount: 1,
    unit: ' /sec',
    side: 'right',
    breakdownTitle: 'Rate each',
    showMarginal: true,
  },
);

const view = useRateBreakdown(
  props.row,
  () => props.totalRate,
  () => props.pendingCount,
);

const { format, formatPercent, formatBeatTime, formatPlus } = useFormatting();

const rowRef = toRef(props, 'row');
</script>

<template>
  <RichTooltip :open-delay="250" :close-delay="100" :side="side">
    <slot />
    <template #content>
      <div class="olui-rate-breakdown">
        <slot name="head" :row="rowRef" :view="view">
          <div class="olui-rate-breakdown__head">
            <span class="olui-rate-breakdown__name">{{ row.def.displayName }}</span>
            <span class="olui-rate-breakdown__count"> {{ format(row.count.value, 0) }} owned </span>
          </div>
        </slot>

        <ChainBreakdown
          :title="breakdownTitle"
          :modifier="row.rateChain"
          :base="row.def.baseRate"
          :unit="unit"
        />

        <dl class="olui-rate-breakdown__stats">
          <div class="olui-rate-breakdown__stat">
            <dt>Share</dt>
            <dd>
              {{ format(view.productionRate.value, 2) }}{{ unit }}
              <span class="olui-rate-breakdown__muted">
                ({{ formatPercent(view.productionShare.value, 1) }})
              </span>
            </dd>
          </div>
          <div v-if="view.beatTimeFinite.value" class="olui-rate-breakdown__stat">
            <dt>Beat time</dt>
            <dd>{{ formatBeatTime(row.beatTime.value) }}</dd>
          </div>
          <div
            v-if="showMarginal && view.pendingPositive.value"
            class="olui-rate-breakdown__stat olui-rate-breakdown__stat--marginal"
          >
            <dt>Next purchase</dt>
            <dd>
              {{ formatPlus(view.marginalDelta.value, 2) }}{{ unit }}
              <span class="olui-rate-breakdown__muted">
                ({{ formatPercent(view.marginalPct.value, 1) }})
              </span>
            </dd>
          </div>
          <slot name="extra" :row="rowRef" :view="view" />
        </dl>
      </div>
    </template>
  </RichTooltip>
</template>

<style scoped>
.olui-rate-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-width: 260px;
}

.olui-rate-breakdown__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.olui-rate-breakdown__name {
  /* inherits header font weight */
}

.olui-rate-breakdown__count {
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.olui-rate-breakdown__stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.olui-rate-breakdown__stat {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-size: 0.9em;
}

.olui-rate-breakdown__stat dt {
  color: var(--color-text-muted);
}

.olui-rate-breakdown__stat dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.olui-rate-breakdown__stat--marginal dd {
  color: var(--color-success, var(--color-primary));
  font-weight: 600;
}

.olui-rate-breakdown__muted {
  color: var(--color-text-muted);
  font-weight: 400;
  margin-left: 4px;
}
</style>
