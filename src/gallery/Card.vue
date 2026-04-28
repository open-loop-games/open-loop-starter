<!--
  Gallery card — pitch + pattern chips + primitive count + shell label.
  No live thumbnails (per OL-478 protocol point #2: live mounts would
  multiply tickers and create persistence collisions per card).
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { ArchetypeManifest } from '@/types';
import { resolveShellComponent } from './useArchetypes';

const props = defineProps<{
  manifest: ArchetypeManifest;
}>();

defineEmits<{
  enter: [];
}>();

const requiredChips = computed(() => props.manifest.patterns.required);
const primitiveCount = computed(() => props.manifest.primitives.length);
const shellResolved = computed(() => resolveShellComponent(props.manifest.shell) !== undefined);
</script>

<template>
  <button
    class="card"
    type="button"
    @click="$emit('enter')"
  >
    <header class="card__header">
      <h3 class="card__title">
        {{ manifest.name }}
      </h3>
      <span
        class="card__status"
        :data-status="manifest.status"
      >{{ manifest.status }}</span>
    </header>
    <p class="card__pitch">
      {{ manifest.pitch }}
    </p>
    <ul class="card__chips">
      <li
        v-for="p in requiredChips"
        :key="p.label"
        class="chip"
        :data-tier="p.tier"
      >
        {{ p.label }}
      </li>
    </ul>
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
  </button>
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
.card__status {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.card__status[data-status='canonical'] {
  color: var(--color-primary);
}
.card__pitch {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
}
.chip {
  font-size: 0.72rem;
  padding: 2px 8px;
  background: var(--color-badge);
  color: var(--color-text);
  border-radius: 999px;
}
.chip[data-tier='tier-0-universal'] {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-badge));
}
.chip[data-tier='tier-4-specialized'] {
  background: color-mix(in srgb, var(--color-danger) 18%, var(--color-badge));
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
