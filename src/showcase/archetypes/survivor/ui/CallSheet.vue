<!--
  CallSheet — the run setup between takes: the star, the rating, who calls the moves, and
  the agent's shop. Action! starts the take.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal, formatResource } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import { useWindowKeys } from '@/composables/useWindowKeys';
import { ColumnShell } from '@/lib';
import Button from '@/ui/components/Button.vue';
import { ANCHORS, LEADS, RATINGS, type Driver, type StarDef } from '../data';
import { getMeta, getTake } from '../modules';

const take = getTake();
const meta = getMeta();

const starId = ref<StarDef['id']>(lastStar());
const ratingIndex = ref<number>(highestRating());
const driver = ref<Driver>(
  (sessionStorage.getItem('omt-driver') as Driver | null) === 'instinct' ? 'instinct' : 'player',
);

function lastStar(): StarDef['id'] {
  const id = sessionStorage.getItem('omt-star') as StarDef['id'] | null;
  return id && meta.stars.getPurchasable(id)?.active.value ? id : 'veteran';
}
function highestRating(): number {
  const open = meta.ratings.getAll().filter((e) => e.purchasable.active.value);
  return open.length ? open[open.length - 1]!.def.index : 0;
}

const cloutText = computed(() => formatResource(meta.clout));
const stars = computed(() =>
  meta.stars.getAll().map((e) => ({
    def: e.def,
    signed: e.purchasable.active.value,
    affordable: e.purchasable.canPurchase.value,
    buy: () => e.purchasable.purchase(1),
    wrapped: RATINGS[meta.record.wrapped[e.def.id].value]?.label ?? null,
  })),
);
const ratings = computed(() =>
  meta.ratings.getAll().map((e) => ({
    def: e.def,
    open: e.purchasable.active.value,
    lead: LEADS[e.def.index]!.name,
    need:
      e.def.index > 0
        ? `Wrap ${RATINGS[e.def.index - 1]!.label} with ${e.def.gate === 1 ? 'a star' : `${e.def.gate} stars`} · ${Math.min(meta.starsWrapped(e.def.index - 1), e.def.gate)}/${e.def.gate}`
        : '',
  })),
);
const agency = computed(() =>
  meta.agency.getAll().map((e) => {
    const p = e.purchasable;
    return {
      def: e.def,
      level: Number(p.count.value),
      maxed: p.maxed.value,
      affordable: p.canPurchase.value,
      cost: new Decimal(p.getCost(1)).toNumber(),
      buy: () => p.purchase(1),
    };
  }),
);

function pickStar(id: StarDef['id'], signed: boolean): void {
  if (!signed) return;
  starId.value = id;
  sessionStorage.setItem('omt-star', id);
}
function pickDriver(d: Driver): void {
  driver.value = d;
  sessionStorage.setItem('omt-driver', d);
}
function action(): void {
  take.startTake({ star: starId.value, rating: ratingIndex.value, driver: driver.value });
}
useWindowKeys((e) => {
  if (e.key === 'Enter') action();
});

const best = computed(() => formatClock(meta.record.bestSeconds.value));
const takeMinutes = ANCHORS.takeSeconds / 60;
</script>

