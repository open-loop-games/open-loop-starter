<!--
  TroopGlyph — a troop drawn as a tapestry figure: a yeoman with his pike, a bowman with his
  bow, a knight on his horse, the mangonel's frame and arm. Stroked and filled in
  `currentColor`, so the side's dye comes from the parent.
-->
<script setup lang="ts">
import type { TroopId } from '../../data';

defineProps<{ troop: TroopId }>();
</script>

<template>
  <svg class="troop-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <g v-if="troop === 'pike'" fill="currentColor" stroke="currentColor" stroke-linecap="round">
      <circle cx="9" cy="5" r="2.4" stroke="none" />
      <path d="M6 9h6l1 8H5z" stroke="none" />
      <path d="M7 17l-1 5M11 17l1 5" stroke-width="1.6" fill="none" />
      <path d="M17 3v20" stroke-width="1.4" fill="none" />
      <path d="M17 0.5l1.6 3.5h-3.2z" stroke="none" />
    </g>
    <g v-else-if="troop === 'bow'" fill="currentColor" stroke="currentColor" stroke-linecap="round">
      <circle cx="9" cy="5" r="2.4" stroke="none" />
      <path d="M6 9h6l1 8H5z" stroke="none" />
      <path d="M7 17l-1 5M11 17l1 5" stroke-width="1.6" fill="none" />
      <path d="M15 3q6 9 0 18" stroke-width="1.6" fill="none" />
      <path d="M15 3v18" stroke-width="0.6" fill="none" />
    </g>
    <g
      v-else-if="troop === 'horse'"
      fill="currentColor"
      stroke="currentColor"
      stroke-linecap="round"
    >
      <circle cx="10" cy="3" r="2" stroke="none" />
      <path d="M8.5 5.5h3l0.5 5h-4z" stroke="none" />
      <path d="M2 16l3-5h12l3-4 2.5 1-2 4v4h-2v6h-2v-6H7v6H5v-6z" stroke="none" />
      <path d="M12 6l11-4" stroke-width="1.2" fill="none" />
    </g>
    <g v-else fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 20h20" stroke-width="1.8" />
      <path d="M5 20l7-11 7 11" stroke-width="1.6" />
      <path d="M12 9l9-6" stroke-width="1.6" />
      <circle cx="21" cy="3.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="21" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="17" cy="21" r="1.6" fill="currentColor" stroke="none" />
    </g>
  </svg>
</template>

<style scoped>
.troop-glyph {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
