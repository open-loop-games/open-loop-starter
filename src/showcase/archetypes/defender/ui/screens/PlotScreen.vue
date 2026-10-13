<!--
  PlotScreen — one plot, from the first planting to the last night. Along the
  top: the night, the compost, the seedlings and the clock to dusk, with the
  one action that moves time on. The board in the middle; at its side the plant
  tags, the plant being looked at, and what tonight brings. Planting is only
  possible by day: once a wave walks, the gardener watches.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import type { ResourceReadout } from '@/ui/compositions/ResourceHeaderStrip';
import {
  MAX_LEVEL,
  PEST_TEXT,
  PLANT_TEXT,
  REFUND_RATE,
  composeWave,
  type PestKind,
  type PlantId,
} from '../../data';
import { getGarden, getPlot, type PlotRun } from '../../modules';
import { seconds, whole } from '../format';
import PlantGlyph from '../components/PlantGlyph.vue';
import PlantingBoard from '../components/PlantingBoard.vue';

const props = defineProps<{ run: PlotRun }>();

const garden = getGarden();
const plot = getPlot();
const PLANTS: PlantId[] = ['hedge', 'thrush', 'trap', 'marigold', 'ladybird'];

const tool = ref<PlantId | null>(null);
const selected = ref<number | null>(null);
const hover = ref<{ x: number; y: number } | null>(null);
const notice = ref('');

/** Every read of the run goes through this, so a step re-renders what it changed. */
const tick = computed(() => props.run.version.value);
const phase = computed(() => (void tick.value, props.run.phase));
const compost = computed(() => new Decimal(plot.compost.value).toNumber());
const seedlings = computed(() => new Decimal(plot.seedlings.value).toNumber());
const seedlingsAtStart = new Decimal(plot.seedlings.value).toNumber();

// The strip's readout shape, rendered as the garden's own stamped stocks.
const readouts: ResourceReadout[] = [
  { id: 'compost', label: 'Compost', value: plot.compost },
  { id: 'seedlings', label: 'Seedlings', value: plot.seedlings },
];

const clock = computed(() => {
  void tick.value;
  const r = props.run;
  if (r.phase === 'build' && r.held)
    return { label: 'The first night waits for you', fill: 1, held: true };
  if (r.phase === 'build') {
    return {
      label: `Dusk in ${seconds(r.buildTimer)}`,
      fill: r.buildTimer / r.buildDuration,
      held: false,
    };
  }
  if (r.phase === 'wave') {
    const out = r.pests.length;
    return { label: out ? `${out} still in the beds` : 'The last of them…', fill: 0, held: false };
  }
  return {
    label: r.phase === 'won' ? 'The plot is held' : 'The seedbed is gone',
    fill: 0,
    held: false,
  };
});
const bonus = computed(() => (void tick.value, props.run.earlyCallBonus()));

const tags = computed(() =>
  PLANTS.map((id) => {
    const spec = garden.specs.value[id];
    return {
      id,
      name: PLANT_TEXT[id].displayName,
      cost: spec.cost,
      learned: garden.isPlantUnlocked(id),
      at: spec.unlockLevel,
      can: garden.isPlantUnlocked(id) && compost.value >= spec.cost,
    };
  }),
);

const looked = computed(() => {
  void tick.value;
  if (selected.value === null) return null;
  const p = props.run.plants.get(selected.value);
  if (!p) return null;
  const spec = garden.specs.value[p.def];
  const price = props.run.upgradePrice(p.id);
  return {
    plant: p,
    name: PLANT_TEXT[p.def].displayName,
    description: PLANT_TEXT[p.def].description,
    damage: spec.damage > 0 ? props.run.plantDamage(p) / spec.cooldown : null,
    reach: props.run.plantRange(p),
    price,
    canUpgrade: phase.value === 'build' && price !== null && compost.value >= price,
    maxed: spec.damage > 0 && p.level >= MAX_LEVEL,
    refund: Math.floor(p.spent * REFUND_RATE),
  };
});

