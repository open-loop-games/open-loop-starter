<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useBeatLadder } from '../composables/useBeatLadder';

/**
 * The refit track — this archetype's central readout.
 *
 * A segmented notch per authored beat rather than a percentage bar, because the
 * question the run is asking is positional: *which* refit, out of the 33 the
 * schedule holds. A generic progress bar answers "how full", which is not a
 * question anyone has about this economy.
 *
 * The ghost tick is the load-bearing part. The XP ladder is derived so that
 * beats land on the authored schedule (`../IDENTITY.md` § Rate-function spine),
 * so the distance between the filled edge and the ghost IS the
 * collection-starvation binding cause forming — visible live, without a probe.
 *
 * ─── One thing, two vocabularies, deliberately ───
 * The spine calls this a **beat**: `data/schedule.ts` authors beats, the ladder
 * is derived against them, the probes report a schedule delta in them, and
 * `manifest.beats` is the starter-wide contract. The player is never told any of
 * that — on screen it is a **refit**, the moment the floor holds and the
 * apparatus changes. Code keeps the spine's word so a balance pass and its
 * receipts stay greppable; copy keeps the fiction's. Where they meet — here —
 * the split is named rather than resolved, because collapsing it either way
 * loses something real: renaming the data would sever the probes from their own
 * vocabulary, and shipping "draft beat" to a player is a balance document
 * leaking onto the HUD.
 */

const ladder = useBeatLadder();

/** Beat-fired flash — the reveal moment this archetype has, once every 30–90s. */
const flashing = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => ladder.level.value,
  (next, previous) => {
    if (next <= previous) return;
    flashing.value = true;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashing.value = false), 620);
  },
);

onBeforeUnmount(() => clearTimeout(flashTimer));

const notches = computed(() => {
  const level = ladder.level.value;
  const scheduled = ladder.scheduled.value;
  return Array.from({ length: ladder.total }, (_, i) => ({
    i,
    fired: i < level,
    active: i === level,
    /** The authored schedule's position, drawn whether the run is on it or not. */
    ghost: i === Math.min(scheduled, ladder.total - 1),
  }));
});

const deltaLabel = computed(() => {
  const d = ladder.delta.value;
  if (d === 0) return 'on pace';
  return d > 0 ? `${d} ahead` : `${Math.abs(d)} behind`;
});

const deltaState = computed(() => {
  const d = ladder.delta.value;
  if (d >= 0) return 'ok';
  return d <= -4 ? 'bad' : 'warn';
});
</script>

<template>
  <div class="beat-track" :class="{ 'beat-track--flash': flashing }">
    <div class="beat-track__head">
      <span class="beat-track__label"><span>Refits</span></span>
      <span class="beat-track__count num" data-num
        >{{ ladder.level.value }}<span class="beat-track__of">/{{ ladder.total }}</span></span
      >
      <span class="beat-track__delta" :data-state="deltaState">{{ deltaLabel }}</span>
    </div>

    <div
      class="beat-track__notches"
      role="img"
      :aria-label="`Refit ${ladder.level.value} of ${ladder.total}, ${deltaLabel}`"
    >
      <span
        v-for="n in notches"
        :key="n.i"
        class="notch"
        :class="{
          'notch--fired': n.fired,
          'notch--active': n.active,
          'notch--ghost': n.ghost,
        }"
      >
        <span
          v-if="n.active"
          class="notch__fill"
          :style="{ transform: `scaleY(${ladder.progress.value})` }"
        />
      </span>
    </div>

    <div class="beat-track__foot">
      <span class="num" data-num>{{ Math.floor(ladder.banked.value) }}</span>
      <span class="beat-track__unit">reagent banked</span>
      <span class="beat-track__sep">·</span>
      <span class="num" data-num>{{
        Number.isFinite(ladder.nextThreshold.value) ? Math.ceil(ladder.nextThreshold.value) : '—'
      }}</span>
      <span class="beat-track__unit">next refit</span>
    </div>
  </div>
</template>

