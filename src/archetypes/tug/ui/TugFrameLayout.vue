<script setup lang="ts">
/**
 * Three-region desktop grid for the Tug skeleton — declared invention per
 * OL-703 leaf-1 decision 10. Layout structure:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ lane (full-width, ~30% height)               │
 *   ├──────────────────┬─────────────┬─────────────┤
 *   │ shop             │ matrix      │ stats       │
 *   │ (player units)   │ (counter    │ (fortress   │
 *   │                  │  matrix)    │  bars +     │
 *   │                  │             │  match)     │
 *   ├──────────────────┴─────────────┤             │
 *   │ income (full-width below grid) │             │
 *   └────────────────────────────────┴─────────────┘
 *
 * Inline under archetype rather than `src/lib/shells/` because Tug is the
 * only consumer (N=1). Graduation to a `LaneHudShell` would happen once a
 * second Tug-shape consumer converges. Forks customize freely.
 */
</script>

<template>
  <div class="tug-frame">
    <section class="tug-frame__lane">
      <slot name="lane" />
    </section>
    <section class="tug-frame__shop">
      <slot name="shop" />
    </section>
    <section class="tug-frame__matrix">
      <slot name="matrix" />
    </section>
    <section class="tug-frame__stats">
      <slot name="stats" />
    </section>
    <section class="tug-frame__income">
      <slot name="income" />
    </section>
  </div>
</template>

<style scoped>
.tug-frame {
  flex: 1 1 auto;
  display: grid;
  grid-template-areas:
    'lane lane lane'
    'shop matrix stats'
    'income income stats';
  grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr);
  grid-template-rows: minmax(180px, 30vh) minmax(0, 1fr) auto;
  gap: var(--gap);
  padding: var(--gap);
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.tug-frame__lane {
  grid-area: lane;
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.tug-frame__shop {
  grid-area: shop;
  min-width: 0;
  overflow: auto;
}

.tug-frame__matrix {
  grid-area: matrix;
  min-width: 0;
  overflow: auto;
}

.tug-frame__stats {
  grid-area: stats;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.tug-frame__income {
  grid-area: income;
  min-width: 0;
}

/* Below 900px, collapse to a single column so a narrow window stays usable.
   Mobile-first declared-invention is fork-extension territory (per OL-703
   decision 11) — this is just a "don't crash on a smaller window" floor. */
@media (max-width: 900px) {
  .tug-frame {
    grid-template-areas:
      'lane'
      'stats'
      'shop'
      'matrix'
      'income';
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
  }
}
</style>
