<!--
  SquadChips — a squad as a row of glyph chips, one per kind present, each titled with
  its matchup line. Sodium for your crew, neon pink for the rival's; dimmed for a sighting.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { UNITS, UNIT_KINDS, type UnitKind } from '../../data/units';
import type { Counts } from '../../modules/battle';
import { GLYPH, matchup } from '../format';

const props = defineProps<{
  counts: Counts;
  side: 'p' | 'e';
  focus?: UnitKind | 'spread';
  dim?: boolean;
}>();
const present = computed(() => UNIT_KINDS.filter((k) => props.counts[k] >= 0.05));
const shown = (x: number) => (x >= 1 ? Math.floor(x) : x.toFixed(1));
</script>

<template>
  <span class="squad" :data-side="side" :data-dim="dim">
    <span
      v-for="k in present"
      :key="k"
      class="chip"
      :data-focused="focus === k"
      :title="`${UNITS[k].name}: ${matchup(k)}`"
    >
      <span class="chip__glyph">{{ GLYPH[k] }}</span>
      <span class="chip__n num">{{ shown(counts[k]) }}</span>
    </span>
    <span v-if="present.length === 0" class="squad__empty">—</span>
  </span>
</template>

<style scoped>
.squad {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.squad[data-dim='true'] {
  opacity: 0.45;
  filter: saturate(0.4);
}
.squad__empty {
  color: var(--cc-chalk-faint);
}
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 1px 6px 0;
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  background: var(--cc-asphalt);
}
.squad[data-side='p'] .chip {
  border-color: var(--cc-sodium-deep);
}
.squad[data-side='e'] .chip {
  border-color: var(--cc-rival-deep);
}
.chip[data-focused='true'] {
  border-color: var(--cc-sodium);
  box-shadow: inset 0 -2px 0 var(--cc-sodium);
}
.chip__glyph {
  font-size: 13px;
  color: var(--cc-chalk-dim);
}
.squad[data-side='p'] .chip__glyph {
  color: var(--cc-sodium);
}
.squad[data-side='e'] .chip__glyph {
  color: var(--cc-rival);
}
.chip__n {
  font-family: var(--cc-face-neon);
  font-size: 20px;
  line-height: 0.9;
  min-width: 1.2ch;
  text-align: right;
}
</style>
