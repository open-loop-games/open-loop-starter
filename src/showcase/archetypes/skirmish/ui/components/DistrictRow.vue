<!--
  DistrictRow — one district between the two safehouses: your squad and its orders on the
  left, the ley-line of control in the middle, the rival (or the fog) on the right. The
  ley-line is starter's ProgressBar: the share that answers to you fills from the left,
  and one mark rides its edge. Every order is a call into the seat's orders module, the
  same path the lieutenants and the rival take.

  A sentry nest stands in its seat's squad row, so it costs the district no height; the
  purchase that raises one is one more order key. The rival's nest is fogged like its squad.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { readPriceLines } from '@/ui/compositions';
import { ECON, SENTRY_NEST } from '../../data/buildings';
import { DISTRICTS, PLAYER_PERSONA } from '../../data/contracts';
import { UNITS, UNIT_KINDS, type UnitKind } from '../../data/units';
import { getMatch } from '../../modules';
import { PRESENCE, countsOf, total } from '../../modules/battle';
import { deploy, deployAll, readyUnits, retreat, setFocus, setStance } from '../../modules/orders';
import { useHandledBy } from '../handled-by';
import { GLYPH, clock, grouped } from '../format';
import NestChip from './NestChip.vue';
import SquadChips from './SquadChips.vue';

const props = defineProps<{ index: number }>();
const match = getMatch();
const { p, e } = match;
const d = DISTRICTS[props.index];
const tactician = useHandledBy('tactician');
const quartermaster = useHandledBy('quartermaster');

const mine = computed(() => countsOf(p.squads[props.index]));
const theirs = computed(() => countsOf(e.squads[props.index]));
const seen = computed(() => match.visible(props.index));
const sighting = computed(() => match.sightings.value[props.index]);
const control = computed(() => match.control[props.index].value);
const held = computed(() => (control.value >= 1 ? 'p' : control.value <= -1 ? 'e' : 'none'));
/** Who took it last: their hustlers work it until the other seat takes it, through any dip. */
const owner = computed(() => match.owner[props.index].value);
const racketsId = ECON.find((def) => def.district === props.index)!.id;
/** Hustlers the owner works here; the rival's only while you can see the district. */
const working = computed(() => {
  if (owner.value === 'none' || (owner.value === 'e' && !seen.value)) return undefined;
  const n = toNumber(match[owner.value].econ.getProducer(racketsId)!.ownedCount.value);
  return n === 1 ? '1 hustler working' : `${n || 'no'} hustlers working`;
});
const stance = computed(() => p.stance[props.index].value);

// ─── Sentry nests ───
const nestMax = computed(() => match.tune.nestHp.value);
const myNest = computed(() => toNumber(p.nests[props.index].hp.value));
/** The rival's nest, only while you can see the district. */
const theirNest = computed(() => (seen.value ? toNumber(e.nests[props.index].hp.value) : 0));
const nestBuy = p.nests[props.index].build;
const nestPrice = computed(() => readPriceLines(nestBuy)[0]);
/** The purchase is offered where the game would take it: your district, no nest standing. */
const nestOffered = computed(() => owner.value === 'p' && myNest.value <= 0);
/** The quartermaster raises one once as many hustlers work here as his persona waits for. */
const nestBy = computed(() => {
  if (!quartermaster.value || !nestOffered.value) return undefined;
  const n = toNumber(p.econ.getProducer(racketsId)!.ownedCount.value);
  return n >= PLAYER_PERSONA.fortifyAt ? quartermaster.value : undefined;
});
/** A squad stands against a nest: the nest holds the district while it stands. */
const nestHolds = computed(() =>
  myNest.value > 0 && total(theirs.value) > PRESENCE
    ? 'p'
    : theirNest.value > 0 && total(mine.value) > PRESENCE
      ? 'e'
      : undefined,
);

const fighting = computed(() => total(mine.value) > PRESENCE && total(theirs.value) > PRESENCE);
const besieging = computed(
  () => held.value === 'p' && stance.value === 'assault' && total(mine.value) > PRESENCE,
);
const besieged = computed(
  () =>
    held.value === 'e' &&
    e.stance[props.index].value === 'assault' &&
    total(theirs.value) > PRESENCE,
);
const ready = computed(() =>
  UNIT_KINDS.map((k) => ({ k, n: readyUnits(p, k) })).filter((r) => r.n > 0),
);
const focusOptions = computed(() => UNIT_KINDS.filter((k) => theirs.value[k] > PRESENCE));
const live = computed(() => match.phase.value === 'live');

/** Share of the ley-line that answers to you: 0 is all theirs, 1 all yours. */
const share = computed(() => (1 + control.value) / 2);
const marks = computed(() => [{ at: share.value, class: 'ley__mark' }]);

function focus(k: UnitKind | 'spread') {
  setFocus(p, props.index, k);
}
</script>

