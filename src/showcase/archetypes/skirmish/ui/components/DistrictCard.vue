<!--
  DistrictCard — the selected district in the command card: the ley-line of control, your
  squad and the rival's (or the fog), and the orders that belong to the place rather than
  the move: assault, focus fire and the sentry nest. The ley-line is starter's ProgressBar:
  the share that answers to you fills from the left, and one mark rides its edge. Every
  order is a call into the seat's orders module, the same path the lieutenants and the
  rival take.

  An assault is offered only from a district with a road to the rival's safehouse, the
  only place a siege can leave from. The rival's nest is fogged like its squad.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { readPriceLines } from '@/ui/compositions';
import { ECON, SENTRY_NEST } from '../../data/buildings';
import { DISTRICTS, PLAYER_PERSONA } from '../../data/contracts';
import { adjacent } from '../../data/map';
import { UNITS, UNIT_KINDS, type UnitKind } from '../../data/units';
import { getMatch } from '../../modules';
import { PRESENCE, countsOf, heldBy, total } from '../../modules/battle';
import { setFocus, setStance } from '../../modules/orders';
import { useHandledBy } from '../handled-by';
import { GLYPH, clock, grouped } from '../format';
import NestChip from './NestChip.vue';
import SquadChips from './SquadChips.vue';

const props = defineProps<{ index: number }>();
const match = getMatch();
const { p, e } = match;
const d = computed(() => DISTRICTS[props.index]!);
const tactician = useHandledBy('tactician');
const quartermaster = useHandledBy('quartermaster');

const mine = computed(() => countsOf(p.squads[props.index]!));
const theirs = computed(() => countsOf(e.squads[props.index]!));
const seen = computed(() => match.visible(props.index));
const sighting = computed(() => match.sightings.value[props.index]);
const control = computed(() => match.control[props.index]!.value);
/** The seat in full control, whose squad here may siege; a raid can dent it without changing the owner. */
const held = computed(() => heldBy(control.value));
/** Who took it last: their hustlers work it until the other seat takes it, through any dip. */
const owner = computed(() => match.owner[props.index]!.value);
const racketsId = computed(() => ECON.find((def) => def.district === props.index)!.id);
/** Hustlers the owner works here; the rival's only while you can see the district. */
const working = computed(() => {
  if (owner.value === 'none' || (owner.value === 'e' && !seen.value)) return undefined;
  const n = toNumber(match[owner.value].econ.getProducer(racketsId.value)!.ownedCount.value);
  return n === 1 ? '1 hustler working' : `${n || 'no'} hustlers working`;
});
const stance = computed(() => p.stance[props.index]!.value);
const sieges = computed(() => adjacent(props.index, 'e'));

