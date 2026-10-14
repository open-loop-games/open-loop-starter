<script setup lang="ts">
import type { PieceKind } from '../../data';
defineProps<{ kind: PieceKind }>();
</script>

<template>
  <svg viewBox="0 0 40 40" class="glyph" aria-hidden="true">
    <g v-if="kind === 'breakwater'" class="stone">
      <rect x="4" y="22" width="15" height="9" rx="1.5" />
      <rect x="21" y="22" width="15" height="9" rx="1.5" />
      <rect x="11" y="12" width="18" height="9" rx="1.5" />
    </g>
    <g v-else-if="kind === 'net'" class="net">
      <path d="M6 10 Q20 34 34 10" />
      <path d="M11 13 L20 28 L29 13 M15 11 L20 20 L25 11" />
      <circle cx="6" cy="10" r="2.2" class="float" />
      <circle cx="34" cy="10" r="2.2" class="float" />
    </g>
    <g v-else-if="kind === 'buttress'" class="stone">
      <path d="M8 32 L14 8 L26 8 L32 32 Z" />
      <path d="M12 22 L28 22" class="seam" />
    </g>
    <g v-else class="winch">
      <circle cx="20" cy="20" r="10" />
      <circle cx="20" cy="20" r="3" class="hub" />
      <path d="M20 10 L20 4 M30 20 L36 20" />
    </g>
  </svg>
</template>

<style scoped>
.glyph {
  width: 100%;
  height: 100%;
}
.stone rect,
.stone path {
  fill: #9aa3a3;
  stroke: #1f2629;
  stroke-width: 1.4;
}
.stone .seam {
  fill: none;
}
.net path {
  fill: none;
  stroke: var(--sk-wrack);
  stroke-width: 1.8;
}
.net .float {
  fill: var(--sk-lamp);
  stroke: none;
}
.winch circle {
  fill: #6b5a43;
  stroke: #1f2629;
  stroke-width: 1.4;
}
.winch .hub {
  fill: var(--sk-brass);
}
.winch path {
  stroke: var(--sk-foam);
  stroke-width: 1.6;
}
</style>
