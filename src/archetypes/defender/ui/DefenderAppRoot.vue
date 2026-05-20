<template>
  <div class="defender-app">
    <h1>Defender — Bloons</h1>
    <p class="status">
      Phase 1 scaffold. Module bodies (map / towers / bloons / round) are stubbed; UI lands in Phase
      4 of OL-1021.
    </p>
    <p class="exemplar">
      First-arc port from Bloons TD 1 (2007). Source-of-truth:
      <code>open-loop-research/reference-code/bloons-td-1/</code>.
    </p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.defender-app {
  padding: var(--gap-lg);
  color: var(--color-fg);
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.status {
  margin: 0;
  color: var(--color-fg-muted, var(--color-fg));
}

.exemplar code {
  font-family: var(--font-mono);
}
</style>
