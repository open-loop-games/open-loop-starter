<!--
  UpgradeGrid — panel-level composition over a grid of one-time upgrade
  cards (AD upgrades, Cookie tray, Synergism cubes). Engine-bridged via
  UpgradeCardData. Reveal mode picks Tooltip / Popover / inline; the reveal
  wrapper sits above the card, so a `#card` override still gets the
  tooltip/popover wrapping. Use `#reveal-content` to customise the
  tooltip/popover body. `#empty` draws while no card is shown; a game that
  hides a whole block on that reads `readShownCards`.

  Costume classes (stable API) — reskin via `:deep(.upgrade-grid__…)`.
  A class says `cell` where the contract says card. Renames are breaking:
    .upgrade-grid            root grid (+ inline grid-template-columns)
    .upgrade-grid__cell-wrap the reveal wrapper around each card
    .upgrade-grid__cell      one card (+ [data-locked] while prerequisites are unmet)
    .upgrade-grid__cell-unmet  the unmet prerequisites, in place of the button
    .upgrade-grid__empty     the `#empty` slot's box, while no card is shown
  (Panel compositions expose bare BEM classes; widgets under src/ui/components
  expose `olui-` classes. Both stable.)
-->
<script setup lang="ts" generic="C extends UpgradeCardData<unknown>">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import Popover from '@/ui/components/Popover.vue';
import { readShownCards, type PurchasedState, type UpgradeCardData } from './UpgradeGrid';

type Reveal = 'inline' | 'tooltip' | 'popover';

const props = withDefaults(
  defineProps<{
    cards: C[];
    columns?: number;
    reveal?: Reveal;
    purchasedState?: PurchasedState;
    showFormula?: boolean;
  }>(),
  {
    columns: 1,
    reveal: 'tooltip',
    purchasedState: 'greyed',
    showFormula: false,
  },
);

defineSlots<{
  card?: (props: { card: C; idx: number; description: string }) => unknown;
  'reveal-content'?: (props: { card: C; description: string }) => unknown;
  empty?: () => unknown;
}>();

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
}));

const visibleCards = computed(() => readShownCards(props.cards, props.purchasedState));

function unmetOf(card: C): string[] {
  return card.unmet?.value ?? [];
}

function describe(card: C): string {
  return typeof card.description === 'function' ? card.description() : card.description;
}
</script>

