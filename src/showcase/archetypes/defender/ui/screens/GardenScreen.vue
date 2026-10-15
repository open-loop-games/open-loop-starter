<!--
  GardenScreen — between plots. The gardener's level and what the next one
  takes, the plots (each with its best night), and the almanac: lessons bought
  with the notes each level grants, taken back for free.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import type { ProducerRowData } from '@/ui/compositions/ProducerList';
import {
  LESSONS,
  LESSON_MAX,
  PLANT_TEXT,
  PLOTS,
  wavesIn,
  xpForLevel,
  type LessonDef,
  type PlantId,
} from '../../data';
import { getGarden, getPlot } from '../../modules';
import { inSentence, whole } from '../format';
import PlotResult from '../components/PlotResult.vue';

const garden = getGarden();
const plot = getPlot();

const level = garden.level;
const toNext = computed(() => {
  const from = xpForLevel(level.value);
  const to = xpForLevel(level.value + 1);
  return { value: garden.xp.value - from, max: to - from, left: to - garden.xp.value };
});
const notes = computed(() => new Decimal(garden.notes.value).toNumber());

const plots = computed(() =>
  PLOTS.map((def, i) => {
    const best = garden.records.entries.value[def.id];
    return {
      def,
      waves: wavesIn(garden.anchors.value, i),
      open: garden.plots.isUnlocked(def.id),
      held: garden.held.value.includes(def.id),
      best: best ? best.value.toNumber() : null,
      before: i > 0 ? inSentence(PLOTS[i - 1].displayName) : null,
    };
  }),
);

/** Plants the gardener has yet to learn, and the level each comes with. */
const toLearn = computed(() =>
  (Object.values(garden.specs.value) as { id: PlantId; unlockLevel: number }[])
    .filter((s) => s.unlockLevel > level.value)
    .map((s) => ({ name: PLANT_TEXT[s.id].displayName, at: s.unlockLevel })),
);

interface LessonExtra {
  def: LessonDef;
}
const rows: ProducerRowData<LessonExtra>[] = LESSONS.map((def) => {
  const p = garden.lessons.getPurchasable(def.id)!;
  return {
    id: def.id,
    displayName: def.displayName,
    count: p.count,
    displayRate: computed(() => 0),
    cost: () => 1,
    canPurchase: () => p.canPurchase.value,
    maxAffordable: computed(() => (p.canPurchase.value ? 1 : 0)),
    purchase: () => void p.purchase(1),
    extra: { def },
  };
});
const learned = (row: ProducerRowData<LessonExtra>) => new Decimal(row.count.value).toNumber();
const anyLearned = computed(() => new Decimal(garden.lessons.totalCount.value).gt(0));
</script>

<template>
  <section class="wg-garden">
    <header class="wg-gardener">
      <div class="lvl">
        <span class="wg-label">Gardener</span>
        <span class="wg-num big">{{ level }}</span>
      </div>
      <div class="toward">
        <ProgressBar :value="toNext.value" :max="toNext.max" />
        <span class="hint">
          <span class="wg-num">{{ whole(toNext.left) }}</span> more points from your best nights for
          level {{ level + 1 }}
        </span>
      </div>
      <div class="learn" v-if="toLearn.length">
        <span class="wg-label">Still to learn</span>
        <span v-for="p in toLearn" :key="p.name" class="next"
          >{{ p.name }} <em>at {{ p.at }}</em></span
        >
      </div>
    </header>

    <PlotResult v-if="plot.lastResult.value" :result="plot.lastResult.value" />

    <div class="wg-plots">
      <article
        v-for="p in plots"
        :key="p.def.id"
        class="wg-plot"
        :class="{ open: p.open, held: p.held }"
      >
        <div class="label-tag">
          <h3 class="wg-heading">{{ p.def.displayName }}</h3>
          <span class="waves"
            ><span class="wg-num">{{ p.waves }}</span> nights</span
          >
        </div>
        <p class="blurb">{{ p.def.blurb }}</p>
        <div class="foot">
          <span v-if="p.best !== null" class="best">
            best <span class="wg-num">{{ whole(p.best) }}</span>
            <span v-if="p.held" class="held-mark">held</span>
          </span>
          <span v-else-if="p.open" class="best none">not yet held</span>
          <span v-else class="best none">Hold {{ p.before }} first</span>
          <Button
            v-if="p.open"
            class="wg-action"
            :data-testid="`enter-${p.def.id}`"
            @click="plot.startPlot(p.def.id)"
          >
            Go out
          </Button>
        </div>
      </article>
    </div>

    <p v-if="level === 0 && !anyLearned" class="wg-almanac-later">
      Hold a plot and the gardener learns something: the almanac opens at level 1.
    </p>
    <section v-else class="wg-almanac" aria-label="Almanac">
      <header>
        <h2 class="wg-heading">The almanac</h2>
        <span class="notes">
          <span class="wg-num">{{ notes }}</span> {{ notes === 1 ? 'note' : 'notes' }} to write up
        </span>
        <Button class="wg-quiet" :disabled="!anyLearned" @click="garden.relearn()">
          Start the almanac over
        </Button>
      </header>
      <ProducerList :rows="rows" cost-label="" bulk-mode-source="none">
        <template #row="{ row, purchase }">
          <div class="wg-lesson" :class="{ full: learned(row) >= LESSON_MAX }">
            <div class="name">
              <span class="wg-heading">{{ row.extra!.def.displayName }}</span>
              <span class="desc">{{ row.extra!.def.description }}</span>
            </div>
            <span class="pips" :aria-label="`${learned(row)} of ${LESSON_MAX}`">
              <span
                v-for="i in LESSON_MAX"
                :key="i"
                class="pip"
                :class="{ on: i <= learned(row) }"
              />
            </span>
            <Button class="wg-quiet write" :disabled="!row.canPurchase(1)" @click="purchase()">
              Write up
            </Button>
          </div>
        </template>
      </ProducerList>
    </section>
  </section>
