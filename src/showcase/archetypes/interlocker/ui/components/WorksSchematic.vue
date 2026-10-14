<!--
  WorksSchematic — the signature: the works drawn as a cyanotype. Stock sits on gauge
  dials whose arc is bin fill; each workshop is a plate the player staffs with − and +;
  recipes are drafted lines between them. A line is pencilled until its workshop is
  patented, then inked: verdigris while it runs, broken vermilion where that input
  starves the workshop, dotted aluminium where a full output bin blocks it.
  Coordinates are in a 1000×500 drawing space.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import {
  BUILDINGS,
  RECIPES,
  RESEARCH,
  RESOURCES,
  ROLES,
  type ResourceId,
  type RoleId,
} from '../../data';
import { getWorks, type Limit } from '../../modules';
import { rate, stock } from '../format';

const works = getWorks();

const W = 1000;
const H = 530;
const R = 34;

const dial: Record<ResourceId, [number, number]> = {
  spruce: [90, 90],
  bauxite: [90, 215],
  coal: [90, 330],
  bread: [90, 448],
  spars: [450, 90],
  aluminium: [450, 262],
  engines: [840, 380],
  aeroplanes: [910, 160],
};

const plate: Record<RoleId, [number, number]> = {
  sawyer: [270, 90],
  smelter: [270, 262],
  machinist: [650, 380],
  rigger: [650, 160],
};

/** Drafted route for each recipe edge, keyed `role:resource`; the output edge is `role:out`. */
const route: Record<string, string> = {
  'sawyer:spruce': 'M124,90 H195',
  'sawyer:out': 'M345,90 H416',
  'smelter:bauxite': 'M124,215 H160 V250 H195',
  'smelter:coal': 'M124,322 H160 V274 H195',
  'smelter:out': 'M345,262 H416',
  'machinist:aluminium': 'M484,268 H520 V368 H575',
  'machinist:coal': 'M118,350 H140 V412 H560 V392 H575',
  'machinist:out': 'M725,380 H806',
  'rigger:spars': 'M484,90 H540 V146 H575',
  'rigger:aluminium': 'M484,256 H540 V174 H575',
  'rigger:engines': 'M840,346 V280 H650 V194',
  'rigger:out': 'M725,160 H876',
};

const patentName = Object.fromEntries(RESEARCH.map((r) => [r.id, r.name]));

type EdgeState = 'sealed' | 'idle' | 'running' | 'starved' | 'blocked';

function edgeState(
  res: ResourceId | 'out',
  limit: Limit,
  running: boolean,
  open: boolean,
): EdgeState {
  if (!open) return 'sealed';
  if (res !== 'out' && limit === `input:${res}`) return 'starved';
  if (res === 'out' && limit === 'storage') return 'blocked';
  return running ? 'running' : 'idle';
}

const edges = computed(() =>
  ROLES.flatMap((role) => {
    const st = works.roleStatus[role.id];
    const open = works.roleOpen[role.id].value;
    const running = st.cyclesPerSec > 1e-6;
    const ins = Object.keys(RECIPES[role.id].inputs) as ResourceId[];
    return [...ins, 'out' as const].map((res) => ({
      key: `${role.id}:${res}`,
      d: route[`${role.id}:${res}`],
      state: edgeState(res, st.limit, running, open),
    }));
  }),
);

const dials = computed(() =>
  RESOURCES.map((def) => {
    const [x, y] = dial[def.id];
    const value = toNumber(works.res[def.id].value);
    const cap = works.cap[def.id].value;
    const fill = Math.min(1, value / cap);
    const circ = 2 * Math.PI * (R - 5);
    return {
      ...def,
      x,
      y,
      value,
      net: works.net[def.id],
      // Within half a percent: rations nibble a pinned larder just under its lid every tick.
      full: value >= cap * 0.995,
      dash: `${(fill * circ).toFixed(1)} ${circ.toFixed(1)}`,
      // Inked once anything can make it: its building is on the estate, or its workshop is open.
      inked:
        value > 0 ||
        BUILDINGS.some(
          (b) => b.yields === def.id && works.buildings.getPurchasable(b.id)!.visible.value,
        ) ||
        ROLES.some((r) => RECIPES[r.id].output === def.id && works.roleOpen[r.id].value),
    };
  }),
);

const plates = computed(() =>
  ROLES.map((role) => {
    const st = works.roleStatus[role.id];
    const [x, y] = plate[role.id];
    const rec = RECIPES[role.id];
    return {
      ...role,
      x,
      y,
      crew: toNumber(works.crew[role.id].value),
      open: works.roleOpen[role.id].value,
      opensWith: patentName[role.opensWith],
      status: st,
      recipe: `${Object.entries(rec.inputs)
        .map(([k, v]) => `${v} ${k}`)
        .join(
          ' + ',
        )} → ${rec.yields} ${rec.output === 'aeroplanes' ? 'aeroplane' : rec.output.replace(/s$/, '')}`,
      limitText: describe(st.limit),
      canAdd: works.workersIdle.value >= 1,
    };
  }),
);

