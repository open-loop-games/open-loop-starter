<!--
  CommandCard — under the field: what is selected and what it can be ordered to do. The
  left column selects, the right one orders, so every order the field gives has a button
  here on the same selection: pick a place or a convoy, toggle the kinds a squad sends,
  send it somewhere, and add the districts it walks through first.

  One selected place opens its card (DistrictCard, HouseCard) with the orders that belong
  to the place rather than the move. The rival's convoys you can see are listed too, with
  the road each is on; they take no order.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { DISTRICTS } from '../../data/contracts';
import type { Place } from '../../data/map';
import { UNITS, UNIT_KINDS } from '../../data/units';
import { getMatch } from '../../modules';
import { countsOf, total } from '../../modules/battle';
import { readyUnits } from '../../modules/orders';
import { destination, roadsLeft } from '../../modules/travel';
import { moveSelection, samePick, select, type Pick, type Selection } from '../command';
import { GLYPH, placeName } from '../format';
import DistrictCard from './DistrictCard.vue';
import HouseCard from './HouseCard.vue';
import SquadChips from './SquadChips.vue';

const props = defineProps<{ selection: Selection }>();
const match = getMatch();
const { p } = match;
const rival = computed(() => match.contract.value.rival);
const live = computed(() => match.phase.value === 'live');

const PLACES: { place: Place; label: string }[] = [
  { place: 'p', label: 'Home' },
  ...DISTRICTS.map((d, i) => ({ place: i, label: d.name })),
];
const DISTRICT_INDEXES = DISTRICTS.map((_, i) => i);

const picked = (pick: Pick) => props.selection.picks.some((q) => samePick(q, pick));
function choose(pick: Pick, e: { shiftKey: boolean }) {
  select(props.selection, [pick], e.shiftKey ? 'toggle' : 'replace');
}

const convoys = computed(() => p.convoys.value);
const theirs = computed(() => match.seenConvoys());
const eta = (roads: number) => Math.ceil(roads * match.tune.hopS.value);

/** The one place selected, whose card opens. */
const only = computed(() => {
  const [first, ...rest] = props.selection.picks;
  return first?.kind === 'squad' && rest.length === 0 ? first.place : undefined;
});
/** Units of yours the selection holds: a squad's, home's ready ones, a convoy's. */
const movable = computed(() =>
  props.selection.picks.some((pick) => {
    if (pick.kind === 'convoy') return true;
    if (pick.place === 'p') return UNIT_KINDS.some((k) => readyUnits(p, k) > 0);
    return typeof pick.place === 'number' && total(countsOf(p.squads[pick.place]!)) > 0;
  }),
);
const squadPicked = computed(() => props.selection.picks.some((q) => q.kind === 'squad'));

function send(to: Place) {
  moveSelection(p, props.selection, to);
}
function toggleVia(i: number) {
  const via = props.selection.via;
  const at = via.indexOf(i);
  if (at >= 0) via.splice(at, 1);
  else via.push(i);
}
</script>