<template>
  <article
    class="district"
    :data-owner="owner"
    :data-fight="fighting || nestHolds !== undefined"
    :data-siege="besieging ? 'out' : besieged ? 'in' : 'none'"
    :aria-label="d.name"
  >
    <div class="district__mine">
      <span class="district__force">
        <SquadChips
          v-if="myNest <= 0 || total(mine) > 0"
          :counts="mine"
          side="p"
          :focus="p.focus[index].value"
        />
        <NestChip v-if="myNest > 0" :hp="myNest" :max="nestMax" side="p" />
      </span>
      <div class="orders">
        <Button
          v-for="r in ready"
          :key="r.k"
          class="cc-order cc-order--send"
          :disabled="!live"
          :title="`Send ${r.n} ${UNITS[r.k].name}`"
          @click="deploy(p, r.k, index)"
        >
          +{{ GLYPH[r.k] }}<span class="num">{{ r.n }}</span>
        </Button>
        <Button
          v-if="ready.length > 1"
          class="cc-order cc-order--send"
          :disabled="!live"
          @click="deployAll(p, index)"
          >Send all</Button
        >
        <Button v-if="total(mine) > 0" class="cc-order" :disabled="!live" @click="retreat(p, index)"
          >Pull back</Button
        >
        <Button
          v-if="held === 'p' && total(mine) > PRESENCE"
          class="cc-order cc-order--assault"
          :aria-pressed="stance === 'assault'"
          :disabled="!live"
          @click="setStance(p, index, stance === 'assault' ? 'hold' : 'assault')"
        >
          {{ stance === 'assault' ? 'Assaulting' : 'Assault' }}
        </Button>
        <template v-if="nestOffered && nestPrice">
          <Button
            class="cc-order cc-order--nest"
            :disabled="!live || !nestBuy.canPurchase.value"
            :title="`${SENTRY_NEST.name}: nobody takes ${d.name} while it stands`"
            @click="nestBuy.purchase(1)"
          >
            ▲ Nest<span class="num" :data-short="nestPrice.short">{{
              grouped(toNumber(nestPrice.amount))
            }}</span>
          </Button>
          <span v-if="nestBy" class="cc-auto" :title="`${nestBy} raises the nest`">{{
            nestBy
          }}</span>
        </template>
      </div>
      <div
        v-if="fighting && focusOptions.length"
        class="focus"
        role="group"
        aria-label="Focus fire"
      >
        <span class="cc-tag">Focus</span>
        <Button
          class="cc-order"
          :aria-pressed="p.focus[index].value === 'spread'"
          @click="focus('spread')"
          >spread</Button
        >
        <Button
          v-for="k in focusOptions"
          :key="k"
          class="cc-order"
          :aria-pressed="p.focus[index].value === k"
          :title="`Focus fire on ${UNITS[k].name}`"
          @click="focus(k)"
        >
          {{ GLYPH[k] }}
        </Button>
      </div>
    </div>

    <div class="district__line">
      <span class="district__name">{{ d.name }}</span>
      <ProgressBar class="cc-gauge ley" :value="share" :marks="marks" />
      <span class="district__state">
        <template v-if="besieging">your crew hits their safehouse</template>
        <template v-else-if="besieged">assault on your safehouse</template>
        <template v-else-if="nestHolds"
          >held by {{ nestHolds === 'p' ? 'your' : 'their' }} nest</template
        >
        <template v-else-if="fighting">fighting</template>
        <template v-else-if="owner !== 'none'"
          >{{ owner === 'p' ? 'yours' : 'theirs'
          }}<template v-if="working"> · {{ working }}</template></template
        >
        <template v-else>contested {{ Math.round(Math.abs(control) * 100) }}%</template>
      </span>
      <span v-if="tactician" class="cc-auto">{{ tactician }}</span>
    </div>

    <div class="district__theirs">
      <span v-if="seen" class="district__force">
        <NestChip v-if="theirNest > 0" :hp="theirNest" :max="nestMax" side="e" />
        <SquadChips v-if="theirNest <= 0 || total(theirs) > 0" :counts="theirs" side="e" />
      </span>
      <template v-else-if="sighting">
        <SquadChips :counts="sighting.counts" side="e" dim />
        <span class="cc-fog">last seen {{ clock(sighting.at) }}</span>
      </template>
      <span v-else class="cc-fog">▒▒ no eyes here ▒▒</span>
    </div>
  </article>
</template>

<style scoped>
.district {
  display: grid;
  grid-template-columns: 1fr 210px 1fr;
  gap: var(--gap);
  align-items: center;
  padding: 10px 12px;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  position: relative;
}
.district[data-fight='true'] {
  border-color: color-mix(in srgb, var(--cc-chalk) 25%, var(--cc-gutter));
}
.district[data-siege='out'] {
  border-color: var(--cc-sodium-deep);
  box-shadow: inset 0 0 0 1px var(--cc-sodium-glow);
}
.district[data-siege='in'] {
  border-color: var(--cc-rival-deep);
  box-shadow: inset 0 0 0 1px var(--cc-rival-glow);
}
.district__mine,
.district__theirs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.district__theirs {
  align-items: flex-end;
  text-align: right;
}
.district__line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.district__name {
  font-family: var(--cc-face-sign);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.district__state {
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.district[data-owner='p'] .district__state {
  color: var(--cc-sodium);
}
.district[data-owner='e'] .district__state {
  color: var(--cc-rival);
}
/* The ley-line: the rival's share is the track, yours the fill, and a diamond rides the edge. */
.ley.cc-gauge {
  --progress-bar-height: 4px;
  --progress-bar-track: var(--cc-rival-deep);
  --progress-bar-fill: linear-gradient(
    90deg,
    var(--cc-sodium),
    color-mix(in srgb, var(--cc-sodium) 60%, var(--cc-ley))
  );
  --progress-bar-transition: transform 0.3s linear;
}
.ley :deep(.ley__mark) {
  top: -4px;
  bottom: auto;
  width: 10px;
  height: 12px;
  margin-left: -5px;
  border: 1px solid var(--cc-chalk);
  background: var(--cc-asphalt);
  transform: rotate(45deg) scale(0.75);
  /* The bar places a mark by its inline `left`; easing it keeps the diamond on the fill's edge. */
  transition: left 0.3s linear;
}
.district__force {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
/* A nest is bought with scrip: its price in brass, short-rust while you cannot pay. */
.cc-order--nest .num {
  color: var(--cc-brass);
}
.cc-order--nest .num[data-short='true'] {
  color: var(--cc-short);
}
.orders,
.focus {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
</style>