<template>
  <ColumnShell max-width="1100px">
    <main class="sheet">
      <header class="masthead">
        <div>
          <div class="billing kicker">Daily call sheet · Day {{ take.view.takeNumber }}</div>
          <h1 class="billing">One More Take</h1>
          <div class="logline">
            You are the stunt double. The rigs go off on their own; all you choose is where to
            stand. Hold the floor {{ takeMinutes }} minutes, then down the lead to hear CUT.
          </div>
        </div>
        <div v-if="meta.record.pictureWrapped.value" class="wrapped-badge billing">
          That's a wrap on the picture
        </div>
        <div class="purse">
          <div class="billing lbl">Clout</div>
          <div class="num clout">{{ cloutText }}</div>
        </div>
      </header>

      <div class="cols">
        <section class="block">
          <h2 class="billing">Cast</h2>
          <div class="cast">
            <div
              v-for="s in stars"
              :key="s.def.id"
              class="row star"
              :class="{ chosen: starId === s.def.id, locked: !s.signed }"
            >
              <Button
                class="ss-control row-main star-pick"
                :disabled="!s.signed"
                :aria-pressed="starId === s.def.id"
                :aria-label="s.def.name"
                @click="pickStar(s.def.id, s.signed)"
              >
                <span class="billing name">{{ s.def.name }}</span>
                <span class="blurb">{{ s.def.blurb }}</span>
                <span v-if="s.signed" class="billing ledger" :class="{ none: !s.wrapped }">{{
                  s.wrapped ? `Wrapped ${s.wrapped}` : 'Nothing wrapped yet'
                }}</span>
              </Button>
              <Button
                v-if="!s.signed"
                class="ss-control buy"
                :class="{ can: s.affordable }"
                :disabled="!s.affordable"
                :aria-label="`Sign ${s.def.name}`"
                @click="s.buy()"
              >
                <span class="billing">Sign</span> <span class="num">{{ s.def.cost }}</span>
              </Button>
              <span v-else-if="starId === s.def.id" class="billing tag">On call</span>
            </div>
          </div>

          <h2 class="billing">Who calls the moves</h2>
          <div class="drivers">
            <Button
              class="ss-control driver"
              :class="{ chosen: driver === 'player' }"
              :aria-pressed="driver === 'player'"
              @click="pickDriver('player')"
            >
              <span class="billing dname">You call the moves</span>
              <span class="dblurb">WASD, arrows or a held pointer. You take the pages.</span>
            </Button>
            <Button
              class="ss-control driver"
              :class="{ chosen: driver === 'instinct' }"
              :aria-pressed="driver === 'instinct'"
              @click="pickDriver('instinct')"
            >
              <span class="billing dname">The star improvises</span>
              <span class="dblurb">Sit in the director's chair. The star moves and picks.</span>
            </Button>
          </div>

          <h2 class="billing">Rating</h2>
          <div class="ratings">
            <Button
              v-for="r in ratings"
              :key="r.def.id"
              class="ss-control rating"
              :class="{ chosen: ratingIndex === r.def.index, locked: !r.open }"
              :disabled="!r.open"
              :title="r.open ? r.def.blurb : r.need"
              @click="ratingIndex = r.def.index"
            >
              <span class="billing mark"
                >{{ r.def.label }}<small class="num">×{{ r.def.pay }}</small></span
              >
              <span class="rtext">
                <span class="billing rlead">{{ r.lead }}</span>
                <span class="rblurb">{{ r.open ? r.def.blurb : r.need }}</span>
              </span>
            </Button>
          </div>
        </section>

        <section class="block">
          <h2 class="billing">Your agent</h2>
          <div class="agency">
            <div v-for="a in agency" :key="a.def.id" class="row perk" :class="{ maxed: a.maxed }">
              <div class="row-main">
                <div class="billing name">{{ a.def.name }}</div>
                <div class="blurb">{{ a.def.blurb }}</div>
                <div class="pips">
                  <i v-for="n in a.def.maxLevel" :key="n" :class="{ on: n <= a.level }"></i>
                </div>
              </div>
              <span v-if="a.maxed" class="billing tag done">Signed</span>
              <Button
                v-else
                class="ss-control buy"
                :class="{ can: a.affordable }"
                :disabled="!a.affordable"
                :aria-label="`Buy ${a.def.name}`"
                @click="a.buy()"
              >
                <span class="num">{{ a.cost }}</span>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <footer class="foot">
        <div class="record">
          <span
            ><b class="num">{{ meta.record.takes.value }}</b> takes</span
          >
          <span
            >best <b class="num">{{ best }}</b></span
          >
          <span
            ><b class="num">{{ meta.record.totalKills.value }}</b> extras down</span
          >
        </div>
        <Button class="ss-control action" @click="action">
          <span class="clapper-stripe"></span>
          <span class="billing">Action!</span>
        </Button>
      </footer>
    </main>
  </ColumnShell>
</template>

