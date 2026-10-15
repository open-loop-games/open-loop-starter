<!--
  NightTallies — the masthead's live readouts and controls: night, Intel, escapes,
  the clock rungs Déjà Vu unlocks, and the automation toggles. It reads module
  state, so it is its own component in SystemHeader's slot and never a root read.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Switch from '@/ui/components/Switch.vue';
import { getAutomation, getMeta, getNight } from '../../modules';
import { whole } from '../format';

const meta = getMeta();
const night = getNight();
const automation = getAutomation();

const nightNumber = computed(() => night.cycle.count.value + (night.nightActive.value ? 1 : 0));
const intel = computed(() => new Decimal(meta.intel.value).toNumber());
const chosen = computed(() => Math.min(meta.chosenSpeed.value, meta.speedSteps.value.length - 1));
</script>

<template>
  <div class="lo-masthead">
    <dl class="lo-tallies">
      <div>
        <dt>Night</dt>
        <dd class="lo-num">{{ nightNumber || '—' }}</dd>
      </div>
      <div>
        <dt>Intel</dt>
        <dd class="lo-num lo-intel">{{ whole(intel) }}</dd>
      </div>
      <div v-if="meta.escapes.value > 0" class="lo-reveal">
        <dt>On the freight</dt>
        <dd class="lo-num">{{ meta.escapes.value }}</dd>
      </div>
    </dl>
    <div
      v-if="meta.speedSteps.value.length > 1"
      class="lo-clock lo-reveal"
      role="group"
      aria-label="Clock speed"
    >
      <span class="lo-control-label">Clock</span>
      <Button
        v-for="(s, i) in meta.speedSteps.value"
        :key="s"
        :class="{ on: chosen === i }"
        :aria-label="`Clock speed ×${s}`"
        @click="meta.chosenSpeed.value = i"
      >
        ×{{ s }}
      </Button>
    </div>
    <Switch
      v-if="automation.hasReached('routine')"
      v-model="automation.autoBegin.value"
      class="lo-auto lo-reveal"
    >
      Routine
    </Switch>
    <Switch
      v-if="automation.hasReached('discipline')"
      v-model="automation.autoTurnIn.value"
      class="lo-auto lo-reveal"
    >
      Discipline
    </Switch>
  </div>
</template>

<style scoped>
.lo-masthead {
  display: flex;
  align-items: center;
  gap: 24px;
}
.lo-tallies {
  display: flex;
  gap: 24px;
  margin: 0;
}
.lo-tallies div {
  display: flex;
  flex-direction: column;
}
.lo-tallies dt {
  font-size: 12px;
  color: var(--lo-ink-faded);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.lo-tallies dd {
  margin: 0;
  font-family: var(--lo-face-stencil);
  font-size: 24px;
  color: var(--lo-searchlight);
  min-width: 3ch;
}
.lo-tallies .lo-intel {
  color: var(--lo-sodium);
}
.lo-control-label {
  font-size: 12px;
  color: var(--lo-ink-faded);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-right: 6px;
}
.lo-clock button {
  background: transparent;
  border: 1px solid var(--lo-concrete-edge);
  padding: 2px 9px;
  cursor: pointer;
  font-family: var(--lo-face-stencil);
  color: var(--lo-ink-faded);
}
.lo-clock button + button {
  border-left: none;
}
.lo-clock button.on {
  color: var(--lo-night);
  background: var(--lo-sodium);
  border-color: var(--lo-sodium);
}
.lo-auto {
  gap: 6px;
  color: var(--lo-guard-lamp);
  font-size: 14px;
}
/* A small lamp switch in the guard lamp's green: lit when the routine runs. */
.lo-auto :deep(.olui-switch__track) {
  width: 26px;
  height: 14px;
  background: transparent;
  border: 1px solid var(--lo-concrete-edge);
}
.lo-auto :deep(.olui-switch__thumb) {
  width: 10px;
  height: 10px;
  background: var(--lo-ink-faded);
  transform: translateX(1px);
}
.lo-auto[data-state='checked'] :deep(.olui-switch__track) {
  background: var(--lo-guard-lamp-dim);
  border-color: var(--lo-guard-lamp);
}
.lo-auto[data-state='checked'] :deep(.olui-switch__thumb) {
  background: var(--lo-guard-lamp);
  transform: translateX(13px);
}
.lo-auto:focus-visible :deep(.olui-switch__track) {
  outline-color: var(--lo-guard-lamp);
}
</style>