function describe(limit: Limit): string {
  if (limit === 'locked') return '';
  if (limit === 'unstaffed') return 'no crew';
  if (limit === 'labour') return 'crew-bound';
  if (limit === 'storage') return 'bin full';
  if (limit === 'hunger') return 'crew hungry';
  return `short of ${limit.slice(6)}`;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const fed = computed(() => works.fed.value);
</script>

<template>
  <div class="sheet" :style="{ aspectRatio: `${W} / ${H}` }">
    <svg class="lines" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerUnits="userSpaceOnUse"
          markerWidth="9"
          markerHeight="9"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
        </marker>
      </defs>
      <!-- the drafting grid -->
      <g class="grid">
        <line v-for="i in 19" :key="'v' + i" :x1="i * 50" y1="0" :x2="i * 50" :y2="H" />
        <line v-for="i in 10" :key="'h' + i" x1="0" :y1="i * 50" :x2="W" :y2="i * 50" />
      </g>
      <path
        v-for="e in edges"
        :key="e.key"
        :d="e.d"
        class="edge"
        :class="e.state"
        marker-end="url(#arrow)"
      />
      <path
        d="M124,448 H200"
        class="edge"
        :class="fed < 1 ? 'starved' : 'running'"
        marker-end="url(#arrow)"
      />
      <g v-for="d in dials" :key="d.id" class="dial" :class="{ inked: d.inked, full: d.full }">
        <circle :cx="d.x" :cy="d.y" :r="R" class="rim" />
        <circle
          :cx="d.x"
          :cy="d.y"
          :r="R - 5"
          class="gauge"
          :stroke-dasharray="d.dash"
          :transform="`rotate(-90 ${d.x} ${d.y})`"
        />
      </g>
    </svg>

    <div
      v-for="d in dials"
      :key="d.id"
      class="dial-label"
      :class="{ inked: d.inked, full: d.full }"
      :style="{ left: pct(d.x, W), top: pct(d.y, H) }"
    >
      <span class="dial-value ae-figure">{{ stock(d.value) }}</span>
      <span class="dial-name ae-lettering">{{ d.name }}</span>
      <span class="dial-rate ae-figure" :class="{ up: d.net > 0.005, down: d.net < -0.005 }">{{
        d.full ? 'full' : rate(d.net)
      }}</span>
    </div>

    <div
      class="crew-note"
      :style="{ left: pct(206, W), top: pct(448, H) }"
      :class="{ hungry: fed < 1 }"
    >
      feeds <span class="ae-figure">{{ works.workersTotal.value }}</span> compagnons
      <span v-if="fed < 1" class="ae-figure"> · {{ Math.round(fed * 100) }}% fed</span>
    </div>

    <div
      v-for="p in plates"
      :key="p.id"
      class="plate"
      :class="[{ open: p.open, sealed: !p.open }, `limit-${p.status.limit.split(':')[0]}`]"
      :style="{ left: pct(p.x, W), top: pct(p.y, H) }"
    >
      <template v-if="p.open">
        <header class="ae-lettering">{{ p.workshop }}</header>
        <div class="recipe">{{ p.recipe }}</div>
        <div class="crew">
          <Button
            class="step"
            :aria-label="`Withdraw one of the ${p.name}`"
            :disabled="p.crew < 1"
            @click="works.assign(p.id, -1)"
            >−</Button
          >
          <span class="ae-figure crew-n">{{ p.crew }}</span>
          <span class="crew-label">{{ p.name.toLowerCase() }}</span>
          <Button
            class="step"
            :aria-label="`Seat one more of the ${p.name}`"
            :disabled="!p.canAdd"
            @click="works.assign(p.id, 1)"
            >+</Button
          >
        </div>
        <div class="run ae-figure">
          {{ p.status.cyclesPerSec.toFixed(2)
          }}<span class="of">/{{ p.status.capacityPerSec.toFixed(2) }}</span>
          <span class="limit">{{ p.limitText }}</span>
        </div>
      </template>
      <template v-else>
        <header class="ae-lettering">{{ p.workshop }}</header>
        <div class="sealed-note">unbuilt — needs {{ p.opensWith }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sheet {
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.035), transparent 60%),
    var(--ae-cyanotype);
  border: 1px solid var(--ae-cyanotype-rule);
  outline: 1px solid var(--ae-cyanotype-rule);
  outline-offset: 4px;
  container-type: inline-size;
}
.lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--ae-drafting-line);
}
.grid line {
  stroke: var(--ae-cyanotype-wash);
  stroke-width: 1;
}
.edge {
  fill: none;
  stroke-width: 1.6;
  stroke: var(--ae-drafting-line);
  color: var(--ae-drafting-line);
  vector-effect: non-scaling-stroke;
}
.edge.sealed {
  stroke: var(--ae-drafting-line-faint);
  color: var(--ae-drafting-line-faint);
  stroke-dasharray: 2 5;
  opacity: 0.45;
}
.edge.idle {
  stroke: var(--ae-drafting-line-faint);
  color: var(--ae-drafting-line-faint);
}
.edge.running {
  stroke: var(--ae-verdigris);
  color: var(--ae-verdigris);
  stroke-width: 2.2;
}
.edge.starved {
  stroke: var(--ae-vermilion);
  color: var(--ae-vermilion);
  stroke-dasharray: 7 4;
  stroke-width: 2.2;
}
.edge.blocked {
  stroke: var(--ae-aluminium);
  color: var(--ae-aluminium);
  stroke-dasharray: 1 4;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.dial .rim {
  fill: var(--ae-cyanotype-deep);
  stroke: var(--ae-drafting-line-faint);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}
.dial.inked .rim {
  stroke: var(--ae-drafting-line);
  stroke-dasharray: none;
}
.dial .gauge {
  fill: none;
  stroke: var(--ae-brass-dim);
  stroke-width: 4;
  opacity: 0;
}
.dial.inked .gauge {
  opacity: 1;
}
.dial.full .gauge {
  stroke: var(--ae-aluminium);
}
.dial-label {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  opacity: 0.35;
}
.dial-label > * {
  position: absolute;
  left: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}
.dial-label.inked {
  opacity: 1;
  animation: ae-inked 0.6s ease-out;
}
.dial-value {
  top: 0;
  transform: translate(-50%, -50%);
  font-size: clamp(0.8rem, 1.6cqi, 1.05rem);
  color: var(--ae-chalk);
}
.dial-name {
  top: 4cqi;
  font-size: clamp(0.58rem, 1cqi, 0.72rem);
  color: var(--ae-drafting-line);
}
.dial-rate {
  top: 5.5cqi;
  font-size: clamp(0.62rem, 1.1cqi, 0.8rem);
  color: var(--ae-slate);
}
.crew-note {
  position: absolute;
  transform: translateY(-50%);
  font-size: clamp(0.7rem, 1.25cqi, 0.86rem);
  color: var(--ae-drafting-line);
  font-style: italic;
}
.crew-note.hungry {
  color: var(--ae-vermilion);
}
.plate {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 17cqi;
  padding: 0.5cqi 0.8cqi 0.6cqi;
  background: var(--ae-cyanotype-deep);
  border: 1px solid var(--ae-drafting-line);
  font-size: clamp(0.62rem, 1.15cqi, 0.82rem);
}
.plate.sealed {
  border-style: dashed;
  border-color: var(--ae-drafting-line-faint);
  color: var(--ae-drafting-line-faint);
  background: transparent;
}
.plate.open {
  animation: plate-inked 0.6s ease-out;
}
/* The plate is centred by its own translate, so its ink-in keeps it. */
@keyframes plate-inked {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 4px));
  }
}
.plate.limit-input,
.plate.limit-hunger {
  border-color: var(--ae-vermilion);
}
.plate.limit-storage {
  border-color: var(--ae-aluminium);
}
.plate header {
  font-size: 0.9em;
  color: var(--ae-chalk);
  letter-spacing: 0.14em;
}
.plate.sealed header {
  color: var(--ae-drafting-line-faint);
}
.recipe {
  color: var(--ae-drafting-line-faint);
  font-size: 0.86em;
  margin: 0.1rem 0 0.3rem;
}
.crew {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.crew-n {
  font-size: 1.25em;
  color: var(--ae-chalk);
  min-width: 1.4em;
  text-align: right;
}
.crew-label {
  flex: 1;
  color: var(--ae-drafting-line);
}
.step {
  width: 1.7em;
  height: 1.7em;
  border: 1px solid var(--ae-brass);
  background: transparent;
  color: var(--ae-brass);
  border-radius: var(--ae-plate-radius);
  line-height: 1;
  padding: 0;
}
.step:hover:not(:disabled) {
  background: var(--ae-brass);
  color: var(--ae-cyanotype-deep);
}
.step:disabled {
  border-color: var(--ae-cyanotype-rule);
  color: var(--ae-slate);
  cursor: default;
}
.run {
  margin-top: 0.3rem;
  color: var(--ae-chalk);
  display: flex;
  gap: 0.25rem;
  align-items: baseline;
}
.of {
  color: var(--ae-drafting-line-faint);
  font-size: 0.85em;
}
.limit {
  margin-left: auto;
  font-family: var(--ae-face-lettering);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78em;
  color: var(--ae-slate);
}
.limit-labour .limit {
  color: var(--ae-verdigris);
}
.limit-input .limit,
.limit-hunger .limit {
  color: var(--ae-vermilion);
}
.limit-storage .limit {
  color: var(--ae-aluminium);
}
.sealed-note {
  font-style: italic;
  margin-top: 0.2rem;
}
</style>
