<!--
  RockBoard — the 5×5 rock in its sea. A click does what the work rail's tool says: haul a
  net, place a piece, take one up. Tonight's side is outlined in rust; a cell that the tool
  can act on is dashed in lamplight. By night the beam sweeps, the wind quickens from the
  forecast quarter, and each breaker flashes foam on the struck edge with what came through.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { PIECES, type Quarter } from '../../data';
import { cellKey, getWatch, groundAt, quartersOf, ringAround, SIZE, wallWard } from '../../modules';
import type { Tool } from '../format';
import PieceGlyph from './PieceGlyph.vue';

const props = defineProps<{ tool: Tool }>();
const watch = getWatch();

const night = computed(() => watch.phase.value === 'night');

const winchReach = computed(() => {
  const reach = new Set<string>();
  const view = watch.board.value;
  for (const p of watch.placed.value)
    if (p.kind === 'winch')
      for (const c of ringAround(view, p.x, p.y)) reach.add(cellKey(c.x, c.y));
  return reach;
});

const cells = computed(() => {
  const out = [];
  const cap = toNumber(watch.tideline.capacity.value);
  const salvage = toNumber(watch.salvage.value);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const ground = groundAt(x, y);
      const piece = watch.placed.value.find((p) => p.x === x && p.y === y)?.kind ?? null;
      const key = cellKey(x, y);
      const held = piece === 'net' ? toNumber(watch.tideline.get(key)) : 0;
      const t = props.tool;
      const def = PIECES.find((p) => p.id === t);
      const placeable =
        !night.value &&
        !piece &&
        def !== undefined &&
        def.ground === ground &&
        salvage >= watch.priceOf(def.id);
      const clearable = !night.value && t === 'clear' && piece !== null;
      const haulable = !night.value && t === 'haul' && piece === 'net' && held >= 1;
      out.push({
        x,
        y,
        key,
        ground,
        piece,
        held,
        fill: cap > 0 ? Math.min(1, held / cap) : 0,
        full: piece === 'net' && held >= cap - 0.01,
        winched: piece === 'net' && winchReach.value.has(key),
        ward:
          piece === 'breakwater' ? wallWard(watch.board.value, x, y, watch.wardFactors.value) : 0,
        struck: ground === 'shore' && quartersOf(x, y).includes(watch.quarter.value),
        actionable: placeable || clearable || haulable,
      });
    }
  return out;
});

function act(x: number, y: number): void {
  const t = props.tool;
  if (t === 'haul') watch.haul(x, y);
  else if (t === 'clear') watch.clear(x, y);
  else watch.build(t, x, y);
}

const strikeKey = computed(() =>
  watch.lastStrike.value ? `${watch.night.value}-${watch.lastStrike.value.index}` : '',
);
const strikeSide = computed<Quarter>(() => watch.lastStrike.value?.quarter ?? watch.quarter.value);
const strikeLeak = computed(() => watch.lastStrike.value?.leak ?? 0);
</script>