<style scoped>
.beat-track {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 340px;
  padding: 10px 14px 8px;
  background: linear-gradient(180deg, rgba(10, 13, 12, 0.86), rgba(10, 13, 12, 0.62));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  backdrop-filter: blur(2px);
  /* Settling back down after a beat. The rise itself is the keyframe below. */
  transition: border-color 500ms ease-out;
}

.beat-track__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.beat-track__label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.68rem;
  color: var(--color-text-muted);
}
.beat-track__count {
  /* 2 digits + the "/33" suffix must not slide when the level crosses 10. */
  min-width: 2ch;
  font-size: 1.05rem;
  color: var(--arc-hot);
  line-height: 1;
}
.beat-track__of {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
.beat-track__delta {
  margin-left: auto;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: var(--font-display);
}
.beat-track__delta[data-state='ok'] {
  color: var(--vat);
}
.beat-track__delta[data-state='warn'] {
  color: var(--sodium);
}
.beat-track__delta[data-state='bad'] {
  color: var(--breach);
}

.beat-track__notches {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
  transform-origin: bottom;
}

.notch {
  position: relative;
  flex: 1 1 0;
  height: 14px;
  border-radius: 1px;
  background: rgba(127, 214, 255, 0.11);
  /* Transform/opacity only — dozens of these sit on a 20 Hz surface. */
  transition:
    background-color 180ms ease,
    height 180ms ease;
}
.notch--fired {
  background: var(--arc);
  height: 18px;
}
.notch--active {
  background: rgba(242, 214, 117, 0.16);
  height: 22px;
  overflow: hidden;
}
.notch__fill {
  position: absolute;
  inset: 0;
  background: var(--mote);
  transform-origin: bottom;
}
/* The authored schedule's position. Sits behind the fill so a run that is ahead
   still shows where the schedule was. */
.notch--ghost::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 3px;
  height: 3px;
  transform: translateX(-50%) rotate(45deg);
  background: var(--sodium);
}

/* ─── The reveal ────────────────────────────────────────────────────────
   A beat is this archetype's page-load moment — once every 30–90s, the floor
   stops and the build changes. The first pass pulsed a box-shadow on a single
   3px notch, which was invisible against a moving field; the beat landed with
   no announcement at all. So the whole panel answers instead: the border goes
   mote-gold, the track lifts, and the label names what happened. Transform and
   colour only, on one panel rather than 33 notches. */
.beat-track--flash {
  border-color: var(--mote);
  animation: beat-panel 620ms ease-out;
}
@keyframes beat-panel {
  0% {
    box-shadow: 0 0 0 0 rgba(242, 214, 117, 0.5);
  }
  100% {
    box-shadow: 0 0 0 14px rgba(242, 214, 117, 0);
  }
}

.beat-track--flash .beat-track__notches {
  animation: beat-lift 620ms ease-out;
}
@keyframes beat-lift {
  0% {
    transform: scaleY(1);
  }
  28% {
    transform: scaleY(1.28);
  }
  100% {
    transform: scaleY(1);
  }
}

.beat-track--flash .beat-track__label {
  color: var(--mote);
}
/* Swaps in for "Refits" while the flash is up, so the reveal says what it is
   rather than only drawing attention to itself. */
.beat-track--flash .beat-track__label span {
  display: none;
}
.beat-track--flash .beat-track__label::after {
  content: 'Bench open';
}

.beat-track__foot {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}
.beat-track__foot .num {
  /* Banked reagent reaches four digits over an arc; reserve the columns so the
     words after each number hold still. */
  min-width: 4ch;
  color: var(--mote);
}
.beat-track__unit {
  letter-spacing: 0.04em;
}
.beat-track__sep {
  opacity: 0.5;
}

/* The border-colour and label swap survive: they carry the information, and
   the motion is what a reduced-motion preference is actually asking about. */
@media (prefers-reduced-motion: reduce) {
  .notch,
  .beat-track,
  .beat-track--flash,
  .beat-track--flash .beat-track__notches {
    transition: none;
    animation: none;
  }
}
</style>
