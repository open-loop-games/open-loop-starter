<!--
  PlantGlyph — each plant drawn as the gardener would sketch it in a planting
  plan: a clipped box, a thrush on its post, a yellow sticky card, a bat box
  with a pipistrelle at its slit, a marigold, a ladybird hotel. One viewBox, so a board cell and a palette tag share it.
-->
<script setup lang="ts">
import type { PlantId } from '../../data';

defineProps<{ id: PlantId }>();
</script>

<template>
  <svg class="wg-glyph" viewBox="0 0 40 40" aria-hidden="true">
    <g v-if="id === 'hedge'">
      <rect x="3" y="3" width="34" height="34" rx="9" fill="var(--wg-box-deep)" />
      <rect x="5" y="5" width="30" height="28" rx="8" fill="var(--wg-box)" />
      <circle cx="13" cy="13" r="3" fill="#6b9a4c" />
      <circle cx="24" cy="11" r="2.5" fill="#6b9a4c" />
      <circle cx="28" cy="22" r="3" fill="#6b9a4c" />
      <circle cx="16" cy="24" r="2.5" fill="#6b9a4c" />
    </g>
    <g v-else-if="id === 'thrush'">
      <rect x="18" y="22" width="4" height="15" fill="#8a6d4b" />
      <rect x="11" y="21" width="18" height="3" rx="1" fill="#a3825a" />
      <path d="M9 17c2-6 8-9 14-7l5-3 1 3 3 1-4 2c0 5-4 8-10 8H11z" fill="#c49a62" />
      <path
        d="M15 15c3 0 6 1 8 3"
        stroke="#e7dcc2"
        stroke-width="1.4"
        fill="none"
        stroke-dasharray="1 2"
      />
      <circle cx="25" cy="10" r="1.2" fill="#191510" />
    </g>
    <g v-else-if="id === 'trap'">
      <rect x="19" y="24" width="2.5" height="13" fill="#6a5238" />
      <rect x="9" y="5" width="22" height="21" rx="1.5" fill="#e3c63c" />
      <circle cx="14" cy="11" r="1.1" fill="#2a2118" />
      <circle cx="22" cy="9" r="1.1" fill="#2a2118" />
      <circle cx="26" cy="17" r="1.1" fill="#2a2118" />
      <circle cx="16" cy="19" r="1.1" fill="#2a2118" />
      <circle cx="20" cy="14" r="1.1" fill="#2a2118" />
    </g>
    <g v-else-if="id === 'bat'">
      <rect x="18.5" y="30" width="3" height="7" fill="#6a5238" />
      <path d="M9 9 20 4l11 5v21H9z" fill="#7d6347" />
      <path d="M9 9 20 4l11 5" stroke="#5b4632" stroke-width="2" fill="none" />
      <rect x="11" y="27" width="18" height="2.4" fill="#2a2118" />
      <path
        d="M20 13c1.5-1 3-.6 3.6.4 2-1.6 4.8-1.8 6.4-.4-1.8.2-2.8 1.4-3.2 3-1.4-.8-2.8-.4-3.6.8-.8-1-2-1.2-3.2-1.2-1.2 0-2.4.2-3.2 1.2-.8-1.2-2.2-1.6-3.6-.8-.4-1.6-1.4-2.8-3.2-3 1.6-1.4 4.4-1.2 6.4.4.6-1 2.1-1.4 3.6-.4z"
        fill="#2a2118"
      />
    </g>
    <g v-else-if="id === 'marigold'">
      <path d="M20 26v11" stroke="#4f7a3a" stroke-width="2.5" />
      <path d="M20 31c-4-1-6-3-7-6 3 0 6 2 7 6z" fill="#4f7a3a" />
      <g fill="#e58a2c">
        <circle cx="20" cy="9" r="5" />
        <circle cx="28" cy="14" r="5" />
        <circle cx="26" cy="23" r="5" />
        <circle cx="14" cy="23" r="5" />
        <circle cx="12" cy="14" r="5" />
      </g>
      <circle cx="20" cy="17" r="5" fill="#f2b33c" />
    </g>
    <g v-else>
      <rect x="18.5" y="27" width="3" height="10" fill="#6a5238" />
      <path d="M6 13 20 4l14 9z" fill="#8a5a36" />
      <rect x="8" y="13" width="24" height="15" fill="#b98656" />
      <g fill="#6a4428">
        <circle cx="13" cy="18" r="1.4" />
        <circle cx="18" cy="18" r="1.4" />
        <circle cx="23" cy="18" r="1.4" />
        <circle cx="28" cy="18" r="1.4" />
        <circle cx="13" cy="23" r="1.4" />
        <circle cx="18" cy="23" r="1.4" />
      </g>
      <circle cx="25.5" cy="23.5" r="3.4" fill="#c8312a" />
      <path d="M25.5 20.1v6.8" stroke="#191510" stroke-width="0.8" />
      <circle cx="24.2" cy="22.6" r="0.7" fill="#191510" />
      <circle cx="26.9" cy="24.4" r="0.7" fill="#191510" />
    </g>
  </svg>
</template>

<style scoped>
.wg-glyph {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