<template>
  <div class="sea" :class="{ night }">
    <div class="swell" aria-hidden="true"></div>
    <div class="wind" :class="`from-${watch.quarter.value}`" aria-hidden="true">
      <span v-for="i in 5" :key="i" :style="{ '--i': i }"></span>
    </div>
    <div class="rock">
      <Button
        v-for="c in cells"
        :key="c.key"
        class="cell"
        :class="[
          c.ground,
          { struck: c.struck, actionable: c.actionable, full: c.full, winched: c.winched },
        ]"
        :aria-label="`${c.ground} ${c.x},${c.y}${c.piece ? ' ' + c.piece : ''}`"
        :data-cell="c.key"
        :disabled="c.ground === 'tower'"
        :repeat="false"
        @click="act(c.x, c.y)"
      >
        <div v-if="c.ground === 'tower'" class="tower-body">
          <div class="lantern"></div>
        </div>
        <template v-else-if="c.piece">
          <PieceGlyph :kind="c.piece" class="piece" />
          <span v-if="c.piece === 'breakwater'" class="tag num">{{ Math.round(c.ward) }}</span>
          <span v-if="c.piece === 'net'" class="hold">
            <span class="hold-fill" :style="{ transform: `scaleX(${c.fill})` }"></span>
          </span>
          <span v-if="c.piece === 'net'" class="tag num">{{ Math.floor(c.held) }}</span>
        </template>
      </Button>
      <div class="beam" aria-hidden="true"></div>
      <div
        v-if="strikeKey"
        :key="strikeKey"
        class="breaker"
        :class="`side-${strikeSide}`"
        aria-hidden="true"
      >
        <span v-if="strikeLeak > 0.05" class="through num">−{{ strikeLeak.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sea {
  position: relative;
  padding: 34px;
  border-radius: 6px;
  background: radial-gradient(circle at 50% 50%, #3d5553 0%, #2b4140 55%, #1e302f 100%);
  overflow: hidden;
  isolation: isolate;
  align-self: center;
}
.sea::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, #17293a 0%, #0f1c2a 60%, #080f17 100%);
  opacity: 0;
  transition: opacity 2.4s ease;
  z-index: 0;
}
.sea.night::before {
  opacity: 1;
}
.swell {
  position: absolute;
  inset: -40px;
  background: repeating-linear-gradient(
    170deg,
    transparent 0 22px,
    rgba(223, 230, 226, 0.045) 22px 24px
  );
  animation: swell 9s linear infinite;
  z-index: 0;
}
@keyframes swell {
  to {
    transform: translate3d(0, 24px, 0);
  }
}
.night .swell {
  animation-duration: 3.5s;
}

/* Wind streaks blow in from tonight's quarter. */
.wind {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.35;
}
.night .wind {
  opacity: 0.8;
}
.wind span {
  position: absolute;
  width: 60px;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, var(--sk-foam), transparent);
  top: calc(var(--i) * 17% - 6%);
  left: -60px;
  animation: gust 4.2s linear infinite;
  animation-delay: calc(var(--i) * -0.83s);
}
.night .wind span {
  animation-duration: 1.6s;
}
@keyframes gust {
  to {
    transform: translate3d(620px, 0, 0);
  }
}
.wind.from-N {
  transform: rotate(90deg);
}
.wind.from-E {
  transform: rotate(180deg);
}
.wind.from-S {
  transform: rotate(270deg);
}

.rock {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(5, 84px);
  grid-template-rows: repeat(5, 84px);
  gap: 4px;
}
.cell {
  position: relative;
  border: 1px solid rgba(15, 20, 22, 0.6);
  border-radius: 5px;
  padding: 0;
  cursor: default;
  background: var(--sk-slate);
  overflow: hidden;
}
.cell.shore {
  background: linear-gradient(160deg, #4a5356, #353d41);
  box-shadow: inset 0 -6px 0 rgba(223, 230, 226, 0.07);
}
.cell.yard {
  background: linear-gradient(160deg, #56614b, #434c3b);
}
.cell.tower {
  background: #2f3739;
  border-color: transparent;
}
.cell.struck {
  box-shadow: inset 0 0 0 2px rgba(196, 87, 62, 0.55);
}
.night .cell.struck {
  box-shadow: inset 0 0 0 2px rgba(196, 87, 62, 0.9);
}
.cell.actionable {
  cursor: pointer;
  outline: 1.5px dashed var(--sk-lamp);
  outline-offset: -5px;
}
.cell.actionable:hover {
  outline-style: solid;
}
.piece {
  position: absolute;
  inset: 10px 14px 18px;
  width: auto;
  height: auto;
}
.tag {
  position: absolute;
  right: 6px;
  top: 4px;
  font-size: 13px;
  color: var(--sk-foam);
  opacity: 0.85;
}
.hold {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 7px;
  height: 5px;
  background: rgba(10, 14, 16, 0.6);
  border-radius: 2px;
  overflow: hidden;
}
.hold-fill {
  display: block;
  height: 100%;
  background: var(--sk-lamp);
  transform-origin: left center;
}
.cell.full .hold-fill {
  background: var(--sk-wrack);
}
.cell.full .tag {
  color: var(--sk-wrack);
  font-weight: 600;
}
.cell.winched .hold-fill {
  background: var(--sk-kelp);
}

.tower-body {
  position: absolute;
  inset: 8px 22px 6px;
  background: linear-gradient(90deg, #d9d6cc, var(--sk-whitewash) 45%, #c8c4b8);
  clip-path: polygon(22% 18%, 78% 18%, 92% 100%, 8% 100%);
}
.lantern {
  position: absolute;
  left: 30%;
  right: 30%;
  top: 0;
  height: 22%;
  background: var(--sk-lamp);
  box-shadow: 0 0 18px var(--sk-lamp);
}

/* The lamp's beam: still by day, sweeping the rock by night. */
.beam {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 900px;
  height: 900px;
  margin: -450px 0 0 -450px;
  background: conic-gradient(
    from 0deg,
    rgba(243, 187, 79, 0.22),
    rgba(243, 187, 79, 0) 26deg,
    rgba(243, 187, 79, 0) 334deg,
    rgba(243, 187, 79, 0.22)
  );
  pointer-events: none;
  opacity: 0.18;
  transition: opacity 2s ease;
  mix-blend-mode: screen;
  transform: rotate(35deg);
}
.night .beam {
  opacity: 1;
  animation: sweep 7s linear infinite;
}
@keyframes sweep {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* A breaker lands on the struck edge: one foam flash per strike. */
.breaker {
  position: absolute;
  pointer-events: none;
  background: linear-gradient(var(--dir), rgba(241, 239, 230, 0.85), rgba(241, 239, 230, 0));
  animation: crash 1.1s ease-out forwards;
}
.breaker.side-N {
  --dir: 180deg;
  left: -20px;
  right: -20px;
  top: -34px;
  height: 70px;
}
.breaker.side-S {
  --dir: 0deg;
  left: -20px;
  right: -20px;
  bottom: -34px;
  height: 70px;
}
.breaker.side-W {
  --dir: 90deg;
  top: -20px;
  bottom: -20px;
  left: -34px;
  width: 70px;
}
.breaker.side-E {
  --dir: 270deg;
  top: -20px;
  bottom: -20px;
  right: -34px;
  width: 70px;
}
@keyframes crash {
  0% {
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
.through {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  color: var(--sk-rust);
  font-weight: 600;
  font-size: 18px;
  text-shadow: 0 1px 2px #000;
}
</style>
