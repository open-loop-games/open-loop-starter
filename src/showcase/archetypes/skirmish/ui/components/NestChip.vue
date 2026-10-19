<!--
  NestChip — a sentry nest standing in a district: the rooftop gun beside its seat's squad,
  its hit points a hairline under it. Sodium for yours, neon pink for the rival's. It sits
  in the squad's row, so a nest costs the district no height.
-->
<script setup lang="ts">
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { SENTRY_NEST } from '../../data/buildings';
import { grouped } from '../format';

defineProps<{
  hp: number;
  max: number;
  side: 'p' | 'e';
}>();
</script>

<template>
  <span
    class="nest"
    :data-side="side"
    :data-hurt="hp < max"
    :title="`${SENTRY_NEST.name}: ${grouped(hp)} / ${grouped(max)} hp`"
  >
    <span class="nest__glyph" aria-hidden="true">▲</span>
    <span class="nest__body">
      <span class="nest__name">nest</span>
      <ProgressBar
        class="cc-gauge nest__hp"
        :value="hp"
        :max="max"
        :from="side === 'e' ? 'right' : 'left'"
      />
    </span>
  </span>
</template>

<style scoped>
.nest {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  gap: 5px;
  padding: 2px 6px 2px 5px;
  border: 1px solid var(--cc-sodium-deep);
  border-radius: var(--cc-notch);
  background: var(--cc-asphalt);
}
.nest[data-side='e'] {
  flex-direction: row-reverse;
  padding: 2px 5px 2px 6px;
  border-color: var(--cc-rival-deep);
}
.nest__glyph {
  font-size: 12px;
  line-height: 1;
  color: var(--cc-sodium);
}
.nest[data-side='e'] .nest__glyph {
  color: var(--cc-rival);
}
.nest__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nest__name {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cc-chalk-dim);
}
.nest__hp.cc-gauge {
  width: 40px;
  --progress-bar-height: 3px;
  --progress-bar-transition: transform 0.3s linear;
}
.nest[data-side='e'] .nest__hp {
  --progress-bar-fill: var(--cc-rival);
}
/* Under fire the lost share shows as short-rust track, so a hurt nest reads at a glance. */
.nest[data-hurt='true'] .nest__hp {
  --progress-bar-track: color-mix(in srgb, var(--cc-short) 65%, var(--cc-gutter));
}
</style>
