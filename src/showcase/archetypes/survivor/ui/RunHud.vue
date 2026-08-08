<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { MetaKey } from '../modules/meta';
import { useBeatLadder, formatClock } from '../composables/useBeatLadder';
import BeatTrack from './BeatTrack.vue';
import LoadoutRail from './LoadoutRail.vue';

/**
 * The peripheral HUD — everything that is not the floor.
 *
 * Shell shape is `free-form`: a fullscreen arena with overlay readouts pinned to
 * the edges, which is the survivor-like majority in
 * `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`
 * (2/2 classifiable, formally insufficient-corpus at N=2, and consistent with
 * the third). Nothing here takes pointer events — the floor is the only thing
 * under the cursor, and between runs the debrief takes the whole screen.
 */

const arena = useModule(ArenaKey);
const meta = useModule(MetaKey);
const ladder = useBeatLadder();

const remaining = computed(() => formatClock(ladder.runSeconds - ladder.elapsed.value));

/** The census. Live bodies is the traversal-collapse read; motes on the floor is
 *  uncollected income, which is the other half of the same decision. */
const census = computed(() => {
  const s = arena.state.value;
  return {
    specimens: s.specimens.length,
    motes: s.motes.length,
    kills: s.stats.kills,
  };
});

const condition = computed(() => {
  const op = arena.state.value.operator;
  const frac = op.maxHp > 0 ? Math.max(0, op.hp / op.maxHp) : 0;
  return { frac, pct: Math.round(frac * 100) };
});
</script>

<template>
  <div class="hud">
    <div class="hud__row hud__row--top">
      <div class="clock">
        <span class="clock__now num" data-num>{{ ladder.clock.value }}</span>
        <span class="clock__meta">
          <span class="num" data-num>{{ remaining }}</span> to the horn
        </span>
      </div>

      <BeatTrack />

      <div class="operator">
        <span class="operator__seat">{{ arena.seat.value.name }}</span>
        <span class="operator__cond" :data-low="condition.frac <= 0.35">
          <span class="num" data-num>{{ condition.pct }}</span
          >% condition
        </span>
        <span class="operator__notes">
          <span class="num" data-num>{{ Math.floor(Number(meta.notes.value)) }}</span> notes banked
        </span>

        <!-- Census rides the operator column rather than the opposite corner:
             the dev dock owns bottom-right in this repo, and a readout a fork
             has to un-overlap is a readout in the wrong place. -->
        <div class="census">
          <span
            ><span class="num" data-num>{{ census.specimens }}</span> on the floor</span
          >
          <span
            ><span class="num" data-num>{{ census.motes }}</span> uncollected</span
          >
          <span
            ><span class="num" data-num>{{ census.kills }}</span> contained</span
          >
        </div>
      </div>
    </div>

    <div class="hud__row hud__row--bottom">
      <LoadoutRail />
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--gap);
  /* The floor is the only interactive surface; readouts never eat a click. */
  pointer-events: none;
}

.hud__row {
  display: flex;
  align-items: flex-start;
  gap: var(--gap);
}
.hud__row--bottom {
  align-items: flex-end;
  justify-content: space-between;
}

/* ─── clock ─────────────────────────────────────────────────────────── */
.clock {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.clock__now {
  font-size: 2.1rem;
  line-height: 1;
  color: var(--color-text);
  text-shadow: 0 0 18px rgba(10, 13, 12, 0.9);
}
.clock__meta {
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

/* ─── operator block ────────────────────────────────────────────────── */
.operator {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}
.operator__seat {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: 0.82rem;
  color: var(--arc-hot);
}
.operator__cond .num {
  min-width: 3ch;
}
.operator__cond {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.operator__cond[data-low='true'] {
  color: var(--breach);
}
.operator__notes {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.operator__notes .num {
  min-width: 4ch;
  color: var(--mote);
}

/* ─── census ────────────────────────────────────────────────────────── */
.census {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid var(--color-border);
  font-size: 0.7rem;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}
.census .num {
  min-width: 4ch;
  color: var(--color-text);
}
</style>
