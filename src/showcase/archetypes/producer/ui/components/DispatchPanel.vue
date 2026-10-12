<!--
  DispatchPanel — the automation ladder, shown as a ladder.

  The rungs render whether or not they are open, because the ladder's job is to
  withhold (`.claude/rules/archetype-authoring.md` § Conformance). A player who
  cannot see the closed rung reads "no automation exists" instead of "not yet",
  and the unlock stops being a beat.

  While the dispatcher holds mass for a class, the hold is drawn as a dimension
  line to that class's cost: solid for the mass already held, dashed redline
  for the span still to come. Holding is the managed rung's normal state, so the
  readout stays up; it reads as the plan in progress, not as a stall. When the
  part is purchased the line completes and reads "dispatching" until the next hold,
  so a purchase never unmounts the readout and shifts the rail beneath it.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { useFormatting } from '@/composables/useFormatting';
import {
  DispatchKey,
  getClasses,
  getTotalRate,
  getMass,
  type DispatchPolicyName,
  type ProducerAutomationTier,
} from '../../modules';
import { useModule } from '@/composables/useModule';

const dispatch = useModule(DispatchKey);
const mass = getMass();
const classes = getClasses();
const { formatTime } = useFormatting();

const RUNGS: { id: ProducerAutomationTier; label: string; note: string }[] = [
  { id: 'manual', label: 'Manual', note: 'You allocate every probe.' },
  { id: 'assisted', label: 'Assisted', note: 'Assisted dispatch at 25 probes' },
  { id: 'managed', label: 'Managed', note: 'Managed dispatch at 150 probes' },
];

/** How each rule allocates, in the words the hand-off button uses. */
const RULE_LABELS: Record<DispatchPolicyName, string> = {
  cheapest: 'cheapest first',
  payback: 'best payback',
  hybrid: 'best payback, saving up',
};

const reached = computed(() => RUNGS.map((rung) => dispatch.tiers.hasReached(rung.id)));
const canHandOff = computed(() => dispatch.tiers.hasReached('assisted'));

/** The next rung's unlock note, or null once the ladder is fully open. */
const nextNote = computed(() => {
  const index = reached.value.findIndex((open) => !open);
  return index === -1 ? null : RUNGS[index].note;
});

/** The class being saved for, how much of its cost is held, and the wait left. */
const hold = computed(() => {
  const def = dispatch.savingFor.value;
  if (!def) return null;
  const cost = Decimal.fromValue(classes.getProducer(def.id)!.repeatable!.getCost(1));
  const held = Decimal.fromValue(mass.value);
  const rate = Decimal.fromValue(getTotalRate());
  const short = Decimal.max(cost.sub(held), 0);
  return {
    displayName: def.displayName,
    share: Math.min(1, Math.max(0, held.div(cost).toNumber())),
    waitSeconds: rate.gt(0) ? short.div(rate).toNumber() : Infinity,
  };
});

/**
 * What the readout draws: the hold, or — between holds, while the dispatcher
 * may save — a completed line for the part it just purchased. `null` hides it.
 */
const readout = computed(() => {
  if (hold.value) return { ...hold.value, saving: true };
  if (dispatch.isActive.value && dispatch.waitsForCost.value) {
    return { displayName: null, share: 1, waitSeconds: 0, saving: false };
  }
  return null;
});

/** Bumps when a new hold starts, so its line mounts fresh rather than sweeping back from full. */
const holdCycle = ref(0);
watch(
  () => readout.value?.saving,
  (saving, was) => {
    if (saving && !was) holdCycle.value++;
  },
);

/** Whole seconds, so a live countdown steps once a second rather than every tick. */
// TODO(expansion): `formatTime` has no whole-second mode — below an hour it
// always prints centiseconds, which churn on every tick of a live countdown.
function formatWait(seconds: number): string {
  const s = Math.ceil(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return formatTime(s);
}

function toggle(): void {
  dispatch.isActive.value = !dispatch.isActive.value;
}
</script>

<template>
  <div class="dispatch">
    <div class="dispatch__rungs">
      <span
        v-for="(rung, i) in RUNGS"
        :key="rung.id"
        class="dispatch__rung"
        :data-on="reached[i]"
        :title="rung.label"
      />
    </div>
    <span class="dispatch__state">{{ dispatch.tiers.currentTierId.value }}</span>
    <Button v-if="canHandOff" @click="toggle()">
      {{
        dispatch.isActive.value
          ? `Allocation: ${RULE_LABELS[dispatch.rule.value]}`
          : 'Hand off allocation'
      }}
    </Button>
    <div
      v-if="readout"
      class="dispatch__hold"
      role="meter"
      :aria-label="readout.saving ? `Saving for ${readout.displayName}` : 'Dispatching'"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(readout.share * 100)"
    >
      <span class="dispatch__hold-label">
        <template v-if="readout.saving">
          Saving for <span class="dispatch__hold-target">{{ readout.displayName }}</span>
        </template>
        <template v-else>Dispatching</template>
      </span>
      <span :key="holdCycle" class="dispatch__dim" :style="{ '--banked': readout.share }">
        <span class="dispatch__dim-banked" />
      </span>
      <span class="dispatch__dims">
        <span class="dispatch__dim-share">{{
          readout.saving ? `${Math.floor(readout.share * 100)}%` : 'built'
        }}</span>
        <span v-if="readout.saving" class="dispatch__dim-wait">{{
          Number.isFinite(readout.waitSeconds) ? formatWait(readout.waitSeconds) : '—'
        }}</span>
      </span>
    </div>
    <span v-if="nextNote" class="dispatch__locked">{{ nextNote }}</span>
  </div>
</template>

<style scoped>
.dispatch {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dispatch__rungs {
  display: flex;
  gap: 3px;
}
.dispatch__rung {
  flex: 1 1 0;
  height: 5px;
}
.dispatch__state {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dispatch__locked {
  font-size: 10px;
  opacity: 0.6;
}
.dispatch__hold {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
/* The line spans the full width and the banked span scales over it, so a tick
   moves a transform and never the layout. */
.dispatch__dim {
  position: relative;
  height: 7px;
}
.dispatch__dim::before,
.dispatch__dim-banked {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  height: 0;
}
.dispatch__dim-banked {
  transform: scaleX(var(--banked));
  transform-origin: left center;
}
.dispatch__dims {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
