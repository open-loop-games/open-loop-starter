<!--
  HuntsmanPanel — the person out in the wold: the jerky he carries against the
  walk home, the pack the lodge alone can empty, what he can do where he
  stands, the bestiary, and the spoor log.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getSkillProgress, toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ANCHORS, BESTIARY_KILLS, LODGE, MAP_W, SPECIES, TERRAIN } from '../../data';
import { getChronicle, getHuntsman, getLodge, getWold } from '../../modules';
import { fmt } from '../format';

const man = getHuntsman();
const wold = getWold();
const lodge = getLodge();
const chronicle = getChronicle();

const supply = computed(() => toNumber(man.supply.value));
const homeCost = computed(() => {
  void wold.mapVersion.value;
  void wold.camps.value.length;
  const { x, y } = man.pos.value;
  return wold.homeField()[y * MAP_W + x];
});

const here = computed(() => {
  void wold.mapVersion.value;
  const { x, y } = man.pos.value;
  const t = wold.tileAt(x, y);
  const herd = man.herdAt(x, y);
  const i = y * MAP_W + x;
  return {
    name: TERRAIN[t.band].displayName,
    herd,
    stock: wold.stock.value[i],
    chance: herd ? man.huntChance(herd) : 0,
    canCamp: t.feature === 'waystone' && !wold.isCamp(i),
    atLodge: x === LODGE.x && y === LODGE.y,
    lair: t.feature === 'lair',
  };
});

const busy = computed(() => man.action.value !== 'idle');
const progress = computed(() => toNumber(man.actionClock.percentComplete.value));
const doing = computed(() =>
  man.action.value === 'walk'
    ? `walking · ${man.path.value.length} to go`
    : man.action.value === 'hunt'
      ? 'stalking…'
      : 'standing',
);
const canHunt = computed(() => !busy.value && supply.value >= ANCHORS.supplyPerHunt);
const canCamp = computed(
  () => !busy.value && toNumber(lodge.stores.wood.value) >= man.campCost.value,
);

const bestiary = computed(() =>
  SPECIES.filter((s) => s.id !== 'hart' && wold.zones.isUnlocked(TERRAIN[s.band].id)).map((s) => ({
    s,
    kills: man.kills.value[s.id] ?? 0,
    known: (man.kills.value[s.id] ?? 0) >= BESTIARY_KILLS,
  })),
);

const skillPct = computed(() => Math.round(100 * getSkillProgress(man.skill)));
const homeMark = computed(() => Math.min(100, (100 * homeCost.value) / man.supplyCap.value));
const packFull = computed(() => man.packLoad.value >= man.packCap.value - 0.5);
</script>

