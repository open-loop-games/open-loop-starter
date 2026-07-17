<!--
  DefenseField — the combat volume: the sky (radar), the defended line, the board.
  The sky is a STATIC CSS radar backdrop here; the descending-warhead / Lance-beam
  pixi layer is a deferred follow-up leaf (studio/open-loop-starter#21 5c) that mounts
  over this box. Warheads are cosmetic over the rate model, so the field is fully
  playable without them. The `data-tone` recolour comes from the `.cyc-world` ancestor.
-->
<script setup lang="ts">
import LineBar from './LineBar.vue';
import PlacementBoard from './PlacementBoard.vue';

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
      <span class="cyc-sky__standby">— radar scope · combat layer pending —</span>
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
.cyc-sky__standby {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cyc-grndim);
}
</style>
