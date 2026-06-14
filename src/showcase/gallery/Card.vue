<!--
  Gallery card — first prose paragraph + primitive count + shell label.
  No live thumbnails: live mounts would multiply tickers and create
  persistence collisions per card.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { ArchetypeManifest } from '@/types';
import Button from '@/ui/components/Button.vue';
import { resolveShellComponent } from './useArchetypes';
import { loadArchetypeOverview } from './useArchetypeOverviews';

const props = defineProps<{
  manifest: ArchetypeManifest;
}>();

defineEmits<{
  enter: [];
}>();

const primitiveCount = computed(() => props.manifest.primitives.length);
const shellResolved = computed(() => resolveShellComponent(props.manifest.shell) !== undefined);
const previewLine = computed(() => {
  const md = loadArchetypeOverview(props.manifest.id);
  if (!md) return '';
  return md.split(/\n\s*\n/, 1)[0].trim();
});
</script>

<template>
  <Button
    class="card"
    type="button"
    @click="$emit('enter')"
  >
    <header class="card__header">
      <h3 class="card__title">
        {{ manifest.name }}
      </h3>
    </header>
    <p class="card__pitch">
      {{ previewLine }}
    </p>
    <footer class="card__meta">
      <span>{{ primitiveCount }} engine primitives</span>
      <span class="card__shell">
        Shell:
        <code>{{ manifest.shell }}</code>
        <span
          v-if="!shellResolved"
          class="badge"
          title="Archetype-local shell not in src/lib/shells/"
        >
          declared invention
        </span>
      </span>
    </footer>
  </Button>
</template>

<style>
.card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
}
.card:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
}
.card__title {
  font-size: 1.1rem;
}
.card__pitch {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  gap: 0.6rem;
  flex-wrap: wrap;
}
.card__shell {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}
</style>
