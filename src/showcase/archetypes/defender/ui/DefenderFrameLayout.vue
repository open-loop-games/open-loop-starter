<script setup lang="ts">
/**
 * Layout grid for the Defender skeleton. Three regions:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ status  (cash / lives / round + start btn)  │
 *   ├─────────────────────────────────┬───────────┤
 *   │ map (SVG canvas — path,         │ shop      │
 *   │      towers, bloons, hover)     │ (4 tower  │
 *   │                                 │  buttons) │
 *   └─────────────────────────────────┴───────────┘
 *
 * Inline under archetype rather than `src/lib/shells/` because Defender is the
 * only consumer (N=1). Graduation to a `TowerHudShell` happens once a second
 * tower-defense-shape consumer converges (Defender-Packer hybrid, future arc).
 */
</script>

<template>
  <div class="defender-frame">
    <section class="defender-frame__status">
      <slot name="status" />
    </section>
    <section class="defender-frame__map">
      <slot name="map" />
    </section>
    <section class="defender-frame__shop">
      <slot name="shop" />
    </section>
  </div>
</template>

<style scoped>
.defender-frame {
  flex: 1 1 auto;
  display: grid;
  grid-template-areas:
    'status status'
    'map shop';
  grid-template-columns: minmax(0, 1fr) 240px;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--gap);
  padding: var(--gap);
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.defender-frame__status {
  grid-area: status;
  min-width: 0;
}

.defender-frame__map {
  grid-area: map;
  min-width: 0;
  min-height: 0;
  display: flex;
}

.defender-frame__shop {
  grid-area: shop;
  min-width: 0;
  overflow: auto;
}

@media (max-width: 900px) {
  .defender-frame {
    grid-template-areas:
      'status'
      'shop'
      'map';
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(280px, 1fr);
  }
}
</style>
