<!--
  HudBar — flex row container for headline gameplay chips (resource
  totals, rate displays, auto-purchase toggles, etc.). Pair with HudChip for
  standard chip styling; bespoke content (e.g. a chip with an inlaid
  progress bar) slots in directly.
-->
<template>
  <header class="hud-bar">
    <slot />
  </header>
</template>

<style scoped>
.hud-bar {
  display: flex;
  gap: var(--gap-sm);
  align-items: center;
  flex-wrap: wrap;
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
</style>
