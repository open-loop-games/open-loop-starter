<!--
  Per-tier autobuyer toggle panel. Renders one Button row per autobuyer that
  has reached its unlock milestone; locked autobuyers are hidden until they
  unlock. Shared Button per CLAUDE.md (and per the user-memory rule against
  native <button>).

  Master kill-switch lives in the scaler app root (autobuyer-master),
  next to "Achievements" — single global on/off applies across all tiers.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useAutobuyers } from '../../composables';
import type { Tier } from '../../data/types';

const props = defineProps<{
  tier: Tier;
}>();

const autobuyers = useAutobuyers();
const rows = autobuyers.byTier(props.tier);

function toggle(id: string): void {
  const row = rows.value.find((r) => r.id === id);
  if (!row) return;
  row.isActive.value = !row.isActive.value;
}
</script>

<template>
  <div
    v-if="rows.length"
    class="scaler-autobuyer-toggles"
  >
    <h4 class="scaler-autobuyer-toggles__title">
      Automation
    </h4>
    <div class="scaler-autobuyer-toggles__list">
      <Button
        v-for="row in rows"
        v-show="row.isUnlocked.value"
        :key="row.id"
        class="btn-sm"
        :class="{
          'is-active': row.isActive.value,
        }"
        :title="row.displayName"
        @click="toggle(row.id)"
      >
        {{ row.isActive.value ? '☑' : '☐' }} {{ row.displayName }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.scaler-autobuyer-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-panel);
}
.scaler-autobuyer-toggles__title {
  margin: 0;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-fg-muted);
}
.scaler-autobuyer-toggles__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.scaler-autobuyer-toggles__list :deep(.is-active) {
  border-color: var(--color-accent);
}
</style>
