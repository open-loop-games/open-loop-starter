<script setup lang="ts">
import type { SkillId } from '../../data';

defineProps<{ weights: Partial<Record<SkillId, number>> }>();
const LETTER: Record<SkillId, string> = { brawn: 'B', stealth: 'S', finesse: 'F', guile: 'G' };
</script>

<template>
  <span
    class="lo-pips"
    :title="
      Object.entries(weights)
        .map(([k, w]) => `${k} ${Math.round((w as number) * 100)}%`)
        .join(', ')
    "
  >
    <span
      v-for="(w, k) in weights"
      :key="k"
      class="lo-pip"
      :style="{ '--w': w, '--tint': `var(--lo-${k})` }"
      >{{ LETTER[k as SkillId] }}</span
    >
  </span>
</template>

<style scoped>
.lo-pips {
  display: inline-flex;
  gap: 2px;
  vertical-align: middle;
}
.lo-pip {
  font-family: var(--lo-face-stencil);
  font-size: 11px;
  line-height: 15px;
  min-width: 15px;
  padding: 0 3px;
  text-align: center;
  color: var(--lo-night);
  background: var(--tint);
  opacity: calc(0.45 + 0.55 * var(--w));
  border-radius: 2px;
}
</style>
