<template>
  <div class="interlocker-app">
    <h1>Interlocker — Kittens</h1>
    <p class="status">
      Phase 1 scaffold. Module bodies (resources / buildings / village / workshop / sciences) are
      stubbed; UI lands in Phase 4 of OL-1056.
    </p>
    <p class="exemplar">
      First-arc port from Kittens Game (pre-paragon, through architecture + first megalith).
      Source-of-truth: <code>open-loop-research/reference-code/kittensgame/</code>.
    </p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.interlocker-app {
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
