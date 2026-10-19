<!--
  FloorQueue — how the floors split their time between the opened kinds. One line per
  open kind: its weight, stepped by hand; the share of floor time that weight buys,
  as starter's ProgressBar over every floor; and what the line makes, or why it stalls.

  The switch stays beside the weight because the two do different work. A weight of 0
  hands the kind's floor time to the other lines. The switch pauses the line: it stops
  drawing scrip and aether, and its floor time idles. The quartermaster sets both every
  second, so while he is on the job the controls are his, and say so.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Switch from '@/ui/components/Switch.vue';
import { BARRACKS } from '../../data/buildings';
import { UNITS, UNIT_KINDS, type UnitKind } from '../../data/units';
import { getMatch } from '../../modules';
import { setWeight } from '../../modules/orders';
import { useHandledBy } from '../handled-by';
import { GLYPH, rate } from '../format';

const { p } = getMatch();
const quartermaster = useHandledBy('quartermaster');

const open = computed(() => UNIT_KINDS.filter((k) => p.opened(k)));
const line = (k: UnitKind) => p.barracks.getProducer(BARRACKS.find((b) => b.trains === k)!.id)!;

function status(k: UnitKind): { text: string; stalled: boolean } {
  if (!p.training[k].value) return { text: 'paused — its floor time idles', stalled: true };
  if (p.floorShare(k) <= 0) return { text: 'no floor time', stalled: false };
  const prod = line(k);
  const limit = prod.limit?.value ?? 'rate';
  if (limit === 'room') return { text: 'no bunks — buy squats', stalled: true };
  if (limit.startsWith('input:')) return { text: `short of ${limit.slice(6)}`, stalled: true };
  return { text: `${rate(toNumber(prod.realizedRate!.value) * 60)} / min`, stalled: false };
}

/** Share of every floor's time, as a whole percent. */
function percent(k: UnitKind): number {
  const floors = p.floorCount();
  return floors > 0 ? Math.round((100 * p.floorShare(k)) / floors) : 0;
}

/** A weight as typed: whole when whole, else two places (the quartermaster writes fractions). */
const weight = (k: UnitKind) => {
  const w = p.queue[k].value;
  return Number.isInteger(w) ? String(w) : w.toFixed(2);
};

function step(k: UnitKind, by: 1 | -1): void {
  setWeight(p, k, p.queue[k].value + by);
}
</script>

<template>
  <section class="queue" aria-label="Floor queue">
    <header class="queue__head">
      <span class="cc-tag">The queue · {{ p.floorCount() }} floors</span>
      <span v-if="quartermaster" class="cc-auto">{{ quartermaster }}</span>
    </header>
    <p v-if="open.length === 0" class="cc-fog">Stand up a tech floor to open a line.</p>
    <div
      v-for="k in open"
      :key="k"
      class="qline"
      :data-stalled="status(k).stalled"
      :data-idle="p.floorShare(k) <= 0"
    >
      <span class="qline__unit" :title="UNITS[k].name"
        ><span class="qline__glyph">{{ GLYPH[k] }}</span
        >{{ UNITS[k].name }}</span
      >
      <span class="qline__weight" role="group" :aria-label="`${UNITS[k].name} weight`">
        <Button
          class="cc-order qline__step"
          :disabled="Boolean(quartermaster) || p.queue[k].value <= 0"
          :aria-label="`Less ${UNITS[k].name}`"
          repeat
          @click="step(k, -1)"
          >−</Button
        >
        <span class="qline__w num">{{ weight(k) }}</span>
        <Button
          class="cc-order qline__step"
          :disabled="Boolean(quartermaster)"
          :aria-label="`More ${UNITS[k].name}`"
          repeat
          @click="step(k, 1)"
          >+</Button
        >
      </span>
      <Switch
        v-model="p.training[k].value"
        :disabled="Boolean(quartermaster)"
        :aria-label="`Training ${UNITS[k].name}`"
      >
        <template #default="{ on }">{{ on ? 'Training' : 'Paused' }}</template>
      </Switch>
      <ProgressBar
        class="cc-gauge qline__share"
        :value="p.floorShare(k)"
        :max="Math.max(1, p.floorCount())"
      />
      <span class="qline__pct num">{{ percent(k) }}%</span>
      <span class="qline__status">{{ status(k).text }}</span>
    </div>
  </section>
</template>

<style scoped>
.queue {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px 9px 8px;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-left: 3px solid var(--cc-sodium-deep);
  border-radius: var(--cc-notch);
}
.queue__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
/* One line: the unit and its weight; the share of floor time it buys; its switch and what
   it makes. */
.qline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'unit unit weight'
    'share share pct'
    'switch status status';
  column-gap: 8px;
  row-gap: 4px;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid var(--cc-gutter);
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.qline__unit {
  grid-area: unit;
  white-space: nowrap;
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cc-chalk);
}
.qline__glyph {
  display: inline-block;
  width: 1.4em;
  color: var(--cc-sodium);
}
.qline__weight {
  grid-area: weight;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.qline__step {
  justify-content: center;
  min-width: 22px;
  padding: 0 5px;
}
/* Kenney High has no tabular figures: a fixed box keeps the steppers still. */
.qline__w {
  display: inline-block;
  min-width: 3ch;
  text-align: center;
  font-family: var(--cc-face-neon);
  font-size: 20px;
  line-height: 0.8;
  color: var(--cc-sodium);
}
.qline :deep(.olui-switch) {
  grid-area: switch;
}
.qline__share {
  grid-area: share;
}
.qline__share.cc-gauge {
  --progress-bar-height: 4px;
  --progress-bar-transition: transform 0.25s linear;
}
.qline__pct {
  grid-area: pct;
  min-width: 4ch;
  text-align: right;
  color: var(--cc-chalk);
}
.qline__status {
  grid-area: status;
  text-align: right;
}
.qline[data-stalled='true'] .qline__status {
  color: var(--cc-short);
}
.qline[data-idle='true'] .qline__w,
.qline[data-idle='true'] .qline__pct {
  color: var(--cc-chalk-faint);
}
</style>
