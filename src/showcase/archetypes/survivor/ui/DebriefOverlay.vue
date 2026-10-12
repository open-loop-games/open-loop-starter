<script setup lang="ts">
import { computed, ref } from 'vue';
import { useModule } from '@/composables/useModule';
import Button from '@/ui/components/Button.vue';
import { ArenaKey } from '../modules/arena';
import { MetaKey } from '../modules/meta';
import { RunKey, type BindingCause } from '../modules/run';
import { ALL_SEATS } from '../data/seats';
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

/**
 * What ended the run, written for whoever reads the sheet rather than for
 * whoever tunes the game.
 *
 * `BindingCause` is the spine's own name for each of these and the probes report
 * the distribution over them (`../IDENTITY.md` § What measures the remainder) —
 * so the ids stay, and only the copy is translated. A record sheet is allowed to
 * be technical; it is not allowed to be technical in the *balance document's*
 * vocabulary, which is what "annulus density beat available DPS" was.
 */
const CAUSE_COPY: Record<BindingCause, { title: string; note: string; tone: string }> = {
  running: { title: 'In progress', note: '', tone: 'neutral' },
  'hp-floor': {
    title: 'Condition zero',
    note: 'Contact came in faster than it could be shed. The hall kept the operator.',
    tone: 'bad',
  },
  'traversal-collapse': {
    title: 'Boxed in',
    note: 'The floor closed faster than the apparatus could open it. No gap left to move through.',
    tone: 'bad',
  },
  'collection-starvation': {
    title: 'Ran dry',
    note: 'Plenty contained, little banked. The dive back through the ash never paid for itself.',
    tone: 'warn',
  },
  timer: {
    title: 'Held to purge',
    note: 'The hall vented with the operator still standing.',
    tone: 'good',
  },
};

const cause = computed(() => CAUSE_COPY[run.bindingCause.value]);

const summary = computed(() => {
  const s = arena.state.value.stats;
  return {
    elapsed: formatClock(arena.elapsed.value),
    refits: run.level.value,
    kills: s.kills,
    banked: Math.floor(s.motesBanked),
    dropped: Math.floor(s.motesDropped),
    // η — the collection efficiency the closed form ASSUMES and cannot predict
    // (`../IDENTITY.md` § Where the closed form stops). Reporting it here is the
    // cheapest read on the term that sets the cost of all income. Shown as a
    // recovery percentage: the same quantity, in the only units a player has for
    // it — how much of what fell you actually picked up.
    recovered: s.motesDropped > 0 ? Math.round((s.motesBanked / s.motesDropped) * 100) : 0,
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
    const count = Number(entry.purchasable.count.value);
    return {
      id: entry.def.id,
      displayName: entry.def.displayName,
      blurb: entry.def.blurb,
      side: entry.def.side,
      count,
      limit: entry.def.limit,
      maxed: entry.purchasable.maxed.value,
      canPurchase: entry.purchasable.canPurchase.value,
      cost: Math.ceil(upgradeCost(entry.def, count)),
      purchase: () => entry.purchasable.purchase(),
    };
  }),
);

/**
 * Before the first run this same sheet is the BRIEFING — no record to report,
 * only a floor to assign. It is the same surface because it is the same
 * decision, and because a second screen that offered the same four buttons would
 * be a second screen to keep in step.
 */
const briefing = computed(() => arena.outcome.value === 'briefing');

const chosenSeat = ref(arena.seat.value.id);

function descend(): void {
  run.startRun(chosenSeat.value);
}
</script>

<template>
  <div class="debrief">
    <div class="sheet">
      <header class="sheet__head">
        <div v-if="briefing">
          <p class="sheet__kicker">Containment order</p>
          <h2 class="sheet__cause" data-tone="neutral">The floor is open</h2>
          <p class="sheet__note">
            Assign it below. Take it yourself, or hand it to a policy and watch what its theory of
            survival is worth.
          </p>
        </div>
        <div v-else>
          <p class="sheet__kicker">Containment record</p>
          <h2 class="sheet__cause" :data-tone="cause.tone">
            {{ cause.title }}
          </h2>
          <p class="sheet__note">
            {{ cause.note }}
          </p>
        </div>
        <div v-if="!briefing" class="stamp" :data-tone="cause.tone">
          <span class="stamp__time num" data-num>{{ summary.elapsed }}</span>
          <span class="stamp__label">held</span>
        </div>
      </header>

      <dl v-if="!briefing" class="figures">
        <div>
          <dt>Refits</dt>
          <dd class="num" data-num>
            {{ summary.refits }}
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
          <dt>Recovered</dt>
          <dd class="num" data-num>{{ summary.recovered }}<span class="figures__of">%</span></dd>
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

      <!-- The very first briefing has nothing to sell and no notes to sell it
           for, and leaving it up pushes the only decision on the sheet below the
           fold. Every later visit shows it. -->
      <section v-if="!briefing || notes > 0" class="section">
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
            :class="{ 'tile--maxed': u.maxed, 'tile--afford': u.canPurchase && !u.maxed }"
            :data-side="u.side"
          >
            <div class="tile__top">
              <span class="tile__name">{{ u.displayName }}</span>
              <span class="tile__level num" data-num>{{ u.count }}/{{ u.limit }}</span>
            </div>
            <p class="tile__blurb">
              {{ u.blurb }}
            </p>
            <Button class="tile__buy" :disabled="!u.canPurchase || u.maxed" @click="u.purchase()">
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
            v-for="s in ALL_SEATS"
            :key="s.id"
            type="button"
            class="seat"
            :class="{ 'seat--on': chosenSeat === s.id, 'seat--you': s.driver === 'player' }"
            :aria-pressed="chosenSeat === s.id"
            @click="chosenSeat = s.id"
          >
            <span class="seat__name">{{ s.displayName }}</span>
            <span class="seat__blurb">{{ s.blurb }}</span>
          </button>
        </div>
      </section>

      <Button class="descend" @click="descend">
        {{ briefing ? 'Descend' : 'Descend again' }}
      </Button>
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
  /* Affordance before branding: the side a tile improves is a left rule, and
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
/* The player seat is a different KIND of entry, not a fifth policy — the stamp
   colour marks it as the hand-written line on an otherwise typed form. */
.seat--you {
  border-left: 3px solid var(--note-stamp);
}
.seat--you .seat__name {
  color: var(--note-stamp);
}
.seat--you.seat--on .seat__name {
  color: var(--note-paper);
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
