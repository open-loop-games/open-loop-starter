<!--
  ProducerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so engine module getters and injects are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: ThreePanelShell. The corpus routes producer here — Cookie Clicker and
  Universal Paperclips both classify three-panel, and the layout decision tree
  sends "single main action + clickable object" straight to it
  (`open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`).

  The canonical split is action / production / customization. Producer diverges
  on the left column: Cookie Clicker's clicker stays alive forever, while this
  archetype commits to a click that is dominated by tier 3, so an action-only
  rail would go dead exactly when the session gets long. The left column is
  instead a SYSTEM VIEW — plate, launch pad, dispatch ladder, and a log that
  accumulates. It fills as the click empties.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format, formatWhole } from '@open-loop/engine';
import { ThreePanelShell } from '@/lib';
import { ResourceHeaderStrip, type ResourceReadout } from '@/ui/compositions';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { PROBE_CLASSES } from '../data/classes';
import { getLauncher, getMass, getRevisions, launch } from '../modules';
import { useClassRows } from '../composables/useClassRows';
import { useSystemLog } from '../composables/useSystemLog';
import ClassLadder from './panels/ClassLadder.vue';
import RefinementPanel from './panels/RefinementPanel.vue';
import SystemView from './components/SystemView.vue';
import LaunchPad from './components/LaunchPad.vue';
import DispatchPanel from './components/DispatchPanel.vue';
import SystemLog from './components/SystemLog.vue';
import RevisionStrip from './components/RevisionStrip.vue';

const mass = getMass();
const launcher = getLauncher();
const revisions = getRevisions();

const { rows, fleetSize, headlineRate } = useClassRows();
const { entries } = useSystemLog(fleetSize);

const earnedRevisions = computed(
  () => revisions.getAll().filter((entry) => entry.achievement.earned.value).length,
);

const readouts = computed<ResourceReadout[]>(() => [
  { id: 'mass', label: 'mass', value: mass, rate: headlineRate },
  { id: 'fleet', label: 'probes', value: fleetSize },
]);

const stackTotal = computed(() => {
  const top = rows.value[0]?.extra;
  if (!top) return 1;
  return Decimal.div(top.producer.computedRate.value, top.def.baseRate);
});

const counts = computed(() =>
  rows.value.map((row) => Decimal.fromValue(row.count.value).toNumber()),
);

/**
 * How far up the ladder the swarm has reached, as the arc's fill. Deployed
 * classes over total classes — the same "breadth, not depth" axis the
 * `generation` chain reads, so the plate and that multiplier move together.
 */
const progress = computed(() => {
  const deployed = counts.value.filter((n) => n >= 1).length;
  return deployed / PROBE_CLASSES.length;
});

/**
 * Radius label. `m^n` is a claimed radius by the fiction's own premise, so the
 * ladder's position is rendered as a distance rather than an abstract score.
 * The exponent range is cosmetic — only its growth carries meaning, which is
 * why it is derived here and not in `data/`.
 */
const radiusLabel = computed(() => {
  const exponent = 3 + progress.value * 6;
  return `${Math.pow(10, exponent % 1).toFixed(1)}e${Math.floor(exponent)} km`;
});

/** The band the deepest deployed class works at — not its flavour line. */
const scaleLabel = computed(() => {
  const deployed = counts.value.filter((n) => n >= 1).length;
  return PROBE_CLASSES[Math.max(0, deployed - 1)]?.scale ?? 'dust';
});
</script>

<template>
  <ThreePanelShell left-width="288px" right-width="330px">
    <template #left>
      <SystemView
        :counts="counts"
        :progress="progress"
        :radius-label="radiusLabel"
        :scale-label="scaleLabel"
        :revision="earnedRevisions"
      />
      <p class="producer__plate-caption">
        <span>{{ formatWhole(fleetSize) }} probes · {{ scaleLabel }} scale</span>
        <span class="producer__plate-radius">{{ radiusLabel }}</span>
      </p>

      <PanelLayout title="Hand-launch" :closable="false">
        <LaunchPad
          :yield-per-launch="launcher.computedRate.value"
          :headline-rate="headlineRate"
          @launch="launch()"
        />
      </PanelLayout>

      <PanelLayout title="Dispatch" :closable="false">
        <DispatchPanel />
      </PanelLayout>

      <PanelLayout title="System log" class="producer__log" :closable="false">
        <SystemLog :entries="entries" />
      </PanelLayout>
    </template>

    <ResourceHeaderStrip :readouts="readouts">
      <template #trailing>
        <span class="producer__stack">
          <span class="producer__stack-value">×{{ format(stackTotal, 2) }}</span>
          <span class="producer__stack-label">stack</span>
        </span>
      </template>
    </ResourceHeaderStrip>

    <PanelLayout title="Probe classes" :closable="false">
      <ClassLadder :rows="rows" :headline-rate="headlineRate" />
    </PanelLayout>

    <template #right>
      <PanelLayout title="Refinements" :closable="false">
        <RefinementPanel />
      </PanelLayout>

      <PanelLayout title="Revisions" :closable="false">
        <RevisionStrip :earned="earnedRevisions" :total="revisions.getAll().length" />
      </PanelLayout>
    </template>
  </ThreePanelShell>
</template>

<style scoped>
.producer__plate-caption {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0;
  font-size: 10px;
}
.producer__plate-radius {
  font-variant-numeric: tabular-nums;
}
.producer__stack {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.producer__stack-value {
  font-variant-numeric: tabular-nums;
}
.producer__stack-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
}
/* The log is the rail's elastic region — everything above it is intrinsic. */
.producer__log {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