/** Tonight's pests, grouped by kind. */
const tonight = computed(() => {
  void tick.value;
  const r = props.run;
  const groups = new Map<PestKind, { n: number; hp: number }>();
  for (const s of composeWave(garden.anchors.value, r.plotIndex, r.wave)) {
    const g = groups.get(s.kind) ?? { n: 0, hp: s.hp };
    g.n += 1;
    groups.set(s.kind, g);
  }
  return [...groups].map(([kind, g]) => ({ kind, name: PEST_TEXT[kind], ...g }));
});

const hint = computed(() => {
  if (phase.value === 'wave')
    return 'Night has fallen. Nothing can be planted until the wave is over.';
  if (tool.value && hover.value) {
    const r = props.run.canPlant(tool.value, hover.value.x, hover.value.y);
    if (!r.ok) return r.reason ?? '';
  }
  if (notice.value) return notice.value;
  if (tool.value)
    return `Planting ${PLANT_TEXT[tool.value].displayName}. Right-click or Esc to put it down.`;
  return 'Pick a plant from the tags, or a plant in the beds to look at it. The silver trail is the way the pests will come.';
});

function pick(id: PlantId) {
  tool.value = tool.value === id ? null : id;
  selected.value = null;
}

function onCell(x: number, y: number) {
  const r = props.run;
  const here = r.grid.at(x, y).plantId;
  if (tool.value) {
    const before = r.route().length - 1;
    if (r.plant(tool.value, x, y)) {
      const after = r.route().length - 1;
      notice.value = after !== before ? `The path is now ${after} cells (was ${before}).` : '';
      if (
        !garden.isPlantUnlocked(tool.value) ||
        compost.value < garden.specs.value[tool.value].cost
      )
        tool.value = null;
    }
    return;
  }
  selected.value = here === selected.value ? null : here;
}

