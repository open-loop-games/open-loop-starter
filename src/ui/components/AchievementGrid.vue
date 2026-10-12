<!--
  AchievementGrid — content-only grid of achievement cards. Push
  this through `useModalStack` (see SavePanel / SettingsPanel for the
  pattern); ModalStack wraps it in reka-ui DialogRoot/Portal/Overlay/Content
  with focus trap, ESC, and a11y. Do NOT add own modal chrome.

  Slot scope:
    - `summary({ earnedCount, total, fillPct })` — replace the default
      "X / Y earned" header, e.g. with a progress bar.
    - `card({ card })` — replace the per-card visual.

  Default card shape is `AchievementCard`; data hooks (`data-earned`,
  `data-hidden-cell`) carry through so theme CSS can target without
  re-deriving. Classes and data attributes say `cell` where the contract
  says card; they are stable, so renames are breaking.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle } from 'reka-ui';
import PanelLayout from './PanelLayout.vue';

export interface AchievementCard {
  id: string;
  displayName: string;
  description: string;
  earned: boolean;
  hidden?: boolean;
}

const props = defineProps<{
  title: string;
  cards: AchievementCard[];
}>();

defineEmits<{ close: [] }>();

const earnedCount = computed(() => props.cards.filter((c) => c.earned).length);
const total = computed(() => props.cards.length);
const fillPct = computed(() => (total.value === 0 ? 0 : (earnedCount.value / total.value) * 100));
</script>

<template>
  <PanelLayout class="olui-achievement-grid" @close="$emit('close')">
    <template #header>
      <DialogTitle as-child>
        <h3 class="olui-panel__title">
          {{ title }}
        </h3>
      </DialogTitle>
    </template>

    <slot name="summary" :earned-count="earnedCount" :total="total" :fill-pct="fillPct">
      <div class="olui-achievement-grid__summary">{{ earnedCount }} / {{ total }} earned</div>
    </slot>

    <ul class="olui-achievement-grid__cells">
      <li
        v-for="card in cards"
        :key="card.id"
        class="olui-achievement-grid__cell"
        :data-earned="card.earned ? 'true' : 'false'"
        :data-hidden-cell="card.hidden ? 'true' : 'false'"
        :data-testid="`achievement-${card.id}`"
      >
        <slot name="card" :card="card">
          <div class="olui-achievement-grid__cell-name">
            {{ card.displayName }}
          </div>
          <div class="olui-achievement-grid__cell-desc">
            {{ card.description }}
          </div>
        </slot>
      </li>
    </ul>
  </PanelLayout>
</template>

<style scoped>
.olui-achievement-grid__summary {
  margin-bottom: var(--gap);
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.olui-achievement-grid__cells {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--gap-sm);
}

.olui-achievement-grid__cell {
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-height: 66px;
}

.olui-achievement-grid__cell[data-earned='true'] {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.olui-achievement-grid__cell-name {
  font-weight: 600;
  font-size: 0.9em;
  margin-bottom: 2px;
}

.olui-achievement-grid__cell-desc {
  font-size: 0.78em;
  color: var(--color-text-muted);
}
</style>
