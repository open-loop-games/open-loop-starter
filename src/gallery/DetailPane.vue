<!--
  Gallery detail pane — manifest fields rendered as structured data.

  `path` fields are rendered as plain monospace text (no link affordance):
  the dev-time monorepo-relative paths don't yet have a hosted-URL
  contract, so inline code is honest and forward-compatible.
-->
<script setup lang="ts">
import type { ArchetypeManifest } from '@/types';

defineProps<{
  manifest: ArchetypeManifest;
}>();
</script>

<template>
  <div class="detail">
    <header class="detail__header">
      <h2>{{ manifest.name }}</h2>
      <span
        class="detail__status"
        :data-status="manifest.status"
      >{{ manifest.status }}</span>
    </header>
    <p class="detail__pitch">
      {{ manifest.pitch }}
    </p>

    <section class="detail__section">
      <h3>Required patterns</h3>
      <ul class="reflist">
        <li
          v-for="p in manifest.patterns.required"
          :key="p.label"
        >
          <span
            class="chip"
            :data-tier="p.tier"
          >{{ p.tier.replace(/^tier-/, 't') }}</span>
          <strong>{{ p.label }}</strong>
          <code class="path">{{ p.path }}</code>
        </li>
      </ul>
    </section>

    <section class="detail__section">
      <h3>Cross-pattern properties</h3>
      <ul class="reflist">
        <li
          v-for="p in manifest.patterns.crossProperties"
          :key="p.label"
        >
          <strong>{{ p.label }}</strong>
          <code class="path">{{ p.path }}</code>
        </li>
      </ul>
    </section>

    <section
      v-if="manifest.patterns.optional && manifest.patterns.optional.length"
      class="detail__section"
    >
      <h3>Optional patterns</h3>
      <ul class="reflist">
        <li
          v-for="p in manifest.patterns.optional"
          :key="p.label"
        >
          <span
            class="chip"
            :data-tier="p.tier"
          >{{ p.tier.replace(/^tier-/, 't') }}</span>
          <strong>{{ p.label }}</strong>
          <code class="path">{{ p.path }}</code>
        </li>
      </ul>
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

    <section class="detail__section">
      <h3>Themes</h3>
      <ul class="theme-list">
        <li
          v-for="t in manifest.themes"
          :key="t.name"
        >
          {{ t.name }}
          <span
            v-if="t.isDefault"
            class="badge badge-primary"
          >default</span>
          <span
            class="chip"
            :data-status="t.status"
          >{{ t.status }}</span>
        </li>
      </ul>
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
.detail__status {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.detail__status[data-status='canonical'] {
  color: var(--color-primary);
}
.detail__pitch {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
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
.theme-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  font-size: 0.9rem;
}
.theme-list li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 4px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}
.chip[data-status='spec-only'] {
  background: var(--color-badge);
  color: var(--color-text-muted);
  font-size: 0.7rem;
}
.chip[data-layer='primitives'] {
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-badge));
}
.chip[data-layer='harness'] {
  background: color-mix(in srgb, var(--color-danger) 12%, var(--color-badge));
}
</style>