function digUp() {
  if (selected.value === null) return;
  const before = props.run.route().length - 1;
  if (props.run.digUp(selected.value)) {
    const after = props.run.route().length - 1;
    notice.value = after !== before ? `The path is now ${after} cells (was ${before}).` : '';
    selected.value = null;
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    tool.value = null;
    selected.value = null;
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= PLANTS.length && tags.value[n - 1].learned) pick(PLANTS[n - 1]);
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const over = computed(() => phase.value === 'won' || phase.value === 'lost');
</script>

<template>
  <section class="wg-plotscreen">
    <header class="wg-hud">
      <div class="where">
        <h2 class="wg-heading">{{ run.def.displayName }}</h2>
        <span class="night">
          night <span class="wg-num">{{ run.wave }}</span> of
          <span class="wg-num">{{ run.totalWaves }}</span>
        </span>
      </div>
      <dl class="wg-stocks">
        <div v-for="r in readouts" :key="r.id" :data-readout-id="r.id">
          <dd class="wg-num">{{ whole(r.value.value) }}</dd>
          <dt class="wg-label">{{ r.label }}</dt>
        </div>
      </dl>
      <div class="seedbed" :class="{ hurt: seedlings < seedlingsAtStart }" aria-hidden="true">
        <i v-for="i in seedlingsAtStart" :key="i" :class="{ gone: i > seedlings }" />
      </div>
      <div class="clock">
        <span class="when">{{ clock.label }}</span>
        <ProgressBar :value="clock.fill" />
      </div>
      <Button
        v-if="phase === 'build'"
        class="wg-action call"
        :repeat="false"
        data-testid="call-it-a-day"
        @click="run.callEarly()"
      >
        <template v-if="clock.held">Let night fall</template>
        <template v-else>
          Call it a day <span class="wg-num">+{{ whole(bonus) }}</span>
        </template>
      </Button>
      <Button class="wg-quiet" :repeat="false" @click="plot.leavePlot()">
        {{ over ? 'Back to the garden' : 'Leave the plot' }}
      </Button>
    </header>

    <div class="wg-field">
      <div class="board-wrap">
        <PlantingBoard
          :run="run"
          :tool="phase === 'build' ? tool : null"
          :selected="selected"
          @cell="onCell"
          @hover="hover = $event"
          @cancel="tool = null"
        />
        <div v-if="over" class="wg-over" :class="phase" role="status">
          <p class="wg-heading">
            {{ phase === 'won' ? `${run.def.displayName} held` : 'The seedbed is eaten' }}
          </p>
          <p>
            <span class="wg-num">{{ whole(run.score) }}</span> points.
            {{
              phase === 'won'
                ? `${seedlings} seedlings came through.`
                : `You saw off ${run.wave - 1} of ${run.totalWaves} nights.`
            }}
          </p>
          <Button class="wg-action" :repeat="false" @click="plot.leavePlot()"
            >Back to the garden</Button
          >
        </div>
        <p class="wg-hint">{{ hint }}</p>
      </div>

      <aside class="wg-side">
        <div class="tags" role="toolbar" aria-label="Plants">
          <Button
            v-for="(t, i) in tags"
            :key="t.id"
            class="wg-tag"
            :repeat="false"
            :class="{ armed: tool === t.id, can: t.can, unlearned: !t.learned }"
            :disabled="!t.learned || phase !== 'build'"
            :aria-pressed="tool === t.id"
            :title="PLANT_TEXT[t.id].description"
            @click="pick(t.id)"
          >
            <span class="key wg-num">{{ i + 1 }}</span>
            <span class="glyph"><PlantGlyph :id="t.id" /></span>
            <span class="name">{{ t.name }}</span>
            <span v-if="t.learned" class="cost wg-num">{{ t.cost }}</span>
            <span v-else class="cost later">level {{ t.at }}</span>
          </Button>
        </div>

        <div v-if="looked" class="wg-looked">
          <span class="wg-heading">{{ looked.name }}</span>
          <span v-if="looked.plant.level > 1 || looked.damage !== null" class="lvl">
            level {{ looked.plant.level }}<template v-if="looked.maxed"> (full grown)</template>
          </span>
          <p class="desc">{{ looked.description }}</p>
          <dl v-if="looked.damage !== null || looked.reach > 0">
            <template v-if="looked.damage !== null">
              <dt>Damage</dt>
              <dd class="wg-num">{{ looked.damage.toFixed(1) }}/s</dd>
            </template>
            <template v-if="looked.reach > 0">
              <dt>Reach</dt>
              <dd class="wg-num">{{ looked.reach.toFixed(2) }}</dd>
            </template>
          </dl>
          <div class="acts">
            <Button
              v-if="looked.price !== null"
              class="wg-quiet feed"
              :repeat="false"
              :disabled="!looked.canUpgrade"
              @click="run.upgrade(looked.plant.id)"
            >
              Feed it <span class="wg-num">{{ looked.price }}</span>
            </Button>
            <Button class="wg-quiet" :repeat="false" :disabled="phase !== 'build'" @click="digUp">
              Dig up <span class="wg-num">+{{ looked.refund }}</span>
            </Button>
          </div>
        </div>

        <div class="wg-tonight">
          <span class="wg-label">{{ phase === 'wave' ? 'Tonight' : `Night ${run.wave}` }}</span>
          <ul>
            <li v-for="g in tonight" :key="g.kind" :class="g.kind">
              <span class="wg-num n">{{ g.n }}</span> × {{ g.name }}
              <span class="hp"
                ><span class="wg-num">{{ whole(g.hp) }}</span> hp</span
              >
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.wg-plotscreen {
  display: grid;
  gap: 16px;
}
.wg-hud {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 10px 16px;
  background: var(--wg-loam-raised);
  border: 1px solid var(--wg-loam-edge);
  border-radius: 4px;
}
.where {
  display: grid;
}
.where h2 {
  font-size: 22px;
}
.night {
  font-size: 14px;
  color: var(--wg-twine);
}
.wg-stocks {
  display: flex;
  gap: 22px;
  margin: 0;
}
.wg-stocks > div {
  display: grid;
  justify-items: start;
}
.wg-stocks dd {
  margin: 0;
  min-width: 3.2ch;
  font-size: 28px;
  line-height: 1;
  color: var(--wg-lantern);
}
.wg-stocks [data-readout-id='seedlings'] dd {
  color: var(--wg-seedling);
}
.seedbed {
  display: grid;
  grid-template-columns: repeat(10, 6px);
  gap: 3px;
}
.seedbed i {
  width: 6px;
  height: 9px;
  border-radius: 3px 3px 1px 1px;
  background: var(--wg-seedling);
}
.seedbed i.gone {
  background: var(--wg-loam-edge);
}
.clock {
  flex: 1;
  display: grid;
  gap: 5px;
  min-width: 160px;
}
.when {
  font-style: italic;
  color: var(--wg-twine);
}
.clock :deep(.olui-progress-bar) {
  --progress-bar-fill: linear-gradient(90deg, #6b4a6e, var(--wg-lantern));
  --progress-bar-track: var(--wg-bed);
}
.call .wg-num {
  margin-left: 4px;
}
.wg-field {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: start;
}
.board-wrap {
  position: relative;
  display: grid;
  gap: 10px;
}
.wg-hint {
  margin: 0;
  min-height: 1.4em;
  font-size: 15px;
  font-style: italic;
  color: var(--wg-twine);
}
.wg-over {
  position: absolute;
  inset: 16px 16px 46px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  text-align: center;
  background: rgba(25, 21, 16, 0.84);
  animation: wg-settle 0.5s ease-out;
}
.wg-over .wg-heading {
  font-size: 30px;
  margin: 0;
}
.wg-over.lost .wg-heading {
  color: var(--wg-loss);
}
.wg-over p {
  margin: 0;
}
.wg-side {
  display: grid;
  gap: 16px;
}
.tags {
  display: grid;
  gap: 6px;
}
.wg-tag {
  display: grid;
  grid-template-columns: 14px 34px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 8px;
  background: #3b4146;
  border: 1px solid #4d5459;
  border-left: 6px solid #2d3236;
  border-radius: 2px 14px 14px 2px;
  color: var(--wg-parchment);
  text-align: left;
  cursor: pointer;
  opacity: 0.62;
  filter: saturate(0.4);
}
.wg-tag.can {
  opacity: 1;
  filter: none;
}
.wg-tag.can .cost {
  color: var(--wg-lantern);
}
.wg-tag.armed {
  border-color: var(--wg-lantern);
  box-shadow:
    0 0 0 1px var(--wg-lantern),
    0 0 14px rgba(232, 169, 74, 0.25);
}
.wg-tag:disabled {
  opacity: 0.5;
}
.wg-tag.unlearned {
  opacity: 0.45;
  cursor: default;
}
.wg-tag:disabled:not(.unlearned) {
  cursor: default;
}
.key {
  font-size: 12px;
  color: var(--wg-zinc);
}
.glyph {
  width: 34px;
  height: 34px;
}
.name {
  font-weight: 500;
}
.cost {
  font-size: 18px;
  color: var(--wg-zinc);
}
.cost.later {
  font-family: var(--wg-face-text);
  font-size: 13px;
  font-style: italic;
}
.wg-looked {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  background: var(--wg-loam-raised);
  border: 1px solid var(--wg-loam-edge);
  border-radius: 3px;
}
.wg-looked .wg-heading {
  font-size: 19px;
}
.lvl {
  font-size: 14px;
  color: var(--wg-twine);
}
.desc {
  margin: 0;
  font-size: 15px;
  color: var(--wg-twine);
}
dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 14px;
  margin: 0;
  font-size: 15px;
}
dt {
  color: var(--wg-twine);
}
dd {
  margin: 0;
}
.acts {
  display: flex;
  gap: 8px;
}
.feed:not(:disabled) {
  border-color: var(--wg-lantern-deep);
  color: var(--wg-lantern);
}
.wg-tonight ul {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.wg-tonight li {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 16px;
}
.wg-tonight .n {
  font-size: 19px;
}
.hp {
  margin-left: auto;
  color: var(--wg-twine);
}
.wg-tonight li.badger {
  color: var(--wg-terracotta);
}
</style>