// ─── Sentry nests ───
const nestMax = computed(() => match.tune.nestHp.value);
const myNest = computed(() => toNumber(p.nests[props.index]!.hp.value));
/** The rival's nest, only while you can see the district. */
const theirNest = computed(() => (seen.value ? toNumber(e.nests[props.index]!.hp.value) : 0));
const nestBuy = computed(() => p.nests[props.index]!.build);
const nestPrice = computed(() => readPriceLines(nestBuy.value)[0]);
/** The purchase is offered where the game would take it: your district, no nest standing. */
const nestOffered = computed(() => owner.value === 'p' && myNest.value <= 0);
/** The quartermaster raises one once as many hustlers work here as his persona waits for. */
const nestBy = computed(() => {
  if (!quartermaster.value || !nestOffered.value) return undefined;
  const n = toNumber(p.econ.getProducer(racketsId.value)!.ownedCount.value);
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

const fighting = computed(
  () => seen.value && total(mine.value) > PRESENCE && total(theirs.value) > PRESENCE,
);
const besieging = computed(
  () =>
    sieges.value &&
    held.value === 'p' &&
    stance.value === 'assault' &&
    total(mine.value) > PRESENCE,
);
const besieged = computed(
  () =>
    seen.value &&
    adjacent(props.index, 'p') &&
    held.value === 'e' &&
    e.stance[props.index]!.value === 'assault' &&
    total(theirs.value) > PRESENCE,
);
const focusOptions = computed(() => UNIT_KINDS.filter((k) => theirs.value[k] > PRESENCE));
const live = computed(() => match.phase.value === 'live');

/** Share of the ley-line that answers to you: 0 is all theirs, 1 all yours. */
const share = computed(() => (1 + control.value) / 2);
/** Your share of the ley-line as a whole percent: floored, so a share short of whole never reads 100%. */
const yours = computed(() => Math.floor(share.value * 100));
/** The owner's share of the ley-line while a raid has dented it, on the same scale. */
const dent = computed(() =>
  owner.value === 'none' || held.value === owner.value
    ? undefined
    : Math.floor((owner.value === 'p' ? share.value : 1 - share.value) * 100),
);
const marks = computed(() => [{ at: share.value, class: 'ley__mark' }]);

function focus(k: UnitKind | 'spread') {
  setFocus(p, props.index, k);
}
</script>

<template>
  <article
    class="district"
    :data-owner="owner"
    :data-siege="besieging ? 'out' : besieged ? 'in' : 'none'"
    :aria-label="d.name"
  >
    <header class="district__head">
      <span class="district__name">{{ d.name }}</span>
      <span class="district__state">
        <template v-if="besieging">your crew hits their safehouse</template>
        <template v-else-if="besieged">assault on your safehouse</template>
        <template v-else-if="nestHolds"
          >held by {{ nestHolds === 'p' ? 'your' : 'their' }} nest</template
        >
        <template v-else-if="fighting">fighting</template>
        <template v-else-if="owner !== 'none'"
          >{{ owner === 'p' ? 'yours' : 'theirs'
          }}<template v-if="dent !== undefined"> · {{ dent }}% held</template
          ><template v-if="working"> · {{ working }}</template></template
        >
        <template v-else>contested · {{ yours }}% yours</template>
      </span>
      <span v-if="tactician" class="cc-auto">{{ tactician }}</span>
    </header>
    <ProgressBar class="cc-gauge ley" :value="share" :marks="marks" />

    <div class="district__forces">
      <span class="district__force">
        <SquadChips
          v-if="myNest <= 0 || total(mine) > 0"
          :counts="mine"
          side="p"
          :focus="p.focus[index]!.value"
        />
        <NestChip v-if="myNest > 0" :hp="myNest" :max="nestMax" side="p" />
      </span>
      <span v-if="seen" class="district__force district__force--theirs">
        <NestChip v-if="theirNest > 0" :hp="theirNest" :max="nestMax" side="e" />
        <SquadChips v-if="theirNest <= 0 || total(theirs) > 0" :counts="theirs" side="e" />
      </span>
      <span v-else-if="sighting" class="district__force district__force--theirs">
        <span class="cc-fog">last seen {{ clock(sighting.at) }}</span>
        <SquadChips :counts="sighting.counts" side="e" dim />
      </span>
      <span v-else class="cc-fog">▒▒ no eyes here ▒▒</span>
    </div>

    <div class="orders">
      <Button
        v-if="sieges && held === 'p' && total(mine) > PRESENCE"
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
        <span v-if="nestBy" class="cc-auto" :title="`${nestBy} raises the nest`">{{ nestBy }}</span>
      </template>
      <span
        v-if="fighting && focusOptions.length"
        class="focus"
        role="group"
        aria-label="Focus fire"
      >
        <span class="cc-tag">Focus</span>
        <Button
          class="cc-order"
          :aria-pressed="p.focus[index]!.value === 'spread'"
          @click="focus('spread')"
          >spread</Button
        >
        <Button
          v-for="k in focusOptions"
          :key="k"
          class="cc-order"
          :aria-pressed="p.focus[index]!.value === k"
          :title="`Focus fire on ${UNITS[k].name}`"
          @click="focus(k)"
        >
          {{ GLYPH[k] }}
        </Button>
      </span>
    </div>
  </article>
</template>

<style scoped>
.district {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.district__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.district__name {
  font-family: var(--cc-face-sign);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.district__state {
  margin-right: auto;
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.district[data-owner='p'] .district__state {
  color: var(--cc-sodium);
}
.district[data-owner='e'] .district__state {
  color: var(--cc-rival);
}
.district[data-siege='out'] .district__state {
  color: var(--cc-sodium);
  font-weight: 700;
}
.district[data-siege='in'] .district__state {
  color: var(--cc-rival);
  font-weight: 700;
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
.district__forces {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  min-height: 24px;
}
.district__force {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.district__force--theirs {
  justify-content: flex-end;
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
.focus {
  margin-left: auto;
}
</style>
