<!--
  Producer autobuyer toggle panel. Renders one Button row per autobuyer that
  has reached its unlock milestone; locked autobuyers are hidden until they
  unlock. Producer is single-category (producers + upgrades both ship
  unlocked from start), so the panel renders all rows flat.

  Master kill-switch lives in the producer app root header — single global
  on/off applies across the registry.
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
    class="producer-autobuyer-toggles"
  >
    <h4 class="producer-autobuyer-toggles__title">
      Automation
    </h4>
    <div class="producer-autobuyer-toggles__list">
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
.producer-autobuyer-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-panel);
}
.producer-autobuyer-toggles__title {
  margin: 0;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-fg-muted);
}
.producer-autobuyer-toggles__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.producer-autobuyer-toggles__list :deep(.is-active) {
  border-color: var(--color-accent);
}
</style>
