<!--
  Almanac — the season on the play clock, above the ledger: the season and year, how far
  through it the works are, the gardens' yield this season and the forecast for the next.
  Winter is the larder's threat, so while bread falls it says when the larder runs dry,
  vermilion if that comes before the season turns. The line is always drawn, so the
  ledger below never shifts when bread turns.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { SEASONS, SEASON_SECONDS, gardenYield } from '../../data';
import { getCalendar, getWorks } from '../../modules';
import { countdown, times } from '../format';

const cal = getCalendar();
const works = getWorks();

const title = (s: string) => `${s[0]!.toUpperCase()}${s.slice(1)}`;
const sky = (w: number) => (w > 0 ? 'kind' : w < 0 ? 'hard' : 'fair');

const next = computed(() => {
  const n = cal.index.value + 1;
  return { name: SEASONS[n % SEASONS.length]!, yield: gardenYield(n) };
});

const larder = computed(() => {
  const net = works.net.bread;
  // A full larder's rations nibble it just under the lid every tick: that is not falling.
  const full = toNumber(works.res.bread.value) >= works.cap.bread.value * 0.995;
  if (net > -0.005 || full) return undefined;
  const dry = toNumber(works.res.bread.value) / -net;
  return { dry, short: dry < cal.remaining.value };
});
</script>

<template>
  <section class="ae-almanac" :class="cal.season.value" aria-label="Almanac">
    <h2 class="ae-section-head">Almanac</h2>
    <div class="when">
      <span class="season ae-lettering">{{ title(cal.season.value) }}</span>
      <span class="year ae-figure">{{ cal.year.value }}</span>
      <span class="left ae-figure">{{ countdown(cal.remaining.value) }}</span>
    </div>
    <ProgressBar
      class="ae-almanac__turn"
      :value="SEASON_SECONDS - cal.remaining.value"
      :max="SEASON_SECONDS"
    />
    <dl>
      <div>
        <dt>Gardens</dt>
        <dd class="ae-figure" :class="{ lean: cal.yield.value < 1, rich: cal.yield.value > 1 }">
          {{ times(cal.yield.value) }}
          <span v-if="cal.weather.value" class="note">{{ sky(cal.weather.value) }}</span>
        </dd>
      </div>
      <div>
        <dt>Then {{ next.name }}</dt>
        <dd class="ae-figure" :class="{ lean: next.yield < 1, rich: next.yield > 1 }">
          {{ times(next.yield) }}
          <span v-if="cal.forecast.value" class="note">{{ sky(cal.forecast.value) }}</span>
        </dd>
      </div>
    </dl>
    <p class="larder" :class="{ short: larder?.short, keeps: !larder }">
      <template v-if="larder"
        >The larder runs dry in <span class="ae-figure">{{ countdown(larder.dry) }}</span></template
      >
      <template v-else>The larder keeps pace.</template>
    </p>
  </section>
</template>

<style scoped>
.ae-almanac {
  margin-bottom: 16px;
}
.when {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.season {
  font-size: 15px;
  color: var(--ae-chalk);
  letter-spacing: 0.16em;
}
.year {
  color: var(--ae-drafting-line);
}
.left {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--ae-drafting-line-faint);
}
.ae-almanac__turn {
  margin: 4px 0 8px;
  --progress-bar-track: var(--ae-cyanotype-rule);
  --progress-bar-fill: var(--ae-drafting-line);
  --progress-bar-radius: 0;
  --progress-bar-height: 2px;
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-fill-full: var(--progress-bar-fill);
  --progress-bar-track-empty: var(--progress-bar-track);
  --progress-bar-transition: none;
}
.winter .ae-almanac__turn {
  --progress-bar-fill: var(--ae-aluminium);
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin: 0;
}
dt {
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.66rem;
  color: var(--ae-drafting-line-faint);
}
dd {
  margin: 0;
  color: var(--ae-chalk);
}
dd.lean {
  color: var(--ae-vermilion);
}
dd.rich {
  color: var(--ae-verdigris);
}
.note {
  font-style: italic;
  font-size: 0.8rem;
  color: var(--ae-drafting-line-faint);
}
.larder {
  margin: 6px 0 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--ae-drafting-line);
}
.larder.keeps {
  color: var(--ae-drafting-line-faint);
}
.larder.short {
  color: var(--ae-vermilion);
}
</style>