<template>
  <div class="huntsman">
    <section class="sp-section">
      <h2>The huntsman</h2>
      <div class="meter">
        <div class="label">
          <span>Jerky carried</span>
          <span class="sp-num">{{ supply.toFixed(1) }} / {{ man.supplyCap.value }}</span>
        </div>
        <div class="bar">
          <ProgressBar class="jerky" :value="supply" :max="man.supplyCap.value" />
          <div class="mark" :style="{ left: `${homeMark}%` }" />
        </div>
        <div class="sp-hint sp-num" :class="{ 'sp-warn': homeCost >= supply - 1 && !here.atLodge }">
          home costs {{ Number.isFinite(homeCost) ? homeCost.toFixed(1) : '—' }} · each tile
          {{ wold.stepCost.value }}
        </div>
      </div>
      <div class="meter">
        <div class="label">
          <span>Pack</span>
          <span class="sp-num">{{ fmt(man.packLoad.value) }} / {{ fmt(man.packCap.value) }}</span>
        </div>
        <ProgressBar
          class="pack"
          :class="{ full: packFull }"
          :value="man.packLoad.value"
          :max="man.packCap.value"
        />
        <div class="sp-hint sp-num">
          {{ fmt(man.packItems.meat.value) }} meat · {{ fmt(man.packItems.hide.value) }} hides ·
          {{ fmt(man.packItems.antler.value) }} antler — lost if you fall
        </div>
      </div>
      <div class="stats sp-num">
        <span
          >Prowess <b>{{ man.prowess.value.toFixed(1) }}</b></span
        >
        <span>
          Huntcraft <b>{{ toNumber(man.skill.level.value) }}</b> <i>{{ skillPct }}%</i>
        </span>
        <span
          >Sight <b>{{ wold.sight.value }}</b></span
        >
      </div>
    </section>

    <section class="sp-section">
      <h2>Here — {{ here.name }}</h2>
      <div class="act">
        <ProgressBar class="clock" :value="busy ? progress : 0" />
        <span class="doing">{{ doing }}</span>
      </div>
      <template v-if="here.herd">
        <Button
          class="sp-verb"
          :class="{ danger: here.herd.dangerous }"
          :disabled="!canHunt"
          @click="man.hunt()"
        >
          {{
            here.herd.id === 'hart'
              ? 'Hunt the Pale Hart'
              : `Hunt the ${here.herd.displayName.toLowerCase()}`
          }}
          <span class="sp-num">{{ Math.round(here.chance * 100) }}%</span>
        </Button>
        <div class="sp-hint">
          {{ here.stock }} here.
          <span v-if="here.herd.dangerous" class="sp-warn">
            If it turns on you, you are carried home and the pack is lost.
          </span>
          <span v-else>A miss only scatters it.</span>
        </div>
      </template>
      <div v-else-if="here.lair && !chronicle.won.value" class="sp-hint">
        The lair is empty to you.
        <span class="sp-num">
          The trail opens after {{ man.hartTrail.value.need }} deepwood kills ({{
            man.hartTrail.value.have
          }}
          so far).
        </span>
      </div>
      <template v-if="here.canCamp">
        <Button class="sp-verb" :disabled="!canCamp" @click="man.buildCamp()">
          Raise a camp <span class="sp-num">{{ man.campCost.value }} wood</span>
        </Button>
        <div class="sp-hint">
          A camp restocks your jerky from the lodge store. It does not bank the pack.
        </div>
      </template>
      <Button
        v-if="!here.atLodge"
        class="sp-verb quiet"
        :disabled="man.action.value === 'hunt'"
        @click="man.walkTo(LODGE)"
      >
        Walk home to the lodge
      </Button>
    </section>

    <section v-if="bestiary.length" class="sp-section">
      <h2>Bestiary</h2>
      <ul class="beasts">
        <li
          v-for="b in bestiary"
          :key="b.s.id"
          class="sp-reveal"
          :class="{ known: b.known, danger: b.s.dangerous }"
        >
          <span class="g">{{ b.s.glyph }}</span>
          <span>{{ b.s.displayName }}</span>
          <span class="sp-num">
            {{ b.kills }}<template v-if="!b.known">/{{ BESTIARY_KILLS }}</template>
          </span>
        </li>
      </ul>
    </section>

    <section class="sp-section">
      <h2>Spoor</h2>
      <ol class="log">
        <li v-for="e in chronicle.log.value.slice(0, 14)" :key="e.id" :class="e.tone">
          {{ e.text }}
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.huntsman {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.meter {
  margin-bottom: 6px;
}
.label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
.bar {
  position: relative;
}
.meter :deep(.olui-progress-bar) {
  margin: 3px 0;
}
.meter :deep(.olui-progress-bar__track) {
  height: 9px;
  min-height: 0;
}
.meter .jerky {
  --progress-bar-fill: linear-gradient(90deg, var(--sp-tallow-deep), var(--sp-tallow));
}
.meter .pack {
  --progress-bar-fill: linear-gradient(90deg, #4f5f3a, var(--sp-moss));
}
.meter .pack.full {
  --progress-bar-fill: var(--sp-ember);
}
.mark {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--sp-rust);
  pointer-events: none;
}
.stats {
  display: flex;
  gap: 14px;
  font-size: 13.5px;
  color: var(--sp-birch-dim);
}
.stats b {
  color: var(--sp-birch);
  font-weight: 600;
}
.stats i {
  color: var(--sp-ash);
  font-size: 12px;
}

.act {
  display: flex;
  align-items: center;
  gap: 8px;
}
.act .clock {
  flex: 0 0 80px;
  --progress-bar-fill: var(--sp-birch-dim);
  --progress-bar-transition: none;
}
.act :deep(.olui-progress-bar__track) {
  height: 5px;
  min-height: 0;
  border: none;
  box-shadow: none;
}
.doing {
  font-size: 13px;
  color: var(--sp-birch-dim);
  font-style: italic;
}

.beasts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  font-size: 13px;
}
.beasts li {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  gap: 6px;
  color: var(--sp-ash);
}
.beasts li.known {
  color: var(--sp-birch);
}
.beasts .g {
  font-weight: 600;
  font-style: italic;
}
.beasts .danger .g {
  color: var(--sp-rust);
  font-style: normal;
  font-weight: 700;
}

.log {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  max-height: 260px;
  overflow: hidden;
}
.log li {
  padding: 2px 0;
  border-bottom: 1px solid #1f1d17;
  color: var(--sp-birch-dim);
}
.log li:first-child {
  animation: sp-reveal-in 500ms ease-out both;
}
.log li.plain:first-child {
  color: var(--sp-birch);
}
.log .good {
  color: var(--sp-moss);
}
.log .bad {
  color: var(--sp-rust);
}
.log .find {
  color: var(--sp-frost);
}
</style>