<style scoped>
.sheet {
  padding: 16px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.masthead {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--chalk);
  padding-bottom: 14px;
}
.kicker {
  color: var(--squib);
  font-size: 13px;
  letter-spacing: 0.22em;
}
h1 {
  margin: 2px 0 6px;
  font-size: 64px;
  line-height: 0.95;
  letter-spacing: 0.01em;
}
.logline {
  color: var(--chalk-dim);
  max-width: 60ch;
  font-size: 15px;
}
.purse {
  text-align: right;
}
.clout {
  font-size: 44px;
  font-weight: 700;
  color: var(--tungsten);
}
.lbl {
  font-size: 12px;
  color: var(--chalk-dim);
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}
h2 {
  font-size: 15px;
  letter-spacing: 0.2em;
  color: var(--chalk-dim);
  margin: 0 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--gaffer);
}
.block h2 + * {
  margin-bottom: 20px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-left: 3px solid transparent;
  background: var(--stage-floor);
  margin-bottom: 6px;
}
.star-pick {
  text-align: left;
  cursor: pointer;
}
.star-pick .name,
.star-pick .blurb {
  display: block;
}
.star.chosen {
  border-left-color: var(--tungsten);
  background: var(--stage-haze);
}
.star.locked .star-pick {
  cursor: default;
}
.star.locked .name,
.star.locked .blurb {
  color: var(--chalk-faint);
}
.row-main {
  flex: 1;
}
.name {
  font-size: 18px;
}
.blurb {
  color: var(--chalk-dim);
  font-size: 13.5px;
}
.tag {
  font-size: 12px;
  color: var(--tungsten);
}
.tag.done {
  color: var(--nitrate);
}
.buy {
  min-width: 74px;
  padding: 7px 12px;
  border: 1px solid var(--gaffer-hi);
  color: var(--chalk-faint);
  font-size: 16px;
  cursor: not-allowed;
}
.buy.can {
  border-color: var(--tungsten);
  background: var(--tungsten);
  color: var(--stage-black);
  font-weight: 700;
  cursor: pointer;
}
.buy.can:hover {
  filter: brightness(1.08);
}
.pips {
  display: flex;
  gap: 3px;
  margin-top: 5px;
}
.pips i {
  width: 14px;
  height: 5px;
  background: var(--gaffer);
}
.pips i.on {
  background: var(--tungsten);
}
.perk.maxed .pips i.on {
  background: var(--nitrate);
}
.drivers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.driver {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  text-align: left;
  background: var(--stage-floor);
  border: 1px solid var(--gaffer);
  cursor: pointer;
}
.driver .dname {
  font-size: 15px;
}
.driver .dblurb {
  font-size: 12.5px;
  color: var(--chalk-dim);
}
.driver.chosen {
  border-color: var(--tungsten);
  background: var(--stage-haze);
}
.driver.chosen .dname {
  color: var(--tungsten);
}
.ratings {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.rating {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  text-align: left;
  background: var(--stage-floor);
  border: 1px solid var(--gaffer);
  cursor: pointer;
}
.rating .mark {
  min-width: 64px;
  white-space: nowrap;
  text-align: center;
  font-size: 20px;
  padding: 4px 6px;
  border: 2px solid var(--greenlight);
  color: var(--greenlight);
}
.rating .mark small {
  display: block;
  font-size: 12px;
  color: var(--chalk-dim);
}
.rating .rtext {
  display: grid;
  gap: 2px;
}
.rating .rlead {
  font-size: 13px;
  color: var(--chalk);
}
.rating.locked .rlead {
  color: var(--chalk-faint);
}
.rating .rblurb {
  font-size: 12.5px;
  color: var(--chalk-dim);
}
.ledger {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--greenlight);
}
.ledger.none {
  color: var(--chalk-faint);
}
.wrapped-badge {
  align-self: center;
  padding: 6px 12px;
  border: 2px solid var(--reel-gold);
  color: var(--reel-gold);
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rating.chosen {
  border-color: var(--tungsten);
  background: var(--stage-haze);
}
.rating.locked {
  cursor: not-allowed;
}
.rating.locked .mark {
  border-color: var(--gaffer-hi);
  color: var(--chalk-faint);
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--gaffer);
  padding-top: 16px;
}
.record {
  display: flex;
  gap: 22px;
  color: var(--chalk-dim);
  font-size: 14px;
}
.record b {
  color: var(--chalk);
  font-size: 18px;
}
.action {
  display: flex;
  flex-direction: column;
  width: 220px;
  border: 2px solid var(--chalk);
  background: var(--stage-black);
  cursor: pointer;
}
.action .clapper-stripe {
  transform-origin: left bottom;
  transition: transform 120ms var(--ease-cut);
}
.action:hover .clapper-stripe {
  transform: rotate(-6deg);
}
.action .billing {
  font-size: 30px;
  padding: 8px 0 10px;
  color: var(--chalk);
}
</style>
