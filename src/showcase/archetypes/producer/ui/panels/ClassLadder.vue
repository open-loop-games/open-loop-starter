<!--
  ClassLadder — the ladder, rendered through the `ProducerList` battery.

  Adopts the contract and overrides the renderer via `#row`. That is the
  composition's documented first seam (`.claude/CLAUDE.md` § src/ui/compositions):
  the flat `ProducerRowData` cannot hold a `ModifierChain`, and it should not
  grow one for producer's sake, so the chain rides `extra` and is read back
  typed here.

  What the override gives, and why the default renderer was not enough:
    · the rung numeral, which is the drawing's item number
    · a RichTooltip carrying `ChainBreakdown` — the four chains as a product,
      which IDENTITY names as the archetype's long-term pull. Hover the row,
      not the button, so the reading is available while deciding.
  Everything behavioural — bulk resolution, cost, affordability, the purchase call —
  still comes from the composition. This is a costume + one added surface, not
  a fork of the widget.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';
import { ProducerList } from '@/ui/compositions';
import Button from '@/ui/components/Button.vue';
import RichTooltip from '@/ui/components/RichTooltip.vue';
import ChainBreakdown from '@/ui/components/ChainBreakdown.vue';
import type { ClassRow, ClassRowExtra } from '../../composables/useClassRows';

const props = defineProps<{
  rows: ClassRow[];
  totalRate: DecimalSource;
}>();

/** Share of the total rate, for the tooltip's context line. */
function contribution(row: ClassRow): string {
  const total = Decimal.fromValue(props.totalRate);
  if (!total.gt(0)) return '—';
  return `${Decimal.mul(row.displayRate.value, 100).div(total).toFixed(1)}% of production`;
}

function extraOf(row: ClassRow): ClassRowExtra {
  // `extra` is optional on the contract but always supplied by
  // `useClassRows`; the cast keeps the template free of guards.
  return row.extra as ClassRowExtra;
}

const costLabel = computed(() => 'mass');
</script>

<template>
  <ProducerList
    class="ladder"
    :rows="rows"
    :cost-label="costLabel"
    bulk-mode-source="global"
    density="row"
  >
    <template #row="{ row, pendingCount, pendingCost, purchase }">
      <RichTooltip side="right" :side-offset="10">
        <div class="ladder__row" :data-afford="row.canPurchase(pendingCount)">
          <span class="ladder__tier">{{ extraOf(row).rung }}</span>
          <span class="ladder__id">
            <span class="ladder__name">{{ row.displayName }}</span>
            <span class="ladder__desc">{{ extraOf(row).def.description }}</span>
          </span>
          <span class="ladder__owned">{{ formatWhole(row.count.value) }}</span>
          <span class="ladder__rate">
            {{ Decimal.gt(row.count.value, 0) ? `+${format(row.displayRate.value, 2)}/s` : '—' }}
          </span>
          <Button
            :disabled="!row.canPurchase(pendingCount)"
            :data-testid="`purchase-${row.id}`"
            @click="purchase()"
          >
            {{ format(pendingCost, 0) }}
          </Button>
        </div>

        <template #content>
          <ChainBreakdown
            :title="`${row.displayName} — output per unit`"
            :modifier="extraOf(row).producer.rateChain"
            :base="extraOf(row).def.baseRate"
            base-text="Base rate"
            unit="/s"
          />
          <p class="ladder__tip-foot">
            {{ formatWhole(row.count.value) }} deployed ·
            {{ contribution(row) }}
          </p>
        </template>
      </RichTooltip>
    </template>
  </ProducerList>
</template>

<style scoped>
.ladder__row {
  display: grid;
  grid-template-columns: 26px 1fr auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  width: 100%;
}
.ladder__tier {
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.ladder__id {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ladder__name {
  font-weight: 600;
}
.ladder__desc {
  font-size: 10px;
  opacity: 0.55;
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ladder__owned {
  font-variant-numeric: tabular-nums;
  min-width: 3ch;
  text-align: right;
}
.ladder__rate {
  font-variant-numeric: tabular-nums;
  min-width: 9ch;
  text-align: right;
  font-size: 11px;
}
.ladder__tip-foot {
  margin: 8px 0 0;
  font-size: 10.5px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
</style>
