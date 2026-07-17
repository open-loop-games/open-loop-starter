<!--
  CommandBar — the console header: a DEFCON badge, the live phase (dot · name · sub),
  the wave timeline (done/now/boss pips), and the alert banner. All state is derived
  in `useCommandState` (DEFCON, timeline, alert) + `useCyclerRun` (phase, clock); the
  bar is a pure readout. Tone recolours from the `.cyc-world[data-tone]` ancestor.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { formatTime } from '@open-loop/engine';
import { useCyclerRun } from '../../composables/useCyclerRun';
import { useCommandState } from '../../composables/useCommandState';

const run = useCyclerRun();
const cmd = useCommandState();

const elapsed = computed(() => formatTime(run.elapsedSeconds.value));
const predicted = computed(() => formatTime(Math.round(run.predictedMinutes.value * 60)));
</script>

<template>
  <div class="cyc-cmd">
    <div class="cyc-cmd__row">
      <span class="cyc-cmd__defcon">DEFCON <b>{{ cmd.defcon.value }}</b></span>
      <div class="cyc-cmd__phase">
        <span class="cyc-cmd__dot" />
        <span class="cyc-cmd__name">{{ run.phaseLabel.value }}</span>
        <span class="cyc-cmd__sub">{{ cmd.phaseSub.value }}</span>
      </div>
      <div
        class="cyc-cmd__timeline"
        aria-hidden="true"
      >
        <template
          v-for="slot in cmd.timeline.value.slots"
          :key="slot.n"
        >
          <span
            v-if="slot.n > 0"
            class="cyc-cmd__seg"
            :class="{
              done: slot.n <= cmd.timeline.value.current,
              now: slot.n === cmd.timeline.value.current,
            }"
          />
          <span
            class="cyc-cmd__pip"
            :class="{ done: slot.state === 'done', now: slot.state === 'now', boss: slot.boss }"
          />
        </template>
      </div>
      <span class="cyc-cmd__clock">{{ elapsed }} <span class="cyc-cmd__clock-of">/ {{ predicted }}</span></span>
    </div>
    <div class="cyc-cmd__alert">
      {{ cmd.alert.value }}
    </div>
  </div>
</template>

<style scoped>
.cyc-cmd {
  border: 1px solid var(--cyc-grn2);
  background: rgba(7, 16, 22, 0.8);
  margin-bottom: 10px;
}
.cyc-cmd__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}
.cyc-cmd__defcon {
  border: 1px solid var(--cyc-grn);
  padding: 3px 8px;
  font-size: 12px;
  letter-spacing: 1px;
  white-space: nowrap;
  color: var(--cyc-grn2);
}
.cyc-cmd__defcon b {
  color: var(--cyc-grn);
  font-variant-numeric: tabular-nums;
}
.cyc-cmd__phase {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cyc-cmd__dot {
  width: 8px;
  height: 8px;
  background: var(--cyc-grn);
  box-shadow: 0 0 6px var(--cyc-grn);
}
.cyc-cmd__name {
  font-size: 14px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--cyc-grn);
}
.cyc-cmd__name::before {
  content: '[';
}
.cyc-cmd__name::after {
  content: ']';
}
.cyc-cmd__sub {
  font-size: 11px;
  color: var(--cyc-grn2);
  letter-spacing: 0.4px;
}
.cyc-cmd__timeline {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 90px;
}
.cyc-cmd__seg {
  flex: 1;
  height: 2px;
  background: var(--cyc-grndim);
}
.cyc-cmd__seg.done {
  background: var(--cyc-grn2);
}
.cyc-cmd__seg.now {
  background: var(--cyc-amb);
}
.cyc-cmd__pip {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  background: var(--cyc-bg);
  border: 1px solid var(--cyc-grn2);
}
.cyc-cmd__pip.done {
  background: var(--cyc-grn2);
}
.cyc-cmd__pip.now {
  background: var(--cyc-amb);
  border-color: var(--cyc-amb);
  box-shadow: 0 0 6px var(--cyc-amb);
}
.cyc-cmd__pip.boss {
  width: 10px;
  height: 10px;
  background: var(--cyc-red);
  border-color: var(--cyc-red);
}
.cyc-cmd__clock {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--cyc-grn);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cyc-cmd__clock-of {
  color: var(--cyc-grn2);
}
.cyc-cmd__alert {
  padding: 5px 12px;
  font-size: 11.5px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-top: 1px solid var(--cyc-grn2);
  color: var(--cyc-grn2);
}

/* Tone shifts, driven by the .cyc-world[data-tone] ancestor. */
:global(.cyc-world[data-tone='warn']) .cyc-cmd__dot {
  background: var(--cyc-amb);
  box-shadow: 0 0 6px var(--cyc-amb);
  animation: cyc-blink 1s step-end infinite;
}
:global(.cyc-world[data-tone='warn']) .cyc-cmd__name,
:global(.cyc-world[data-tone='warn']) .cyc-cmd__defcon b {
  color: var(--cyc-amb);
}
:global(.cyc-world[data-tone='warn']) .cyc-cmd__defcon {
  border-color: var(--cyc-amb);
}
:global(.cyc-world[data-tone='warn']) .cyc-cmd__alert {
  color: var(--cyc-amb);
  border-color: var(--cyc-warn-edge);
}
:global(.cyc-world[data-tone='crit']) .cyc-cmd__dot {
  background: var(--cyc-red);
  box-shadow: 0 0 8px var(--cyc-red);
  animation: cyc-blink 0.5s step-end infinite;
}
:global(.cyc-world[data-tone='crit']) .cyc-cmd__name,
:global(.cyc-world[data-tone='crit']) .cyc-cmd__defcon b {
  color: var(--cyc-red);
}
:global(.cyc-world[data-tone='crit']) .cyc-cmd__defcon {
  border-color: var(--cyc-red);
}
:global(.cyc-world[data-tone='crit']) .cyc-cmd__alert {
  color: var(--cyc-red);
  border-color: var(--cyc-crit-edge);
}
:global(.cyc-world[data-tone='breach']) .cyc-cmd__name,
:global(.cyc-world[data-tone='breach']) .cyc-cmd__alert {
  color: var(--cyc-red);
}
@keyframes cyc-blink {
  50% {
    opacity: 0.25;
  }
}
</style>
