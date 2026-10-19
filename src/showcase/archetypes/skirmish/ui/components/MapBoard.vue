<!--
  MapBoard — the centre: the two safehouses, the three districts between them and the
  street feed. Safehouse integrity is starter's ProgressBar; the rival's drains toward
  its own side. Each safehouse note opens on what kind of outfit holds it: theirs from the
  contract, yours from the crew's tier. While the astral scout rides, the whole board
  takes the ley's tint.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { DISTRICTS } from '../../data/contracts';
import { getMatch } from '../../modules';
import { countsOf } from '../../modules/battle';
import { clock, grouped, rate } from '../format';
import DistrictRow from './DistrictRow.vue';
import FeedPanel from './FeedPanel.vue';
import SquadChips from './SquadChips.vue';

const match = getMatch();
const { p, e } = match;
const full = computed(() => match.tune.hqIntegrity.value);
const home = computed(() => countsOf(p.reserve));
const rivalHome = computed(() => match.safehouseSighting.value);
const scouting = computed(() => match.scoutLeft.value > 0);
</script>

<template>
  <section class="board" :data-scouting="scouting" aria-label="The sprawl">
    <div class="houses">
      <div class="house" data-side="p">
        <div class="house__head">
          <span class="house__name">Your safehouse</span>
          <span class="house__hp num">{{ grouped(toNumber(p.hq.value)) }}</span>
        </div>
        <ProgressBar class="cc-gauge integrity" :value="toNumber(p.hq.value)" :max="full" />
        <div class="house__row">
          <span class="cc-tag">At the gates</span>
          <SquadChips :counts="home" side="p" />
        </div>
        <span class="house__note"
          ><span class="house__tier" :data-chartered="p.chartered()">{{
            p.chartered() ? 'chartered' : 'street crew'
          }}</span>
          · Turret {{ rate(p.turretDps()) }} dps. Units at home hold the gates against an
          assault.</span
        >
      </div>
      <div class="house" data-side="e">
        <div class="house__head">
          <span class="house__hp num">{{ grouped(toNumber(e.hq.value)) }}</span>
          <span class="house__name">{{ match.contract.value.rival }}</span>
        </div>
        <ProgressBar
          class="cc-gauge integrity"
          :value="toNumber(e.hq.value)"
          :max="full"
          from="right"
        />
        <div class="house__row house__row--theirs">
          <template v-if="rivalHome">
            <SquadChips :counts="rivalHome.counts" side="e" :dim="!scouting" />
            <span class="cc-fog">{{ scouting ? 'seen now' : `seen ${clock(rivalHome.at)}` }}</span>
          </template>
          <span v-else class="cc-fog">▒▒ send an astral scout to see inside ▒▒</span>
        </div>
        <span class="house__note"
          >{{ match.contract.value.outfit }} · {{ match.contract.value.rumor }}</span
        >
      </div>
    </div>
    <DistrictRow v-for="(d, i) in DISTRICTS" :key="d.id" :index="i" />
    <FeedPanel class="board__feed" />
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
  position: relative;
}
/* Astral sight: the whole board takes the ley's tint while the scout rides. */
.board::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--cc-notch);
  box-shadow:
    inset 0 0 0 1px var(--cc-ley),
    inset 0 0 60px var(--cc-ley-glow);
  opacity: 0;
  transition: opacity 0.6s;
}
.board[data-scouting='true']::after {
  opacity: 1;
}
.board__feed {
  flex: 1 1 120px;
}
.houses {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
.house {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-top: 2px solid var(--cc-sodium);
  border-radius: var(--cc-notch);
}
.house[data-side='e'] {
  border-top-color: var(--cc-rival);
  text-align: right;
}
.house__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.house__name {
  font-family: var(--cc-face-sign);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
/* Kenney High has no tabular figures: a fixed box keeps the name from shifting. */
.house__hp {
  display: inline-block;
  min-width: 4ch;
  text-align: right;
  font-family: var(--cc-face-neon);
  font-size: 30px;
  line-height: 0.8;
  color: var(--cc-sodium);
}
.house[data-side='e'] .house__hp {
  text-align: left;
  color: var(--cc-rival);
}
.integrity.cc-gauge {
  --progress-bar-height: 5px;
  --progress-bar-radius: 3px;
  --progress-bar-transition: transform 0.3s linear;
}
.house[data-side='e'] .integrity {
  --progress-bar-fill: var(--cc-rival);
}
.house__row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 24px;
}
.house__row--theirs {
  justify-content: flex-end;
}
.house__note {
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.house__tier[data-chartered='true'] {
  color: var(--cc-brass);
}
</style>
