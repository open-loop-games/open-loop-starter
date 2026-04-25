<script setup lang="ts">
import { computed } from 'vue';
import { useUnlocks } from '../../composables/useUnlocks';
import { useAmbientData } from '../../composables/useAmbientData';

const unlocks = useUnlocks();
const data = useAmbientData();

interface Cell {
  id: string;
  label: string;
  earned: boolean;
}

const cells = computed<Cell[]>(() =>
  data.unlocks.map((def) => {
    const purchasable = unlocks.getPurchasable(def.id);
    const earned = purchasable?.bought.value === true;
    return {
      id: def.id,
      label: earned ? def.label : '?',
      earned,
    };
  }),
);

const earnedCount = computed(() => cells.value.filter((c) => c.earned).length);
</script>

<template>
  <section class="unlock-tray">
    <h3 class="panel-title">
      Discoveries · {{ earnedCount }} / {{ cells.length }}
    </h3>
    <ul class="cells">
      <li
        v-for="c in cells"
        :key="c.id"
        class="cell"
        :data-earned="c.earned ? 'true' : 'false'"
        :data-testid="`unlock-${c.id}`"
      >
        {{ c.label }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.unlock-tray {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.panel-title {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}

.cells {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--gap-sm);
}

.cell {
  padding: 6px 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.82em;
  text-align: center;
  color: var(--color-text-muted);
}

.cell[data-earned='true'] {
  color: var(--color-text);
  border-color: var(--color-primary);
  background: var(--color-surface);
}
</style>