<template>
  <section class="card" aria-label="Command card">
    <div class="card__select">
      <span class="cc-tag">Select</span>
      <div class="card__places" role="group" aria-label="Places">
        <Button
          v-for="pl in PLACES"
          :key="String(pl.place)"
          class="cc-order"
          :aria-label="`Select ${pl.label}`"
          :aria-pressed="picked({ kind: 'squad', place: pl.place })"
          @click="choose({ kind: 'squad', place: pl.place }, $event)"
          >{{ pl.label }}</Button
        >
        <Button
          class="cc-order card__rival"
          :aria-label="`Select ${rival}`"
          :aria-pressed="picked({ kind: 'squad', place: 'e' })"
          @click="choose({ kind: 'squad', place: 'e' }, $event)"
          >{{ rival }}</Button
        >
      </div>
      <span class="cc-tag">On the roads</span>
      <ul v-if="convoys.length || theirs.length" class="card__roads">
        <li v-for="c in convoys" :key="`p${c.id}`">
          <Button
            class="cc-order convoy"
            :aria-label="`Convoy to ${placeName(destination(c), rival)}`"
            :aria-pressed="picked({ kind: 'convoy', id: c.id })"
            @click="choose({ kind: 'convoy', id: c.id }, $event)"
          >
            <SquadChips :counts="c.counts" side="p" />
            <span class="convoy__where">→ {{ placeName(destination(c), rival) }}</span>
            <span class="num convoy__eta">{{ eta(roadsLeft(c)) }}s</span>
          </Button>
        </li>
        <li v-for="c in theirs" :key="`e${c.id}`" class="convoy convoy--theirs">
          <SquadChips :counts="c.counts" side="e" />
          <span class="convoy__where"
            >{{ placeName(c.from, rival) }} → {{ placeName(c.path[0]!, rival) }}</span
          >
        </li>
      </ul>
      <span v-else class="cc-fog">Nobody on the roads you can see.</span>
    </div>

    <div class="card__place">
      <DistrictCard v-if="typeof only === 'number'" :index="only" />
      <HouseCard v-else-if="only === 'p' || only === 'e'" :side="only" />
      <p v-else class="card__hint">
        Click a place on the field, or drag a box around your squads. Right-click a place to send
        them; shift+right-click adds a waypoint.
      </p>
    </div>

    <div class="card__move" role="group" aria-label="Move orders">
      <template v-if="movable">
        <span class="cc-tag">Send to</span>
        <div class="move__row">
          <Button
            v-for="pl in PLACES"
            :key="String(pl.place)"
            class="cc-order cc-order--send"
            :aria-label="`Send to ${pl.label}`"
            :disabled="!live"
            @click="send(pl.place)"
            >{{ pl.label }}</Button
          >
        </div>
        <span class="cc-tag">Through</span>
        <div class="move__row">
          <Button
            v-for="i in DISTRICT_INDEXES"
            :key="i"
            class="cc-order"
            :aria-label="`Through ${DISTRICTS[i]!.name}`"
            :aria-pressed="selection.via.includes(i)"
            @click="toggleVia(i)"
            >{{ DISTRICTS[i]!.name
            }}<span v-if="selection.via.includes(i)" class="num move__step">{{
              selection.via.indexOf(i) + 1
            }}</span></Button
          >
        </div>
        <template v-if="squadPicked">
          <span class="cc-tag">Kinds sent</span>
          <div class="move__row">
            <Button
              v-for="k in UNIT_KINDS"
              :key="k"
              class="cc-order move__kind"
              :aria-label="`Send ${UNITS[k].name}`"
              :aria-pressed="selection.kinds[k]"
              :title="`${UNITS[k].name}: ${selection.kinds[k] ? 'sent' : 'stay'}`"
              @click="selection.kinds[k] = !selection.kinds[k]"
              >{{ GLYPH[k] }}</Button
            >
          </div>
        </template>
      </template>
      <span v-else class="cc-fog">Select your units to move them.</span>
    </div>
  </section>
</template>

<style scoped>
/* Three columns, each scrolling on its own, so a tall place card never pushes the move
   orders out of view. */
.card {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 1.5fr) minmax(220px, 1fr);
  gap: 12px;
  padding: 10px 12px;
  min-height: 0;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
}
.card__select,
.card__place,
.card__move {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}
.card__place,
.card__move {
  padding-left: 12px;
  border-left: 1px solid var(--cc-gutter);
}
.card__move {
  gap: 5px;
}
.card__places {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.card__rival {
  color: var(--cc-rival);
}
.card__roads {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.convoy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
/* A picked convoy keeps its chips legible: an outline, not the pressed fill. */
.cc-order.convoy[aria-pressed='true'],
.cc-order.convoy[aria-pressed='true']:hover:not(:disabled) {
  background: var(--cc-asphalt-lit);
  border-color: var(--cc-sodium);
  box-shadow: inset 0 0 0 1px var(--cc-sodium-glow);
  color: var(--cc-chalk);
}
.convoy__where {
  color: var(--cc-chalk-dim);
}
.convoy--theirs .convoy__where {
  color: var(--cc-rival);
}
.convoy__eta {
  display: inline-block;
  min-width: 3.5ch;
  text-align: right;
  color: var(--cc-chalk);
  font-variant-numeric: tabular-nums;
}
.move__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.move__step {
  margin-left: 5px;
  font-weight: 700;
}
/* Every kind is on by default: an on kind is lit text, an off one struck out, so the row
   stays quiet until the player narrows it. */
.cc-order.move__kind[aria-pressed='true'],
.cc-order.move__kind[aria-pressed='true']:hover:not(:disabled) {
  background: var(--cc-asphalt);
  border-color: var(--cc-sodium-deep);
  color: var(--cc-sodium);
}
.cc-order.move__kind[aria-pressed='false'] {
  color: var(--cc-chalk-faint);
  text-decoration: line-through;
}
.card__hint {
  margin: 0;
  font-size: 12px;
  color: var(--cc-chalk-dim);
}
</style>
