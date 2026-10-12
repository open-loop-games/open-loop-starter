<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { getMeta, getNight } from '../../modules';
import { ACTIONS, ITEM_NAMES, LANDMARKS, type ItemId } from '../../data';
import { clock, secs } from '../format';
import { bumpTimes, moveRow, removeRow } from '../../modules';
import SkillPips from './SkillPips.vue';

const meta = getMeta();
const night = getNight();
const byId = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

const nerve = computed(() => new Decimal(night.nerve.value).toNumber());
const elapsed = computed(() => (night.nightActive.value ? night.cycle.elapsed.value : 0));
const nightLength = computed(() => Math.max(1, elapsed.value + nerve.value));
const nerveShare = computed(() => nerve.value / nightLength.value);
const low = computed(() => night.nightActive.value && nerve.value < 0.2 * night.nerveCap.value);

const ghosts = computed(() =>
  Object.entries(meta.lastSplits.value).map(([d, t]) => ({
    d,
    at: Math.min(1, t / nightLength.value),
    t,
  })),
);
const marks = computed(() =>
  Object.entries(night.splits.value).map(([d, t]) => ({
    d,
    at: Math.min(1, t / nightLength.value),
    t,
  })),
);

const planEdited = computed(
  () => night.nightActive.value && night.planStamp.value !== JSON.stringify(meta.plan.value),
);

/** Tonight's executions folded back onto the plan rows they came from. */
const rows = computed(() => {
  const items = night.actions.sequencer.items.value;
  const cursor = night.actions.sequencer.cursor;
  const current = night.actions.sequencer.currentItem;
  const tonight = night.nightActive.value && !planEdited.value;
  return meta.plan.value.map((row, i) => {
    const def = byId[row.id];
    const eta = night.actionSeconds(row.id) / night.actionSpeed(row.id);
    if (!tonight) return { row, def, eta, done: 0, skipped: 0, running: null as number | null };
    let done = 0;
    let skipped = 0;
    items.forEach((it, idx) => {
      if (it.metadata.payload.row !== i) return;
      if (it.metadata.status === 'completed') done++;
      // A list slot the cursor passed without completing was skipped: ActionCategory
      // reports the skip as 'failed' through its event but leaves the slot 'pending'.
      else if (idx < cursor) skipped++;
    });
    const running =
      current && current.metadata.payload.row === i
        ? Math.min(1, (current.metadata.progress as number) / night.actionSeconds(row.id))
        : null;
    return { row, def, eta, done, skipped, running };
  });
});

const planSeconds = computed(() => rows.value.reduce((s, r) => s + r.eta * r.row.times, 0));
const carried = computed(() =>
  (Object.keys(night.items) as ItemId[])
    .map((k) => ({ k, n: new Decimal(night.items[k].value).toNumber() }))
    .filter((x) => x.n > 0),
);

const status = computed(() => {
  if (!night.nightActive.value) return night.lastNight.value ? 'between' : 'first';
  if (night.planExhausted.value) return 'dark';
  return 'running';
});
const summary = computed(() => night.lastNight.value);
</script>

