<!--
  DispatchPanel — the automation ladder, shown as a ladder.

  The rungs render whether or not they are open, because the ladder's job is to
  withhold (`.claude/rules/archetype-authoring.md` § Conformance). A player who
  cannot see the closed rung reads "no automation exists" instead of "not yet",
  and the gate stops being a beat.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { DispatchKey, type ProducerAutomationTier } from '../../modules';
import { useModule } from '@/composables/useModule';

const dispatch = useModule(DispatchKey);

const RUNGS: { id: ProducerAutomationTier; label: string; note: string }[] = [
  { id: 'manual', label: 'Manual', note: 'You allocate every probe.' },
  { id: 'assisted', label: 'Assisted', note: 'Assisted dispatch at 25 probes' },
  { id: 'managed', label: 'Managed', note: 'Managed dispatch at 150 probes' },
];

const reached = computed(() => RUNGS.map((rung) => dispatch.tiers.hasReached(rung.id)));
const canHandOff = computed(() => dispatch.tiers.hasReached('assisted'));

/** The next rung's requirement, or null once the ladder is fully open. */
const nextNote = computed(() => {
  const index = reached.value.findIndex((open) => !open);
  return index === -1 ? null : RUNGS[index].note;
});

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
      {{ dispatch.isActive.value ? 'Allocation: payback-greedy' : 'Hand off allocation' }}
    </Button>
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
</style>
