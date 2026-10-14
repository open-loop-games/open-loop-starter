<!--
  KeepBanners — the two keeps over the causeway, on starter's `ResourceReadout` contract with
  this hall's own renderer. Fairhold's banner carries its silver, its harvest and its gate; the
  rival's carries the field, its lord and his gate. Each gate is a crenellated wall that
  reddens as it breaks. Between them: both horns, the campaign season, and the battle's twist.
  In the last week the season shows the surge and counts down to its close, with the share each
  gate has lost beside it: at the close, the keep whose gate lost more yields.

  Costume classes: `.keep-banners`, `.kb-keep--player|rival`, `.kb-gate`, `.kb-season`,
  `.kb-tally`, `.kb-twist`, `.last-week`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import type { ResourceReadout } from '@/ui/compositions';
import { seasonClose, seasonSurge } from '../../data';
import { getBattle, getCauseway, getChronicle, getKeep, type Side } from '../../modules';
import { mmss, n } from '../format';

const battle = getBattle();
const causeway = getCauseway();
const fairhold = getKeep('player');
const rival = getKeep('rival');

const gateReadout = (side: Side): ResourceReadout => {
  const keep = getKeep(side);
  return {
    id: `gate-${side}`,
    label: 'Gate',
    value: computed(() => Math.max(0, Math.ceil(keep.gateMax.value - keep.gateDamage.value))),
    capacity: computed(() => Math.ceil(keep.gateMax.value)),
    highlight: computed(() =>
      keep.gateDamage.value > 0.65 * keep.gateMax.value ? 'deficit' : 'normal',
    ),
  };
};
const silver: ResourceReadout = {
  id: 'silver',
  label: 'Silver',
  value: computed(() => fairhold.silver.value),
  // The harvest as it pays now: the last week's surge included.
  rate: computed(
    () => fairhold.income.value * seasonSurge(causeway.clock.value, battle.seasonSeconds.value),
  ),
};
const gates = { player: gateReadout('player'), rival: gateReadout('rival') };
const whole = (side: Side) =>
  computed(() => {
    const g = gates[side];
    return toNumber(g.value.value) / Math.max(1, toNumber(g.capacity!.value));
  });
const wholeness = { player: whole('player'), rival: whole('rival') };

const T = computed(() => battle.hornSeconds.value);
const season = computed(() => battle.seasonSeconds.value);
const clock = computed(() => causeway.clock.value);
const lastWeek = computed(() => clock.value > season.value);
const ours = computed(() => battle.hornIn('player'));
const theirs = computed(() => battle.hornIn('rival'));
const lord = computed(() => battle.lord.value);
const chronicle = getChronicle();
const field = computed(() => chronicle.field.value);
const twist = computed(() => chronicle.twist.value);
const surge = computed(() => seasonSurge(clock.value, season.value));
const closesIn = computed(() => seasonClose(season.value) - clock.value);
const lost = (side: Side) => computed(() => Math.round(100 * (1 - wholeness[side].value)));
const lostShare = { player: lost('player'), rival: lost('rival') };
</script>

<template>
  <header class="keep-banners">
    <div class="kb-keep kb-keep--player">
      <div class="kb-name">Fairhold</div>
      <div class="kb-silver">
        <span class="num kb-big">{{ n(silver.value.value) }}</span>
        <span class="kb-unit">silver</span>
        <span class="num kb-rate">+{{ toNumber(silver.rate!.value).toFixed(1) }} a second</span>
      </div>
      <div class="kb-gate" :class="{ low: gates.player.highlight?.value === 'deficit' }">
        <span class="kb-label">Fairhold's gate</span>
        <span class="kb-wall"
          ><span
            class="kb-wall-fill"
            :style="{ transform: `scaleX(${wholeness.player.value})` }"
          ></span
        ></span>
        <span class="num kb-gate-n">{{ n(gates.player.value.value) }}</span>
      </div>
    </div>

    <div class="kb-season" :class="{ 'last-week': lastWeek }">
      <div class="kb-horn kb-horn--ours">
        The horn sounds in <span class="num">{{ mmss(ours) }}</span>
      </div>
      <div class="kb-horn-bar">
        <span
          class="kb-horn-run kb-horn-run--ours"
          :style="{ transform: `scaleX(${1 - ours / T})` }"
        ></span>
        <span
          class="kb-horn-run kb-horn-run--theirs"
          :style="{ transform: `scaleX(${1 - theirs / T})` }"
        ></span>
      </div>
      <div class="kb-horn kb-horn--theirs">
        Their next rabble in <span class="num">{{ mmss(theirs) }}</span>
      </div>
      <div class="kb-clock">
        <!-- One span, so the flex box keeps the spaces between words and numbers. -->
        <span v-if="lastWeek">
          The last week: harvests and musters <span class="num">×{{ surge }}</span
          >. The season closes in <span class="num">{{ mmss(closesIn) }}</span>
        </span>
        <span v-else>
          Campaign season · <span class="num">{{ mmss(clock) }}</span> of
          <span class="num">{{ mmss(season) }}</span>
        </span>
      </div>
      <div class="kb-tally" :class="{ lit: lastWeek }">
        <span class="kb-tally-ours"
          >ours lost <span class="num">{{ lostShare.player.value }}%</span></span
        >
        <span class="kb-tally-mid">gates at the close</span>
        <span class="kb-tally-theirs"
          >theirs lost <span class="num">{{ lostShare.rival.value }}%</span></span
        >
      </div>
      <div class="kb-twist" :title="twist.blurb">
        <span class="kb-twist-name">{{ twist.name }}</span> · {{ twist.blurb }}
      </div>
    </div>

    <div class="kb-keep kb-keep--rival">
      <div class="kb-name">{{ field.name }}</div>
      <div class="kb-lord">{{ lord.name }}</div>
      <div class="kb-gate" :class="{ low: gates.rival.highlight?.value === 'deficit' }">
        <span class="num kb-gate-n">{{ n(gates.rival.value.value) }}</span>
        <span class="kb-wall kb-wall--rival"
          ><span
            class="kb-wall-fill"
            :style="{ transform: `scaleX(${wholeness.rival.value})` }"
          ></span
        ></span>
        <span class="kb-label">their gate</span>
      </div>
      <div class="kb-coffers num">
        their harvest +{{ (toNumber(rival.income.value) * surge).toFixed(1) }} a second
      </div>
    </div>
  </header>