<template>
  <section class="lo-panel lo-night" aria-label="Tonight">
    <div class="lo-nerve" :class="{ low, idle: !night.nightActive.value }">
      <div class="lo-nerve-read">
        <span class="lo-nerve-label">Nerve</span>
        <span class="lo-nerve-num lo-num">{{ nerve.toFixed(1) }}</span>
        <span class="lo-nerve-unit">s</span>
      </div>
      <div class="lo-nerve-clock">
        <span class="lo-nerve-label">Night clock</span>
        <span class="lo-num">{{ clock(elapsed) }}</span>
      </div>
      <div class="lo-actions">
        <Button v-if="!night.nightActive.value" class="lo-go" @click="night.beginNight()"
          >Begin night</Button
        >
        <Button v-else class="lo-stop" @click="night.turnIn()">Turn in</Button>
      </div>
    </div>

    <!-- The night strip: elapsed dark, remaining Nerve lit; last night's landmarks ghosted. -->
    <div class="lo-strip" aria-hidden="true">
      <div class="lo-strip-lit" :style="{ transform: `scaleX(${nerveShare})` }" />
      <span
        v-for="m in ghosts"
        :key="'g' + m.d"
        class="lo-tick ghost"
        :style="{ left: `${m.at * 100}%` }"
        :title="`last night: ${LANDMARKS[+m.d]} at ${clock(m.t)}`"
      />
      <span
        v-for="m in marks"
        :key="'m' + m.d"
        class="lo-tick now"
        :style="{ left: `${m.at * 100}%` }"
        :title="`tonight: ${LANDMARKS[+m.d]} at ${clock(m.t)}`"
      />
    </div>

    <p class="lo-status">
      <template v-if="status === 'first'">Lights out in Cell 4471. Write a plan, then go.</template>
      <template v-else-if="status === 'running'"
        >The plan is running. Every second costs Nerve.</template
      >
      <template v-else-if="status === 'dark'"
        >The plan is spent. You stand in the dark, waiting to be found.</template
      >
      <template v-else-if="summary">
        Night {{ summary.night }}:
        <strong v-if="summary.escaped" class="lo-out"
          >over the wall at {{ clock(summary.seconds) }}.</strong
        >
        <template v-else-if="summary.cause === 'turned-in'"
          >turned in at {{ clock(summary.seconds) }}.</template
        >
        <template v-else>nerve broke at {{ clock(summary.seconds) }}.</template>
        <span class="lo-take lo-num">+{{ summary.intel }} Intel</span>
      </template>
    </p>

    <div v-if="carried.length" class="lo-carried">
      <span v-for="c in carried" :key="c.k" class="lo-item lo-num"
        >{{ ITEM_NAMES[c.k] }} {{ c.n }}</span
      >
    </div>

    <div class="lo-plan-head">
      <h2>The Plan</h2>
      <span class="lo-plan-total lo-num" title="Plan length at your current skill"
        >≈ {{ secs(planSeconds) }} of work</span
      >
    </div>
    <p v-if="planEdited" class="lo-edited">Plan changed — it takes effect next night.</p>
    <ol class="lo-plan">
      <li
        v-for="(r, i) in rows"
        :key="i"
        class="lo-row"
        :class="{
          running: r.running !== null,
          done: r.done >= r.row.times,
          skipped: r.skipped > 0,
        }"
      >
        <span class="lo-row-idx lo-num">{{ i + 1 }}</span>
        <div class="lo-row-body">
          <div class="lo-row-head">
            <span class="lo-row-name">{{ r.def.displayName }}</span>
            <SkillPips :weights="r.def.weights" />
            <span class="lo-row-count lo-num">
              <template v-if="night.nightActive.value && !planEdited">{{ r.done }}/</template
              >{{ r.row.times }}
            </span>
          </div>
          <div class="lo-bar">
            <div
              class="lo-bar-fill"
              :style="{
                transform: `scaleX(${r.running !== null ? r.running : r.done >= r.row.times && night.nightActive.value ? 1 : 0})`,
              }"
            />
          </div>
          <span v-if="r.skipped" class="lo-row-skip"
            >skipped ×{{ r.skipped }} — not reachable or not carrying what it needs</span
          >
        </div>
        <span class="lo-row-eta lo-num">{{ secs(r.eta) }}</span>
        <div class="lo-row-tools">
          <Button aria-label="One fewer" @click="bumpTimes(i, -1)">−</Button>
          <Button aria-label="One more" @click="bumpTimes(i, 1)">+</Button>
          <Button aria-label="Move up" @click="moveRow(i, -1)">↑</Button>
          <Button aria-label="Move down" @click="moveRow(i, 1)">↓</Button>
          <Button aria-label="Remove" class="lo-x" @click="removeRow(i)">✕</Button>
        </div>
      </li>
    </ol>
    <p v-if="!rows.length" class="lo-empty">
      An empty plan is a night spent on the bunk. Add moves from Known Ground.
    </p>
  </section>
</template>

