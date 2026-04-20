<!--
  ProducerTooltip — Paradox-style hover breakdown for a single producer row.
  Wraps the card body in a RichTooltip; content shows the modifier chain,
  payback period, current contribution, and the marginal impact of the
  pending purchase.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';
import { useFormatting } from '@/composables/useFormatting';
import type { ProducerRow } from '../../composables/useProducers';

const props = defineProps<{
  row: ProducerRow;
  /** Total rate on this producer's resource (for contribution %). */
  totalRate: DecimalSource;
  /** How many the current bulk mode will actually purchase. */
  pendingAmount: DecimalSource;
}>();

const { format, formatPurchaseBeat, formatPercent, formatWhole } = useFormatting();

const contribution = computed(() => Decimal.mul(props.row.rate.value, props.row.count.value));

const contributionPct = computed(() => {
  const total = Decimal.fromValue(props.totalRate);
  if (!total.gt(0)) return 0;
  return contribution.value.div(total).toNumber();
});

const marginalDelta = computed(() => Decimal.mul(props.row.rate.value, props.pendingAmount));

const marginalPct = computed(() => {
  const total = Decimal.fromValue(props.totalRate);
  if (!total.gt(0)) return 0;
  return marginalDelta.value.div(total).toNumber();
});

const pendingIsPositive = computed(() => Decimal.gt(props.pendingAmount, 0));
const beatFinite = computed(() => Number.isFinite(props.row.beatSeconds.value));
</script>

<template>
  <RichTooltip
    :open-delay="250"
    :close-delay="100"
    side="right"
  >
    <slot />
    <template #content>
      <div class="producer-tooltip">
        <div class="producer-tooltip__head">
          <span class="producer-tooltip__name">{{ row.def.name }}</span>
          <span class="producer-tooltip__count">{{ format(row.count.value, 0) }} owned</span>
        </div>

        <ChainBreakdown
          title="Rate each"
          :modifier="row.rateChain"
          :base="row.def.baseRate"
          unit=" /sec"
        />

        <dl class="producer-tooltip__stats">
          <div class="producer-tooltip__stat">
            <dt>Contributes</dt>
            <dd>
              {{ format(contribution, 2) }} /sec
              <span class="producer-tooltip__muted">
                ({{ formatPercent(contributionPct, 1) }})
              </span>
            </dd>
          </div>
          <div
            v-if="beatFinite"
            class="producer-tooltip__stat"
          >
            <dt>Pays off in</dt>
            <dd>{{ formatPurchaseBeat(row.beatSeconds.value) }}</dd>
          </div>
          <div
            v-if="pendingIsPositive"
            class="producer-tooltip__stat producer-tooltip__stat--marginal"
          >
            <dt>Next purchase</dt>
            <dd>
              +{{ formatWhole(pendingAmount) }} · +{{ format(marginalDelta, 2) }} /sec
              <span class="producer-tooltip__muted"> ({{ formatPercent(marginalPct, 1) }}) </span>
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </RichTooltip>
</template>

<style scoped>
.producer-tooltip {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-width: 260px;
}

.producer-tooltip__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.producer-tooltip__count {
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.producer-tooltip__stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.producer-tooltip__stat {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-size: 0.9em;
}

.producer-tooltip__stat dt {
  color: var(--color-text-muted);
}

.producer-tooltip__stat dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.producer-tooltip__stat--marginal dd {
  color: var(--color-success, var(--color-primary));
  font-weight: 600;
}

.producer-tooltip__muted {
  color: var(--color-text-muted);
  font-weight: 400;
  margin-left: 4px;
}
</style>