</template>

<style scoped>
.wg-garden {
  display: grid;
  gap: 22px;
}
.wg-gardener {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 14px 18px;
  background: var(--wg-loam-raised);
  border: 1px solid var(--wg-loam-edge);
  border-radius: 4px;
}
.lvl {
  display: grid;
  justify-items: center;
}
.big {
  font-size: 44px;
  line-height: 1;
  color: var(--wg-seedling);
}
.toward {
  display: grid;
  gap: 6px;
}
.toward :deep(.olui-progress-bar) {
  --progress-bar-fill: var(--wg-seedling);
  --progress-bar-track: var(--wg-bed);
}
.hint {
  font-size: 15px;
  color: var(--wg-twine);
}
.learn {
  display: grid;
  gap: 2px;
  font-size: 15px;
}
.learn em {
  color: var(--wg-twine);
}
.wg-plots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.wg-plot {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  padding: 14px 16px 12px;
  background: var(--wg-bed);
  border: 1px solid var(--wg-loam-edge);
  border-top: 6px solid var(--wg-brick);
  border-radius: 3px;
  opacity: 0.55;
}
.wg-plot.open {
  opacity: 1;
}
.wg-plot.held {
  border-top-color: var(--wg-box);
}
.label-tag {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.label-tag h3 {
  font-size: 21px;
}
.waves {
  font-size: 14px;
  color: var(--wg-twine);
  white-space: nowrap;
}
.blurb {
  margin: 0;
  font-size: 15px;
  font-style: italic;
  color: var(--wg-twine);
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
}
.best {
  font-size: 15px;
}
.best .wg-num {
  font-size: 20px;
  color: var(--wg-parchment);
}
.best.none {
  color: var(--wg-zinc);
}
.held-mark {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wg-seedling);
}
.wg-almanac-later {
  margin: 0;
  font-style: italic;
  color: var(--wg-twine);
}
.wg-almanac {
  display: grid;
  animation: wg-settle 0.5s ease-out;
  gap: 10px;
}
.wg-almanac > header {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.wg-almanac h2 {
  font-size: 24px;
}
.notes {
  flex: 1;
  color: var(--wg-twine);
}
.notes .wg-num {
  font-size: 20px;
  color: var(--wg-lantern);
}
.wg-almanac :deep(.producer-list) {
  display: grid;
  gap: 4px;
}
.wg-lesson {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 18px;
  padding: 8px 12px;
  border-bottom: 1px dashed var(--wg-loam-edge);
}
.name {
  display: grid;
}
.name .wg-heading {
  font-size: 18px;
}
.desc {
  font-size: 15px;
  color: var(--wg-twine);
}
.pips {
  display: flex;
  gap: 5px;
}
.pip {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--wg-twine-faint);
}
.pip.on {
  background: var(--wg-seedling);
  border-color: var(--wg-seedling);
}
.write:not(:disabled) {
  border-color: var(--wg-lantern-deep);
  color: var(--wg-lantern);
}
.wg-lesson.full .write {
  visibility: hidden;
}
</style>
