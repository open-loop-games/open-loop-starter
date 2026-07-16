<!--
  ContainmentGauge — the signature element. A containment vessel whose fill is the
  live pressure (burn / D_max): calm blue at the base, climbing amber, then a red
  breach line at the ceiling. The whole Cycler spine IS this crossing, so the
  gauge renders it literally — the burn rising toward a fixed ceiling, the
  headroom the gap between them.

  Tick-safe: the fill is a bottom-anchored `transform: scaleY`, so per-tick
  updates never reflow the vessel. Reads the run synthesis, no module logic here.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, formatTime } from '@open-loop/engine';
import { formatPercent } from '@/composables/useFormatting';
import { useCyclerRun } from '../../composables/useCyclerRun';

const run = useCyclerRun();

const pressureLabel = computed(() => formatPercent(run.pressure.value, 0));
const burnLabel = computed(() => format(run.burn.value, 2));
const capacityLabel = computed(() => format(run.capacity.value, 2));
const elapsedLabel = computed(() => formatTime(run.elapsedSeconds.value));
const predictedLabel = computed(() => formatTime(Math.round(run.predictedMinutes.value * 60)));
</script>

<template>
  <div
    class="gauge"
    :data-phase="run.phase.value"
    :data-ended="run.ended.value ? 'true' : 'false'"
  >
    <header class="gauge__head">
      <span class="gauge__phase">{{ run.phaseLabel.value }}</span>
      <span class="gauge__clock">{{ elapsedLabel }} <span class="gauge__clock-of">/ {{ predictedLabel }}</span></span>
    </header>

    <div class="gauge__body">
      <div
        class="gauge__vessel"
        role="meter"
        :aria-valuenow="Math.round(run.fill.value * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Containment pressure"
      >
        <div class="gauge__ceiling">
          <span class="gauge__ceiling-label">D_max</span>
        </div>
        <div
          class="gauge__fill"
          :style="{ transform: `scaleY(${run.fill.value})` }"
        />
        <div class="gauge__breach" />
      </div>

      <div class="gauge__readout">
        <div class="gauge__pressure">
          <span class="gauge__pressure-value">{{ pressureLabel }}</span>
          <span class="gauge__pressure-cap">of ceiling</span>
        </div>
        <dl class="gauge__stats">
          <div class="gauge__stat">
            <dt>Burn W(t)</dt>
            <dd class="gauge__num gauge__num--burn">
              {{ burnLabel }}
            </dd>
          </div>
          <div class="gauge__stat">
            <dt>Ceiling D_max</dt>
            <dd class="gauge__num gauge__num--cap">
              {{ capacityLabel }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gauge {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  /* Phase-driven fill color: the vessel reads its temperature from the beat. */
  --gauge-fill: var(--cyc-calm);
}
.gauge[data-phase='comfortable'] {
  --gauge-fill: var(--cyc-hold);
}
.gauge[data-phase='first-bite'] {
  --gauge-fill: var(--cyc-warm);
}
.gauge[data-phase='under-review'] {
  --gauge-fill: var(--cyc-hot);
}
.gauge[data-phase='merge-bell'] {
  --gauge-fill: var(--cyc-breach);
}

.gauge__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
}
.gauge__phase {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.9rem;
  color: var(--gauge-fill);
  transition: color 0.5s ease;
}
.gauge__clock {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  color: var(--color-text);
}
.gauge__clock-of {
  color: var(--color-text-muted);
}

.gauge__body {
  display: flex;
  gap: var(--gap-lg);
  align-items: stretch;
}

/* The vessel — a tall containment cell. Fixed height so the scaleY fill never
   reflows; the ceiling line is the D_max the burn is racing. */
.gauge__vessel {
  position: relative;
  width: 88px;
  min-height: 260px;
  flex: 0 0 auto;
  border: 2px solid var(--cyc-steel);
  border-radius: 10px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 25px,
      color-mix(in srgb, var(--cyc-steel) 12%, transparent) 25px,
      color-mix(in srgb, var(--cyc-steel) 12%, transparent) 26px
    ),
    var(--cyc-vessel-bg);
  overflow: hidden;
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--cyc-steel) 18%, transparent);
}
.gauge__fill {
  position: absolute;
  inset: 0;
  transform-origin: bottom center;
  transform: scaleY(0);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--gauge-fill) 55%, transparent),
    var(--gauge-fill)
  );
  transition:
    transform 0.35s linear,
    background 0.6s ease;
  will-change: transform;
}
/* The breach line at the ceiling — the crossing the run ends on. */
.gauge__breach {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: var(--cyc-breach);
  opacity: 0.35;
  transition: opacity 0.4s ease;
}
.gauge[data-ended='true'] .gauge__breach {
  opacity: 1;
  box-shadow: 0 0 12px var(--cyc-breach);
}
.gauge__ceiling {
  position: absolute;
  top: 4px;
  right: 6px;
  z-index: 1;
}
.gauge__ceiling-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  color: var(--cyc-steel);
  opacity: 0.8;
}

.gauge__readout {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--gap-lg);
  flex: 1 1 auto;
}
.gauge__pressure {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gauge__pressure-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 2.6rem;
  line-height: 1;
  font-weight: 700;
  color: var(--gauge-fill);
  transition: color 0.5s ease;
}
.gauge__pressure-cap {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.gauge__stats {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  margin: 0;
}
.gauge__stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 4px;
}
.gauge__stat dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.gauge__num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.1rem;
  font-weight: 600;
}
.gauge__num--burn {
  color: var(--cyc-hot);
}
.gauge__num--cap {
  color: var(--cyc-steel);
}

@media (max-width: 520px) {
  .gauge__body {
    flex-direction: column;
    align-items: center;
  }
  .gauge__readout {
    align-items: center;
    text-align: center;
  }
}
</style>
