<!--
  SystemView — the archetype's signature element, and the left rail's answer to
  going dead once the click is dominated.

  It draws the claimed frontier as a technical section: a dashed shell circle,
  an arc for how much of the ladder's span has been claimed, and one dot per
  deployed probe placed on its class's orbit. The blueprint costume reveals the
  dimension callout and title block that annotate it.

  Why this and not a chart: the cost ratio `m` is derived from an *expanding
  shell* (`../../IDENTITY.md` § realization), so `m^n` genuinely is a radius.
  This is the one readout in the gallery that could not be lifted into another
  archetype, because no other archetype's cost curve has a spatial premise.

  Presentational — takes numbers, holds no engine handles.
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Deployed count per class, in ladder order. Drives the dot field. */
    counts: number[];
    /** How far along the ladder the swarm has reached, 0–1. Drives the arc. */
    progress: number;
    /** Rendered radius label, already formatted. */
    radiusLabel: string;
    /** Scale word for the title block — dust, asteroid, moon, planet, star. */
    scaleLabel: string;
    revision?: number;
  }>(),
  { revision: 0 },
);

const W = 252;
const H = 196;
const CX = W / 2;
const CY = 84;
const R = 62;
const CIRC = 2 * Math.PI * R;

const arcDash = computed(() => {
  const on = CIRC * Math.min(1, Math.max(0, props.progress));
  return `${on.toFixed(1)} ${(CIRC - on).toFixed(1)}`;
});

/**
 * One dot per probe would be unreadable past a few dozen, so a class's dot
 * count is logarithmic in its owned count and capped. The field reads as
 * "denser than last time", never as an exact census — the numbers live in the
 * ladder two columns over.
 */
const probes = computed(() => {
  const out: { x: number; y: number; r: number; key: string }[] = [];
  const classCount = props.counts.length || 1;
  props.counts.forEach((count, i) => {
    if (count < 1) return;
    const orbit = 14 + (i / Math.max(1, classCount - 1)) * (R - 16);
    const dots = Math.min(9, Math.max(1, Math.round(Math.log2(count + 1))));
    for (let k = 0; k < dots; k++) {
      const theta = i * 1.9 + k * ((Math.PI * 2) / dots) + 0.4;
      out.push({
        x: CX + orbit * Math.cos(theta),
        y: CY + orbit * Math.sin(theta),
        r: 1.5 + i * 0.25,
        key: `${i}-${k}`,
      });
    }
  });
  return out;
});

const rings = [0.33, 0.66, 1].map((k) => R * k);
</script>

<template>
  <div class="sysview">
    <svg
      class="sysview__plate"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="`Claimed frontier ${radiusLabel} at ${scaleLabel} scale`"
    >
      <circle v-for="r in rings" :key="r" class="sv-graticule" :cx="CX" :cy="CY" :r="r" />

      <circle class="sv-shell" :cx="CX" :cy="CY" :r="R" />
      <circle
        class="sv-shell-arc"
        :cx="CX"
        :cy="CY"
        :r="R"
        :stroke-dasharray="arcDash"
        :transform="`rotate(-90 ${CX} ${CY})`"
        stroke-linecap="round"
      />

      <circle v-for="p in probes" :key="p.key" class="sv-probe" :cx="p.x" :cy="p.y" :r="p.r" />

      <circle class="sv-core" :cx="CX" :cy="CY" r="3" />

      <!-- Drafting annotation. Hidden unless a costume opts in. -->
      <g class="sv-dim">
        <line :x1="CX" :y1="CY + R + 11" :x2="CX + R" :y2="CY + R + 11" />
        <line :x1="CX" :y1="CY + R + 7" :x2="CX" :y2="CY + R + 15" />
        <line :x1="CX + R" :y1="CY + R + 7" :x2="CX + R" :y2="CY + R + 15" />
        <text class="sv-dim__text" :x="CX + 4" :y="CY + R + 8">R {{ radiusLabel }}</text>
      </g>

      <g class="sv-titleblock">
        <rect x="2" :y="H - 34" width="120" height="32" />
        <line x1="2" :y1="H - 23" x2="122" :y2="H - 23" />
        <text x="6" :y="H - 26">SWARM / SYSTEM PLAN</text>
        <text x="6" :y="H - 14">SCALE {{ scaleLabel.toUpperCase() }}</text>
        <text x="6" :y="H - 5">REV {{ String(revision).padStart(2, '0') }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.sysview__plate {
  display: block;
  width: 100%;
  height: auto;
}
.sv-graticule,
.sv-shell,
.sv-shell-arc {
  fill: none;
}
/* Annotation layers are opt-in per costume — see `../../styles/blueprint.css`. */
.sv-dim,
.sv-titleblock {
  display: none;
}
</style>
