<script setup lang="ts">
import { computed } from 'vue';
import { useFormatting } from '@/composables/useFormatting';
import { useCapabilities } from '../../composables/useCapabilities';
import { useArc } from '../../composables/useArc';

const capabilities = useCapabilities();
const arc = useArc();
const { format } = useFormatting();

const averageTalent = computed(() => arc.averageTalentMultiplier.value);
</script>

<template>
  <section
    class="capabilities-panel"
    data-testid="capabilities-panel"
  >
    <header class="capabilities-panel__header">
      <h3>Capabilities</h3>
      <span class="capabilities-panel__retention">
        avg ×<strong data-testid="avg-talent">{{ averageTalent.toFixed(3) }}</strong>
      </span>
    </header>

    <ul class="capabilities-list">
      <li
        v-for="row in capabilities"
        :key="row.def.id"
        class="capabilities-list__item"
        :data-testid="`capability-${row.def.id}`"
      >
        <header class="capabilities-list__head">
          <span class="capabilities-list__name">{{ row.def.name }}</span>
          <span class="capabilities-list__multiplier">
            ×{{ format(row.talentMultiplier.value, 2) }}
          </span>
        </header>
        <div class="capabilities-list__levels">
          <span class="capabilities-list__tier">
            <span class="capabilities-list__tier-label">level</span>
            <span
              class="capabilities-list__tier-value"
              :data-testid="`capability-level-level-${row.def.id}`"
            >{{ format(row.levelLevel.value, 0) }}</span>
          </span>
          <span class="capabilities-list__tier capabilities-list__tier--talent">
            <span class="capabilities-list__tier-label">talent</span>
            <span
              class="capabilities-list__tier-value"
              :data-testid="`capability-talent-level-${row.def.id}`"
            >{{ format(row.talentLevel.value, 0) }}</span>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.capabilities-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}

.capabilities-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.capabilities-panel__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.capabilities-panel__retention {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.capabilities-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.capabilities-list__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.capabilities-list__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.capabilities-list__name {
  font-weight: 600;
}

.capabilities-list__multiplier {
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.capabilities-list__levels {
  display: flex;
  gap: var(--gap);
  font-size: 0.85em;
}

.capabilities-list__tier {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.capabilities-list__tier-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.78em;
}

.capabilities-list__tier-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.capabilities-list__tier--talent .capabilities-list__tier-value {
  color: var(--color-primary);
}
</style>
