<script setup lang="ts">
import { computed, ref } from 'vue';
import { useModule } from '@/composables/useModule';
import Button from '@/ui/components/Button.vue';
import { ArenaKey } from '../modules/arena';
import { MetaKey } from '../modules/meta';
import { RunKey, type BindingCause } from '../modules/run';
import { SEATS } from '../data/seats';
import { upgradeCost } from '../data/meta';
import { formatClock } from '../composables/useBeatLadder';

/**
 * The debrief — the between-runs half, and the costume's one structural idea.
 *
 * Everything inside a run is lit glass and grime; this is paper. The notes are
 * what survive a containment failure (`../IDENTITY.md`), so the surface they
 * live on is a typed record sheet, stamped with what bound the run. It is the
 * only warm, light, legible thing in the archetype, which is the point: the
 * meta layer is the part you get to keep.
 *
 * This is also where the archetype's Cross-Run Meta pattern becomes playable at
 * all — nothing else calls `startRun`, so without this screen a finished run is
 * terminal. The seat picker doubles as the character-select surface and the
 * balance sweep axis (`../data/seats.ts`): the same four policy bundles the
 * probes walk.
 */

const arena = useModule(ArenaKey);
const meta = useModule(MetaKey);
const run = useModule(RunKey);

const CAUSE_COPY: Record<BindingCause, { title: string; note: string; tone: string }> = {
  running: { title: 'In progress', note: '', tone: 'neutral' },
  'hp-floor': {
    title: 'HP floor',
    note: 'Contact accumulated faster than it could be avoided. Defence-bound.',
    tone: 'bad',
  },
  'traversal-collapse': {
    title: 'Traversal collapse',
    note: 'Annulus density beat available DPS — no gap left to move through.',
    tone: 'bad',
  },
  'collection-starvation': {
    title: 'Collection starvation',
    note: 'Killed enough, banked too little. η ran under what the ladder was derived against.',
    tone: 'warn',
  },
  timer: {
    title: 'Reached the horn',
    note: 'Survived the arc.',
    tone: 'good',
  },
};

const cause = computed(() => CAUSE_COPY[run.bindingCause.value]);

const summary = computed(() => {
  const s = arena.state.value.stats;
  return {
    elapsed: formatClock(arena.elapsed.value),
    beats: run.level.value,
    kills: s.kills,
    banked: Math.floor(s.motesBanked),
    dropped: Math.floor(s.motesDropped),
    // η — the collection efficiency the closed form ASSUMES and cannot predict
    // (`../IDENTITY.md` § Where the closed form stops). Reporting it here is the
    // cheapest read on the term that sets the price of all income.
    eta: s.motesDropped > 0 ? s.motesBanked / s.motesDropped : 0,
    damage: Math.round(s.damageTaken),
    contact: Math.round(s.contactSeconds),
  };
});

/**
 * Notes are shown as a running total rather than a per-run award. The award rule
 * lives in `meta.award`, called once by `run.ts`; recomputing it here to show a
 * delta would re-author a solved term beside the code that owns it, which is the
 * failure mode this build already paid for once.
 */
const notes = computed(() => Math.floor(Number(meta.notes.value)));

const shop = computed(() =>
  meta.shop.getAll().map((entry) => {
    const level = Number(entry.purchasable.amount.value);
    return {
      id: entry.def.id,
      name: entry.def.name,
      blurb: entry.def.blurb,
      side: entry.def.side,
      level,
      maxLevel: entry.def.maxLevel,
      maxed: entry.purchasable.maxed.value,
      canBuy: entry.purchasable.canPurchase.value,
      cost: Math.ceil(upgradeCost(entry.def, level)),
      buy: () => entry.purchasable.purchase(),
    };
  }),
);

const chosenSeat = ref(arena.seat.value.id);

function descend(): void {
  run.startRun(chosenSeat.value);
}
</script>

<template>
  <div class="debrief">
    <div class="sheet">
      <header class="sheet__head">
        <div>
          <p class="sheet__kicker">Containment record</p>
          <h2 class="sheet__cause" :data-tone="cause.tone">
            {{ cause.title }}
          </h2>
          <p class="sheet__note">
            {{ cause.note }}
          </p>
        </div>
        <div class="stamp" :data-tone="cause.tone">
          <span class="stamp__time num" data-num>{{ summary.elapsed }}</span>
          <span class="stamp__label">held</span>
        </div>
      </header>

      <dl class="figures">
        <div>
          <dt>Beats</dt>
          <dd class="num" data-num>
            {{ summary.beats }}
          </dd>
        </div>
        <div>
          <dt>Contained</dt>
          <dd class="num" data-num>
            {{ summary.kills }}
          </dd>
        </div>
        <div>
          <dt>Banked</dt>
          <dd class="num" data-num>
            {{ summary.banked }}<span class="figures__of">/{{ summary.dropped }}</span>
          </dd>
        </div>
        <div>
          <!-- η must not be uppercased: `text-transform: uppercase` folds it to
               capital Eta, which renders identically to a Latin H and turned
               this label into "H COLLECTION". -->
          <dt>Collection <span class="glyph">η</span></dt>
          <dd class="num" data-num>
            {{ summary.eta.toFixed(2) }}
          </dd>
        </div>
        <div>
          <dt>Damage</dt>
          <dd class="num" data-num>
            {{ summary.damage }}
          </dd>
        </div>
        <div>
          <dt>In contact</dt>
          <dd class="num" data-num>
            {{ summary.contact }}
          </dd>
        </div>
      </dl>

      <section class="section">
        <h3 class="section__title">
          Standing orders
          <span class="section__notes">
            <span class="num" data-num>{{ notes }}</span> notes
          </span>
        </h3>
        <div class="shop">
          <div
            v-for="u in shop"
            :key="u.id"
            class="tile"
            :class="{ 'tile--maxed': u.maxed, 'tile--afford': u.canBuy && !u.maxed }"
            :data-side="u.side"
          >
            <div class="tile__top">
              <span class="tile__name">{{ u.name }}</span>
              <span class="tile__level num" data-num>{{ u.level }}/{{ u.maxLevel }}</span>
            </div>
            <p class="tile__blurb">
              {{ u.blurb }}
            </p>
            <Button class="tile__buy" :disabled="!u.canBuy || u.maxed" @click="u.buy()">
              <template v-if="u.maxed"> Complete </template>
              <template v-else>
                <span class="num" data-num>{{ u.cost }}</span> notes
              </template>
            </Button>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section__title">Assign the floor</h3>
        <div class="seats">
          <button
            v-for="s in SEATS"
            :key="s.id"
            type="button"
            class="seat"
            :class="{ 'seat--on': chosenSeat === s.id }"
            :aria-pressed="chosenSeat === s.id"
            @click="chosenSeat = s.id"
          >
            <span class="seat__name">{{ s.name }}</span>
            <span class="seat__blurb">{{ s.blurb }}</span>
          </button>
        </div>
      </section>

      <Button class="descend" @click="descend"> Descend again </Button>
    </div>
  </div>
