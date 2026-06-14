<!--
  ProducerTooltip — Paradox-style hover breakdown for a single producer row.
  Wraps the card body in a RichTooltip; content shows the modifier chain,
  payback period, current contribution, and the marginal impact of the
  pending purchase. Bakery-themed parchment surface.
-->
<script setup lang="ts">
import { type DecimalSource } from '@open-loop/engine';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useRateBreakdown } from '@/composables/useRateBreakdown';
import type { ProducerRow } from '../../composables/useProducers';

const props = defineProps<{
  row: ProducerRow;
  /** Total rate on this producer's resource (for contribution %). */
  totalRate: DecimalSource;
  /** How many the current bulk mode will actually purchase. */
  pendingAmount: DecimalSource;
}>();

const { format, formatPurchaseBeat, formatPercent, formatWhole } = useFormatting();

const { contribution, contributionPct, marginalDelta, marginalPct, pendingPositive, beatFinite } =
  useRateBreakdown(
    props.row,
    () => props.totalRate,
    () => props.pendingAmount,
  );
</script>

<template>
  <RichTooltip
    :open-delay="250"
    :close-delay="100"
    side="right"
  >
    <slot />
    <template #content>
      <div class="bakery-card">
        <div class="bakery-card__head">
          <span class="bakery-card__eyebrow">Station</span>
          <span class="bakery-card__name">{{ row.def.name }}</span>
          <span class="bakery-card__owned">
            <span class="bakery-card__owned-num">{{ format(row.count.value, 0) }}</span>
            <span class="bakery-card__owned-label">on staff</span>
          </span>
        </div>

        <ChainBreakdown
          title="Output each"
          :modifier="row.rateChain"
          :base="row.def.baseRate"
          unit=" /sec"
        />

        <dl class="bakery-card__stats">
          <div class="bakery-card__stat">
            <dt>Contributes</dt>
            <dd>
              <span>{{ format(contribution, 2) }} /sec</span>
              <span class="bakery-card__muted"> ({{ formatPercent(contributionPct, 1) }}) </span>
            </dd>
          </div>
          <div
            v-if="beatFinite"
            class="bakery-card__stat"
          >
            <dt>Pays off in</dt>
            <dd>{{ formatPurchaseBeat(row.beatSeconds.value) }}</dd>
          </div>
          <div
            v-if="pendingPositive"
            class="bakery-card__stat bakery-card__stat--marginal"
          >
            <dt>Next hire</dt>
            <dd>
              +{{ formatWhole(pendingAmount) }} &middot; +{{ format(marginalDelta, 2) }} /sec
              <span class="bakery-card__muted">({{ formatPercent(marginalPct, 1) }})</span>
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </RichTooltip>
</template>

<style scoped>
.bakery-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 280px;
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
}

.bakery-card__head {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.3));
}

.bakery-card__eyebrow {
  grid-column: 1;
  grid-row: 1;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 9,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.6em;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--bakery-brass, #b1782a);
}

.bakery-card__name {
  grid-column: 1;
  grid-row: 2;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 28,
    'SOFT' 100,
    'wght' 700;
  font-style: italic;
  font-size: 1.15em;
  color: var(--bakery-mahogany, #5a2f10);
  letter-spacing: 0.01em;
}

.bakery-card__owned {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: end;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.bakery-card__owned-num {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 700;
  font-size: 1.15em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--bakery-cocoa, #2d1d10);
}

.bakery-card__owned-label {
  font-style: italic;
  font-size: 0.75em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

.bakery-card__stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding-top: 4px;
  border-top: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
}

.bakery-card__stat {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: baseline;
  font-size: 0.88em;
}

.bakery-card__stat dt {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  white-space: nowrap;
}

.bakery-card__stat dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
}

.bakery-card__stat--marginal dd {
  color: var(--bakery-sage, #5d7a3a);
  font-weight: 700;
}

.bakery-card__muted {
  color: var(--bakery-cocoa-mute, #7a5d3d);
  font-weight: 400;
  font-style: italic;
  margin-left: 4px;
}
</style>
