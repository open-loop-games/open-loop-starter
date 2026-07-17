<!--
  DefenseField — the combat volume: the sky (radar), the defended line, the board.
  The sky is a CSS radar backdrop with the pixi descending-warhead / Lance-beam
  CombatLayer mounted over it (studio/open-loop-starter#22 leaf 1). Warheads are
  cosmetic over the rate model — the field is fully playable without them, and the
  pixi canvas is pointer-transparent so the board below stays clickable. HUD/line/
  board are DOM siblings, never pixi children. The `data-tone` recolour comes from
  the `.cyc-world` ancestor.
-->
<script setup lang="ts">
import LineBar from './LineBar.vue';
import PlacementBoard from './PlacementBoard.vue';
import CombatLayer from './CombatLayer.vue';

const ADDR = ['0x00', '0x20', '0x40', '0x60'];
</script>

<template>
  <div class="cyc-field">
    <div
      class="cyc-sky"
      aria-hidden="true"
    >
      <div class="cyc-sky__grid" />
      <span
        v-for="(addr, i) in ADDR"
        :key="addr"
        class="cyc-sky__addr"
        :style="{ left: 6 + i * 25 + '%' }"
      >{{ addr }}</span>
      <CombatLayer />
    </div>
    <LineBar />
    <PlacementBoard />
  </div>
</template>

<style scoped>
.cyc-field {
  position: relative;
  border: 1px solid var(--cyc-grn2);
  overflow: hidden;
}
.cyc-sky {
  position: relative;
  height: 132px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 176, 0, 0.03), transparent 60%),
    repeating-linear-gradient(
      90deg,
      transparent 0 12.5%,
      rgba(56, 255, 171, 0.05) 12.5% calc(12.5% + 1px)
    );
}
.cyc-sky__grid {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0 24px,
    rgba(56, 255, 171, 0.05) 24px 25px
  );
}
.cyc-sky__addr {
  position: absolute;
  top: 3px;
  font-size: 8px;
  color: var(--cyc-grn2);
}
</style>
