<!--
  Ambient autobuyer toggle panel. Renders one Button row per autobuyer that
  has reached its unlock milestone; locked rows are hidden until unlocked.
  The slim port ships a single registered spec (producer auto-buy);
  visibility unlocks fire unconditionally and live outside the registry.

  Master kill-switch lives in the ambient app root header — the contract
  permits player choice over automation, just not over content reveals.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useAutobuyers } from '../../composables';

const autobuyers = useAutobuyers();
const rows = autobuyers.rows;

function toggle(id: string): void {
  const row = rows.value.find((r) => r.id === id);
  if (!row) return;
  row.isActive.value = !row.isActive.value;
}
</script>

<template>
  <div
    v-if="rows.length"
    class="ambient-autobuyer-toggles"
  >
    <h4 class="ambient-autobuyer-toggles__title">
      Tending
    </h4>
    <div class="ambient-autobuyer-toggles__list">
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
.ambient-autobuyer-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-panel);
}
.ambient-autobuyer-toggles__title {
  margin: 0;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-fg-muted);
}
.ambient-autobuyer-toggles__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.ambient-autobuyer-toggles__list :deep(.is-active) {
  border-color: var(--color-accent);
}
</style>
