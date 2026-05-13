<!--
  Gallery detail pane — manifest fields rendered as structured data.

  `path` fields are rendered as plain monospace text (no link affordance):
  the dev-time monorepo-relative paths don't yet have a hosted-URL
  contract, so inline code is honest and forward-compatible.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { ArchetypeManifest } from '@/types';
import MarkdownDoc from './MarkdownDoc.vue';
import { loadArchetypeOverview } from './useArchetypeOverviews';

const props = defineProps<{
  manifest: ArchetypeManifest;
}>();

const overview = computed(() => loadArchetypeOverview(props.manifest.id));
</script>

<template>
  <div class="detail">
    <header class="detail__header">
      <h2>{{ manifest.name }}</h2>
    </header>

    <section
      v-if="overview"
      class="detail__section"
    >
      <MarkdownDoc :source="overview" />
    </section>

    <section class="detail__section">
      <h3>Engine primitives ({{ manifest.primitives.length }})</h3>
      <table class="prim-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Layer</th>
            <th>Path</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="prim in manifest.primitives"
            :key="prim.name"
          >
            <td>
              <code>{{ prim.name }}</code>
            </td>
            <td>
              <span
                class="chip"
                :data-layer="prim.layer"
              >{{ prim.layer }}</span>
            </td>
            <td>
              <code class="path">{{ prim.path }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="detail__section">
      <h3>Beats</h3>
      <ol class="beats">
        <li
          v-for="beat in manifest.beats"
          :key="beat.n"
        >
          <strong>{{ beat.n }}.</strong> {{ beat.label }}
          <span class="beat-window">
            ({{ beat.targetSimRange[0] }}–{{ beat.targetSimRange[1] }}s)
          </span>
        </li>
      </ol>
    </section>

    <section
      v-if="manifest.exemplars && manifest.exemplars.length"
      class="detail__section"
    >
      <h3>Exemplars</h3>
      <ul class="reflist">
        <li
          v-for="ex in manifest.exemplars"
          :key="ex.title"
        >
          <strong>{{ ex.title }}</strong>
          <code class="path">{{ ex.analysisPath }}</code>
        </li>
      </ul>
    </section>
    <section
      v-else
      class="detail__section detail__section--note"
    >
      <em>Declared invention — no listed exemplars.</em>
    </section>
  </div>
</template>

<style>
.detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.detail__header {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
}
.detail__header h2 {
  font-size: 1.4rem;
}
.detail__section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.detail__section h3 {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.detail__section--note {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.reflist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.reflist li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.reflist .path {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.prim-table {
  border-collapse: collapse;
  font-size: 0.85rem;
}
.prim-table th,
.prim-table td {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  text-align: left;
}
.prim-table th {
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-weight: 600;
}
.prim-table .path {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.beats {
  font-size: 0.9rem;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.beat-window {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.chip[data-layer='primitives'] {
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-badge));
}
.chip[data-layer='harness'] {
  background: color-mix(in srgb, var(--color-danger) 12%, var(--color-badge));
}
</style>