<style scoped>
.lo-nerve {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 26px;
}
.lo-nerve-read {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.lo-nerve-label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lo-ink-faded);
}
.lo-nerve-read .lo-nerve-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  align-self: center;
}
.lo-nerve-num {
  font-family: var(--lo-face-stencil);
  font-size: 54px;
  line-height: 1;
  color: var(--lo-sodium);
  min-width: 4.2ch;
  text-align: right;
}
.lo-nerve.idle .lo-nerve-num {
  color: var(--lo-sodium-dim);
}
.lo-nerve.low .lo-nerve-num {
  color: var(--lo-jumpsuit);
}
.lo-nerve-unit {
  color: var(--lo-ink-faded);
  font-family: var(--lo-face-stencil);
}
.lo-nerve-clock .lo-num {
  font-family: var(--lo-face-stencil);
  font-size: 24px;
  color: var(--lo-searchlight);
  display: inline-block;
  min-width: 6ch;
}
.lo-actions {
  margin-left: auto;
}
.lo-go,
.lo-stop {
  font-family: var(--lo-face-stencil);
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 9px 14px;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 2px;
}
.lo-go {
  background: var(--lo-sodium);
  color: var(--lo-night);
  border: 1px solid var(--lo-sodium);
}
.lo-stop {
  background: transparent;
  color: var(--lo-jumpsuit);
  border: 1px solid var(--lo-jumpsuit);
}
.lo-strip {
  position: relative;
  height: 16px;
  margin: 12px 0 6px;
  background: repeating-linear-gradient(90deg, var(--lo-night) 0 9px, #0e141b 9px 10px);
  border: 1px solid var(--lo-concrete-edge);
}
.lo-strip-lit {
  position: absolute;
  inset: 0;
  transform-origin: right center;
  background: linear-gradient(90deg, var(--lo-sodium-dim), var(--lo-sodium));
  transition: transform 120ms linear;
}
.lo-nerve.low + .lo-strip .lo-strip-lit {
  background: linear-gradient(90deg, #7a3a1a, var(--lo-jumpsuit));
}
.lo-tick {
  position: absolute;
  top: -5px;
  bottom: -5px;
  width: 2px;
  margin-left: -1px;
}
.lo-tick.ghost {
  background: var(--lo-ink-faded);
  opacity: 0.7;
}
.lo-tick.now {
  background: var(--lo-searchlight);
  box-shadow: 0 0 6px var(--lo-searchlight);
}
.lo-status {
  margin: 4px 0 8px;
  min-height: 1.4em;
  color: var(--lo-chalk);
}
.lo-out {
  color: var(--lo-guard-lamp);
  font-weight: 600;
}
.lo-take {
  margin-left: 8px;
  color: var(--lo-sodium);
}
.lo-carried {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.lo-item {
  font-size: 13px;
  padding: 1px 8px;
  border: 1px solid var(--lo-concrete-edge);
  border-radius: 2px;
  color: var(--lo-searchlight);
}
.lo-plan-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 10px;
}
.lo-plan-head h2 {
  margin: 0 0 8px;
  font-family: var(--lo-face-stencil);
  font-weight: normal;
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lo-ink-faded);
}
.lo-plan-total {
  font-size: 13px;
  color: var(--lo-ink-faded);
}
.lo-edited {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--lo-sodium);
}
.lo-plan {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lo-row {
  display: grid;
  grid-template-columns: 2.2ch 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  background: var(--lo-concrete-raised);
  border-radius: var(--lo-radius);
  border: 1px solid transparent;
}
.lo-row.running {
  border-color: var(--lo-sodium-dim);
}
.lo-row.done .lo-row-name {
  color: var(--lo-guard-lamp);
}
.lo-row.skipped {
  border-color: var(--lo-jumpsuit-dim);
}
.lo-row-idx {
  color: var(--lo-ink-faded);
  font-size: 13px;
  text-align: right;
}
.lo-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lo-row-name {
  color: var(--lo-chalk);
}
.lo-row-count {
  margin-left: auto;
  color: var(--lo-searchlight);
  font-size: 13px;
}
.lo-bar {
  height: 4px;
  margin-top: 4px;
  background: var(--lo-night);
  overflow: hidden;
}
.lo-bar-fill {
  height: 100%;
  transform-origin: left center;
  background: var(--lo-sodium);
}
.lo-row.done .lo-bar-fill {
  background: var(--lo-guard-lamp);
}
.lo-row-skip {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--lo-jumpsuit);
}
.lo-row-eta {
  font-size: 13px;
  color: var(--lo-ink-faded);
  min-width: 5ch;
  text-align: right;
}
.lo-row-tools {
  display: flex;
  gap: 2px;
}
.lo-row-tools button {
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--lo-concrete-edge);
  color: var(--lo-ink-faded);
  cursor: pointer;
  border-radius: 2px;
  font-size: 12px;
}
.lo-row-tools button:hover {
  color: var(--lo-searchlight);
  border-color: var(--lo-bars);
}
.lo-row-tools .lo-x:hover {
  color: var(--lo-jumpsuit);
  border-color: var(--lo-jumpsuit);
}
.lo-empty {
  font-size: 13px;
  color: var(--lo-ink-faded);
}
</style>
