<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';
import { useFormatting } from '@/composables/useFormatting';
import type { AutoProducerRow } from '../../composables/useAutoProducers';

const props = defineProps<{
  row: AutoProducerRow;
  /** Total per-second rate across the whole garden (for contribution %). */
  totalRate: DecimalSource;
}>();

const { format, formatPurchaseBeat, formatPercent } = useFormatting();

const contribution = computed(() => Decimal.mul(props.row.rate.value, props.row.count.value));

const contributionPct = computed(() => {
  const total = Decimal.fromValue(props.totalRate);
  if (!total.gt(0)) return 0;
  return contribution.value.div(total).toNumber();
});

const beatFinite = computed(() => Number.isFinite(props.row.beatSeconds.value));
const nextCost = computed(() => props.row.getCost(1));
const nextDelta = computed(() => props.row.rate.value);
</script>

<template>
  <RichTooltip
    :open-delay="250"
    :close-delay="100"
    side="right"
  >
    <slot />
    <template #content>
      <div class="auto-producer-tooltip">
        <div class="auto-producer-tooltip__head">
          <span class="auto-producer-tooltip__name">{{ row.def.name }}</span>
          <span class="auto-producer-tooltip__count">{{ format(row.count.value, 0) }} owned</span>
        </div>

        <ChainBreakdown
          title="Rate each"
          :modifier="row.rateChain"
          :base="row.def.baseRate"
          unit=" /sec"
        />

        <dl class="auto-producer-tooltip__stats">
          <div class="auto-producer-tooltip__stat">
            <dt>Contributes</dt>
            <dd>
              {{ format(contribution, 2) }} /sec
              <span class="auto-producer-tooltip__muted">
                ({{ formatPercent(contributionPct, 1) }})
              </span>
            </dd>
          </div>
          <div
            v-if="beatFinite"
            class="auto-producer-tooltip__stat"
          >
            <dt>Pays off in</dt>
            <dd>{{ formatPurchaseBeat(row.beatSeconds.value) }}</dd>
          </div>
          <div class="auto-producer-tooltip__stat auto-producer-tooltip__stat--marginal">
            <dt>Next purchase</dt>
            <dd>+{{ format(nextDelta, 2) }} /sec · {{ format(nextCost, 0) }} sprouts</dd>
          </div>
        </dl>
      </div>
    </template>
  </RichTooltip>
</template>

<style scoped>
.auto-producer-tooltip {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-width: 260px;
}

.auto-producer-tooltip__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.auto-producer-tooltip__count {
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.auto-producer-tooltip__stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.auto-producer-tooltip__stat {
  display: flex;
  justify-content: space-between;
  gap: var(--gap-sm);
  font-size: 0.9em;
}

.auto-producer-tooltip__stat dt {
  color: var(--color-text-muted);
}

.auto-producer-tooltip__stat dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.auto-producer-tooltip__stat--marginal dd {
  color: var(--color-success, var(--color-primary));
  font-weight: 600;
}

.auto-producer-tooltip__muted {
  color: var(--color-text-muted);
  font-weight: 400;
  margin-left: 4px;
}
</style>