</template>

<style scoped>
.debrief {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gap);
  overflow-y: auto;
  background: rgba(4, 7, 6, 0.78);
  backdrop-filter: blur(3px);
}

.sheet {
  width: min(760px, 100%);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 30px 30px;
  color: var(--note-ink);
  background-color: var(--note-paper);
  background-image: var(--note-grain);
  border-radius: 2px;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.25);
  font-family: var(--font-note);
}

/* ─── head ──────────────────────────────────────────────────────────── */
.sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap);
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(35, 32, 26, 0.22);
}
.sheet__kicker {
  margin: 0;
  font-size: 0.66rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--note-ink-soft);
}
.sheet__cause {
  margin: 3px 0 0;
  font-family: var(--font-note);
  font-size: 1.5rem;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--note-ink);
}
.sheet__cause[data-tone='bad'] {
  color: var(--note-stamp);
}
.sheet__cause[data-tone='good'] {
  color: #2f6b3a;
}
.sheet__note {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--note-ink-soft);
  max-width: 46ch;
}

.stamp {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  border: 2px solid var(--note-stamp);
  border-radius: 3px;
  color: var(--note-stamp);
  transform: rotate(-3deg);
}
.stamp[data-tone='good'] {
  border-color: #2f6b3a;
  color: #2f6b3a;
}
.stamp__time {
  font-size: 1.4rem;
  line-height: 1;
}
.stamp__label {
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* ─── figures ───────────────────────────────────────────────────────── */
.figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 12px 18px;
  margin: 0;
}
.figures dt {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--note-ink-soft);
}
/* Greek stays cased — see the η note in the template. */
.figures dt .glyph {
  text-transform: none;
}
.figures dd {
  margin: 2px 0 0;
  font-size: 1.15rem;
  color: var(--note-ink);
}
.figures__of {
  font-size: 0.78rem;
  color: var(--note-ink-soft);
}

/* ─── sections ──────────────────────────────────────────────────────── */
.section__title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 10px;
  font-family: var(--font-note);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--note-ink-soft);
}
.section__notes {
  margin-left: auto;
  color: var(--note-ink);
  letter-spacing: 0.04em;
}

.shop {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(35, 32, 26, 0.2);
  /* Affordance before branding: the side a tile buys is a left rule, and
     affordability is the border. Both read before the words do. */
  border-left: 3px solid rgba(35, 32, 26, 0.3);
  border-radius: 2px;
}
.tile[data-side='income'] {
  border-left-color: #9a7b1f;
}
.tile[data-side='survival'] {
  border-left-color: #2f6b3a;
}
.tile--afford {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(35, 32, 26, 0.45);
}
.tile--maxed {
  opacity: 0.55;
}
.tile__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.tile__name {
  font-size: 0.86rem;
}
.tile__level {
  font-size: 0.72rem;
  color: var(--note-ink-soft);
}
.tile__blurb {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--note-ink-soft);
}
.tile__buy {
  margin-top: 3px;
  align-self: flex-start;
  padding: 4px 12px;
  font-family: var(--font-note);
  font-size: 0.72rem;
  color: var(--note-paper);
  background: var(--note-ink);
  border: none;
  border-radius: 2px;
}
.tile__buy:disabled {
  background: rgba(35, 32, 26, 0.22);
  color: rgba(35, 32, 26, 0.55);
}

/* ─── seats ─────────────────────────────────────────────────────────── */
.seats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
  gap: 8px;
}
.seat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 11px;
  text-align: left;
  font-family: var(--font-note);
  /* A <button> does not inherit colour — without this it takes the scaffold's
     dark-theme button colour and goes near-invisible on the paper sheet. */
  color: var(--note-ink);
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(35, 32, 26, 0.2);
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.seat:hover {
  background: rgba(255, 255, 255, 0.62);
}
.seat--on {
  background: var(--note-ink);
  border-color: var(--note-ink);
  color: var(--note-paper);
}
.seat__name {
  font-size: 0.84rem;
}
.seat__blurb {
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--note-ink-soft);
}
.seat--on .seat__blurb {
  color: rgba(232, 226, 208, 0.75);
}

.descend {
  align-self: flex-start;
  padding: 9px 22px;
  font-family: var(--font-note);
  font-size: 0.84rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--note-paper);
  background: var(--note-stamp);
  border: none;
  border-radius: 2px;
}
</style>
