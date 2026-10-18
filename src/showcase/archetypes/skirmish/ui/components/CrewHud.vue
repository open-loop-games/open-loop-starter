<!--
  CrewHud — the top bar: the contract, the purse, the bunks, the clock and the astral
  scout. The purse and the bunks are starter's ResourceHeaderStrip, reskinned through its
  costume classes into lit meters: the label over a neon numeral, the rate beside it. The
  contract leads in the `#leading` slot; the clock and the scout trail in `#trailing`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import HudChip from '@/ui/components/HudChip.vue';
import { ResourceHeaderStrip, type ResourceReadout } from '@/ui/compositions';
import { getCareer, getMatch } from '../../modules';
import { clock, whole } from '../format';

const match = getMatch();
const career = getCareer();
const { p } = match;

const used = computed(() => Math.floor(p.supplyUsed()));
const readouts: ResourceReadout[] = [
  {
    id: 'scrip',
    label: 'Scrip',
    value: p.scrip,
    rate: computed(() => p.scripRate()),
    format: whole,
  },
  {
    id: 'aether',
    label: 'Aether',
    value: p.aether,
    rate: computed(() => p.aetherRate()),
    format: whole,
  },
  {
    id: 'bunks',
    label: 'Bunks',
    value: used,
    capacity: p.supplyCap,
    // A full barracks stalls every training floor: the bunks read short.
    highlight: computed(() => (p.supplyUsed() >= p.supplyCap.value - 0.5 ? 'deficit' : 'normal')),
    format: (v) => String(toNumber(v)),
  },
];

const canScout = computed(
  () =>
    match.phase.value === 'live' &&
    match.scoutCooldown.value <= 0 &&
    toNumber(p.aether.value) >= match.scoutCost,
);
const scoutLabel = computed(() => {
  if (match.scoutLeft.value > 0) return `Riding the ley · ${Math.ceil(match.scoutLeft.value)}s`;
  if (match.scoutCooldown.value > 0)
    return `Scout rests · ${Math.ceil(match.scoutCooldown.value)}s`;
  return `Astral scout · ${match.scoutCost} aether`;
});
</script>

<template>
  <ResourceHeaderStrip class="hud" :readouts="readouts">
    <template #leading>
      <div class="hud__brand">
        <span class="cc-tag"
          >Contract {{ career.contractIndex.value + 1 }} · {{ match.contract.value.outfit }}</span
        >
        <span class="hud__rival">{{ match.contract.value.rival }}</span>
      </div>
    </template>
    <template #trailing>
      <HudChip class="hud__clock">
        <span class="hud__clock-label">Clock</span>
        <span class="hud__clock-value num">{{ clock(match.clock.value) }}</span>
      </HudChip>
      <Button
        class="hud__scout"
        :disabled="!canScout"
        :data-active="match.scoutLeft.value > 0"
        @click="match.scout()"
      >
        {{ scoutLabel }}
      </Button>
    </template>
  </ResourceHeaderStrip>
</template>

<style scoped>
.hud :deep(.hud-bar.hud-bar) {
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 18px;
  padding: 8px 14px;
  background: linear-gradient(180deg, var(--cc-asphalt-lit), var(--cc-asphalt-raised));
  border: 1px solid var(--cc-gutter);
  border-bottom: 2px solid var(--cc-sodium-deep);
  border-radius: var(--cc-notch);
}
.hud__brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-right: auto;
}
.hud__rival {
  font-family: var(--cc-face-sign);
  font-size: 18px;
  letter-spacing: 0.08em;
  color: var(--cc-sodium);
  text-shadow: 0 0 12px var(--cc-sodium-glow);
}

/* A meter: the label over the numeral, the rate beside it. */
.hud :deep(.hud-chip.hud-chip) {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-areas:
    'label label'
    'value rate';
  column-gap: 8px;
  align-items: end;
  align-content: center;
  min-width: 110px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 0;
  font-weight: normal;
  font-size: 1em;
  color: var(--cc-chalk);
}
.hud :deep(.resource-header-strip__label),
.hud__clock-label {
  grid-area: label;
  margin: 0;
  opacity: 1;
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cc-chalk-faint);
}
/* Kenney High has no tabular figures ("1" is narrower than "0"), so a live numeral gets a
   fixed right-aligned box instead: a changing digit never moves a neighbour. */
.hud :deep(.resource-header-strip__value),
.hud__clock-value {
  grid-area: value;
  display: inline-block;
  min-width: 5.5ch;
  text-align: right;
  font-family: var(--cc-face-neon);
  font-size: 30px;
  line-height: 0.85;
}
.hud :deep(.resource-header-strip__rate) {
  grid-area: rate;
  margin: 0;
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.hud :deep([data-readout-id='scrip'] .resource-header-strip__value) {
  color: var(--cc-brass);
}
.hud :deep([data-readout-id='aether'] .resource-header-strip__value) {
  color: var(--cc-ley);
}
.hud :deep([data-highlight='deficit'] .resource-header-strip__value) {
  color: var(--cc-short);
}
.hud__scout {
  align-self: center;
  min-width: 210px;
  padding: 7px 12px;
  background: var(--cc-asphalt);
  border: 1px solid var(--cc-ley);
  border-radius: var(--cc-notch);
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cc-ley);
  cursor: pointer;
}
.hud__scout:hover {
  background: var(--cc-asphalt);
}
.hud__scout:disabled {
  opacity: 1;
  border-color: var(--cc-rain);
  color: var(--cc-chalk-faint);
  cursor: default;
}
.hud__scout[data-active='true'] {
  border-color: var(--cc-ley);
  color: var(--cc-ley);
  box-shadow: 0 0 14px var(--cc-ley-glow);
}
</style>
