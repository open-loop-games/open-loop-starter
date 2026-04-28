<script setup lang="ts">
import { computed } from 'vue';
import { useFormatting } from '@/composables/useFormatting';
import { useSkills } from '../../composables/useSkills';
import { useArc } from '../../composables/useArc';

const skills = useSkills();
const arc = useArc();
const { format } = useFormatting();

const averageRetention = computed(() => arc.averageRetentionMultiplier.value);
</script>

<template>
  <section
    class="skills-panel"
    data-testid="skills-retention-panel"
  >
    <header class="skills-panel__header">
      <h3>Skills</h3>
      <span class="skills-panel__retention">
        avg ×<strong data-testid="avg-retention">{{ averageRetention.toFixed(3) }}</strong>
      </span>
    </header>

    <ul class="skills-list">
      <li
        v-for="row in skills"
        :key="row.def.id"
        class="skills-list__item"
        :data-testid="`skill-${row.def.id}`"
      >
        <header class="skills-list__head">
          <span class="skills-list__name">{{ row.def.name }}</span>
          <span class="skills-list__multiplier">
            ×{{ format(row.effectiveMultiplier.value, 2) }}
          </span>
        </header>
        <div class="skills-list__levels">
          <span class="skills-list__tier">
            <span class="skills-list__tier-label">gen</span>
            <span
              class="skills-list__tier-value"
              :data-testid="`skill-gen-level-${row.def.id}`"
            >{{
              format(row.genLevel.value, 0)
            }}</span>
          </span>
          <span class="skills-list__tier skills-list__tier--instinct">
            <span class="skills-list__tier-label">instinct</span>
            <span
              class="skills-list__tier-value"
              :data-testid="`skill-instinct-level-${row.def.id}`"
            >{{ format(row.instinctLevel.value, 0) }}</span>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.skills-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}

.skills-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.skills-panel__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.skills-panel__retention {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.skills-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.skills-list__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.skills-list__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.skills-list__name {
  font-weight: 600;
}

.skills-list__multiplier {
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.skills-list__levels {
  display: flex;
  gap: var(--gap);
  font-size: 0.85em;
}

.skills-list__tier {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.skills-list__tier-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.78em;
}

.skills-list__tier-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.skills-list__tier--instinct .skills-list__tier-value {
  color: var(--color-primary);
}
</style>