</template>

<style scoped>
.keep-banners {
  display: grid;
  grid-template-columns: 1fr minmax(300px, 380px) 1fr;
  gap: 18px;
  align-items: end;
}
.kb-keep {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kb-keep--rival {
  align-items: flex-end;
  text-align: right;
}
.kb-name {
  font-family: var(--cw-caps);
  font-size: 22px;
  line-height: 1.1;
}
.kb-keep--player .kb-name {
  color: #a9c3e0;
}
.kb-keep--rival .kb-name {
  color: #dba497;
}
.kb-lord {
  font-family: var(--cw-hand);
  font-style: italic;
  color: var(--cw-gall);
}
.kb-silver {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.kb-big {
  font-size: 30px;
  font-weight: 600;
  line-height: 1;
  color: var(--cw-weld);
  min-width: 3.4ch;
}
.kb-unit {
  color: var(--cw-gall);
}
.kb-rate,
.kb-coffers {
  font-size: 13.5px;
  color: var(--cw-linen-dim);
}
.kb-gate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.kb-label {
  font-size: 13.5px;
  color: var(--cw-gall);
  white-space: nowrap;
}
.kb-gate-n {
  font-size: 15px;
  min-width: 4ch;
}
/* The wall: merlons along the top, the masonry draining as the gate breaks. */
.kb-wall {
  position: relative;
  width: 150px;
  height: 14px;
  background: rgba(0, 0, 0, 0.45);
  clip-path: polygon(
    0 30%,
    10% 30%,
    10% 0,
    20% 0,
    20% 30%,
    30% 30%,
    30% 0,
    40% 0,
    40% 30%,
    50% 30%,
    50% 0,
    60% 0,
    60% 30%,
    70% 30%,
    70% 0,
    80% 0,
    80% 30%,
    90% 30%,
    90% 0,
    100% 0,
    100% 100%,
    0 100%
  );
}
.kb-wall-fill {
  position: absolute;
  inset: 0;
  background: #9a8c74;
  transform-origin: left center;
  transition: transform 0.4s ease;
}
.kb-wall--rival .kb-wall-fill {
  transform-origin: right center;
}
.low .kb-wall-fill {
  background: var(--cw-madder);
}
.low .kb-gate-n {
  color: #e6a092;
}

.kb-season {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  padding: 8px 12px;
  border: 1px solid var(--cw-rule);
  background: rgba(33, 27, 21, 0.7);
}
.kb-horn {
  font-size: 14px;
}
.kb-horn--ours {
  color: #a9c3e0;
}
.kb-horn--theirs {
  text-align: right;
  color: #dba497;
}
.kb-horn-bar {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  height: 5px;
}
.kb-horn-run {
  display: block;
  height: 100%;
  transition: transform 0.25s linear;
}
.kb-horn-run--ours {
  background: var(--cw-woad);
  transform-origin: left center;
}
.kb-horn-run--theirs {
  background: var(--cw-madder);
  transform-origin: right center;
}
.kb-clock {
  grid-column: 1 / -1;
  /* Two lines held open, so the last week's longer notice moves nothing below it. */
  min-height: 2.6em;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.25;
  text-align: center;
  font-family: var(--cw-hand);
  font-size: 14px;
  color: var(--cw-gall);
}
/* The tiebreak, always on the page and lit in the last week: the share each gate has lost. */
.kb-tally {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  font-size: 13px;
  color: var(--cw-linen-dim);
}
.kb-tally-mid {
  font-family: var(--cw-caps);
  color: var(--cw-gall);
  opacity: 0.7;
}
.kb-tally-theirs {
  text-align: right;
}
.kb-tally.lit .kb-tally-ours {
  color: #a9c3e0;
}
.kb-tally.lit .kb-tally-theirs {
  color: #dba497;
}
.kb-tally.lit .kb-tally-mid {
  color: var(--cw-ember);
  opacity: 1;
}
.kb-twist {
  grid-column: 1 / -1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 13px;
  font-style: italic;
  color: var(--cw-linen-dim);
  border-top: 1px dotted var(--cw-rule);
  padding-top: 3px;
}
.kb-twist-name {
  font-family: var(--cw-caps);
  font-style: normal;
  color: var(--cw-gall);
}
.last-week {
  border-color: rgba(210, 124, 62, 0.5);
}
.last-week .kb-clock {
  color: var(--cw-ember);
}
</style>