<template>
  <div class="upgrade-grid" :style="gridStyle">
    <div
      v-for="(card, idx) in visibleCards"
      :key="card.id"
      class="upgrade-grid__cell-wrap"
      :style="card.position !== undefined ? { order: card.position } : undefined"
    >
      <Tooltip v-if="reveal === 'tooltip'">
        <slot
          v-if="$slots.card"
          name="card"
          :card="card"
          :idx="idx"
          :description="describe(card)"
        />
        <div
          v-else
          class="upgrade-grid__cell"
          :data-bought="card.owned.value"
          :data-locked="unmetOf(card).length > 0 || undefined"
        >
          <div class="upgrade-grid__cell-head">
            <span class="upgrade-grid__cell-pos">#{{ card.position ?? idx + 1 }}</span>
            <strong>{{ card.displayName }}</strong>
          </div>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="card.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Purchased</span
            >
            <span v-else-if="card.owned.value" class="upgrade-grid__bought">Purchased</span>
            <span v-else-if="unmetOf(card).length" class="upgrade-grid__cell-unmet">
              {{ unmetOf(card).join(' · ') }}
            </span>
            <Button
              v-else
              :disabled="!card.canPurchase.value"
              :data-testid="`purchase-${card.id}`"
              @click="card.purchase()"
            >
              {{ format(card.cost.value, 0) }} {{ card.costLabel }}
            </Button>
          </div>
        </div>
        <template #content>
          <slot
            v-if="$slots['reveal-content']"
            name="reveal-content"
            :card="card"
            :description="describe(card)"
          />
          <template v-else>
            <p class="upgrade-grid__cell-desc">
              {{ describe(card) }}
            </p>
            <p v-if="showFormula && card.formula" class="upgrade-grid__cell-formula">
              {{ card.formula() }}
            </p>
          </template>
        </template>
      </Tooltip>
      <Popover v-else-if="reveal === 'popover'">
        <template #trigger>
          <slot
            v-if="$slots.card"
            name="card"
            :card="card"
            :idx="idx"
            :description="describe(card)"
          />
          <div
            v-else
            class="upgrade-grid__cell"
            :data-bought="card.owned.value"
            :data-locked="unmetOf(card).length > 0 || undefined"
          >
            <div class="upgrade-grid__cell-head">
              <span class="upgrade-grid__cell-pos">#{{ card.position ?? idx + 1 }}</span>
              <strong>{{ card.displayName }}</strong>
            </div>
          </div>
        </template>
        <slot
          v-if="$slots['reveal-content']"
          name="reveal-content"
          :card="card"
          :description="describe(card)"
        />
        <template v-else>
          <p class="upgrade-grid__cell-desc">
            {{ describe(card) }}
          </p>
          <p v-if="showFormula && card.formula" class="upgrade-grid__cell-formula">
            {{ card.formula() }}
          </p>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="card.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Purchased</span
            >
            <span v-else-if="card.owned.value" class="upgrade-grid__bought">Purchased</span>
            <span v-else-if="unmetOf(card).length" class="upgrade-grid__cell-unmet">
              {{ unmetOf(card).join(' · ') }}
            </span>
            <Button
              v-else
              :disabled="!card.canPurchase.value"
              :data-testid="`purchase-${card.id}`"
              @click="card.purchase()"
            >
              {{ format(card.cost.value, 0) }} {{ card.costLabel }}
            </Button>
          </div>
        </template>
      </Popover>
      <template v-else>
        <slot
          v-if="$slots.card"
          name="card"
          :card="card"
          :idx="idx"
          :description="describe(card)"
        />
        <div
          v-else
          class="upgrade-grid__cell"
          :data-bought="card.owned.value"
          :data-locked="unmetOf(card).length > 0 || undefined"
        >
          <div class="upgrade-grid__cell-head">
            <span class="upgrade-grid__cell-pos">#{{ card.position ?? idx + 1 }}</span>
            <strong>{{ card.displayName }}</strong>
          </div>
          <p class="upgrade-grid__cell-desc">
            {{ describe(card) }}
          </p>
          <p v-if="showFormula && card.formula" class="upgrade-grid__cell-formula">
            {{ card.formula() }}
          </p>
          <div class="upgrade-grid__cell-action">
            <span
              v-if="card.owned.value && purchasedState === 'checkmark'"
              class="upgrade-grid__bought"
              >✓ Purchased</span
            >
            <span v-else-if="card.owned.value" class="upgrade-grid__bought">Purchased</span>
            <span v-else-if="unmetOf(card).length" class="upgrade-grid__cell-unmet">
              {{ unmetOf(card).join(' · ') }}
            </span>
            <Button
              v-else
              :disabled="!card.canPurchase.value"
              :data-testid="`purchase-${card.id}`"
              @click="card.purchase()"
            >
              {{ format(card.cost.value, 0) }} {{ card.costLabel }}
            </Button>
          </div>
        </div>
      </template>
    </div>
    <div v-if="visibleCards.length === 0 && $slots.empty" class="upgrade-grid__empty">
      <slot name="empty" />
    </div>
  </div>
</template>

<style>
.upgrade-grid {
  display: grid;
  gap: var(--gap-sm);
}
.upgrade-grid__cell {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.upgrade-grid__cell[data-bought='true'] {
  background: var(--color-bg);
  opacity: 0.85;
  border-color: var(--color-accent, var(--color-border));
}
.upgrade-grid__cell-head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-xs);
}
.upgrade-grid__cell-pos {
  font-size: 0.7em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.upgrade-grid__cell-desc {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.upgrade-grid__cell-formula {
  margin: 0;
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.upgrade-grid__bought {
  font-weight: 600;
  font-size: 0.85em;
  color: var(--color-accent, var(--color-text));
}

.upgrade-grid__empty {
  grid-column: 1 / -1;
}

.upgrade-grid__cell-unmet {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
</style>
