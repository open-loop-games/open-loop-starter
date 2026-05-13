<script setup lang="ts">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import { getOfferings, getAutobuyerToggles, getRuneDefs } from '../modules';
import RuneRow from './RuneRow.vue';

const offerings = getOfferings();
const toggles = getAutobuyerToggles();
const runeDefs = getRuneDefs();

const offeringsLabel = computed(() => format(offerings.value, 0));
</script>

<template>
  <div class="runes-panel">
    <header class="runes-panel__head">
      <h3>Runes</h3>
      <p>
        Sacrifice offerings to level runes. Rune effects compose into the coin rateChain — Speed,
        Duplication, and Prism contribute multiplicative grants while their level &gt; 0; Superior
        Intellect multiplies offerings gained on every prestige.
      </p>
      <p class="runes-panel__hint">
        Offerings: <strong>{{ offeringsLabel }}</strong>
      </p>
    </header>

    <section class="runes-panel__autobuyer">
      <label class="runes-panel__toggle">
        <input v-model="toggles.autoSacrifice.value" type="checkbox" />
        Auto-sacrifice (lowest-level rune each tick)
      </label>
    </section>

    <section class="runes-panel__rows">
      <RuneRow
        v-for="def in runeDefs"
        :key="def.id"
        :rune-id="def.id"
        :display-name="def.displayName"
      />
    </section>
  </div>
</template>

<style scoped>
.runes-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.runes-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.runes-panel__head p {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.runes-panel__hint {
  margin: 0;
  font-size: 0.85em;
}
.runes-panel__autobuyer {
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.runes-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
  font-size: 0.85em;
  cursor: pointer;
}
.runes-panel__rows {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>
