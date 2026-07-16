<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format, type DecimalSource } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import type { RuneId } from '../data';
import {
  getOfferings,
  getRuneEXP,
  getRuneLevel,
  getRuneEffects,
  computeEXPToLevel,
  sacrificeRune,
} from '../modules';
import type { RuneEffectMap } from '../data';

const props = defineProps<{
  runeId: RuneId;
  displayName: string;
}>();

const offerings = getOfferings();
const exp = getRuneEXP(props.runeId);
const level = getRuneLevel(props.runeId);
const effects = getRuneEffects(props.runeId);

const expToNext = computed<DecimalSource>(() => computeEXPToLevel(props.runeId, level.value + 1));
const expRemaining = computed(() => Decimal.max(0, Decimal.sub(expToNext.value, exp.value)));

const canSacrifice = computed(() => Decimal.gt(offerings.value, 0));

function doSacrifice(): void {
  if (!canSacrifice.value) return;
  sacrificeRune(props.runeId, offerings.value);
}

// First-arc-active effect summary — surface the keys actually bound into
// rateChains so the player sees "what does this rune do at current level?"
// Inert keys evaluate but aren't shown to keep the readout focused on the
// observable surface.
const effectSummary = computed((): string => {
  const e = effects.value as RuneEffectMap[RuneId];
  switch (props.runeId) {
    case 'speed':
      return `×${(e as RuneEffectMap['speed']).multiplicativeAccelerators.toFixed(3)} mAcc`;
    case 'duplication':
      return `×${(e as RuneEffectMap['duplication']).multiplicativeMultipliers.toFixed(3)} mMult`;
    case 'prism': {
      const log = (e as RuneEffectMap['prism']).productionLog10;
      return `×10^${log.toFixed(2)} prod`;
    }
    case 'thrift':
      return `inert at first arc`;
    case 'superiorIntellect':
      return `×${(e as RuneEffectMap['superiorIntellect']).offeringMult.toFixed(3)} offerings/reset`;
    default:
      return '';
  }
});
</script>

<template>
  <div class="olui-surface rune-row">
    <div class="rune-row__head">
      <strong class="rune-row__name">{{ displayName }}</strong>
      <span class="rune-row__level">Lv {{ level }}</span>
      <span class="rune-row__effect">{{ effectSummary }}</span>
    </div>
    <div class="rune-row__progress">
      <span>EXP {{ format(exp, 0) }}</span>
      <span>· next at {{ format(expToNext, 0) }}</span>
      <span>· {{ format(expRemaining, 0) }} to go</span>
    </div>
    <Button
      :disabled="!canSacrifice"
      class="rune-row__action"
      @click="doSacrifice"
    >
      Sacrifice all offerings
    </Button>
  </div>
</template>

<style scoped>
.rune-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
}
.rune-row__head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}
.rune-row__name {
  min-width: 9em;
}
.rune-row__level,
.rune-row__effect {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
}
.rune-row__effect {
  margin-left: auto;
}
.rune-row__progress {
  display: flex;
  gap: var(--gap-xs);
  flex-wrap: wrap;
  font-size: 0.8em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.rune-row__action {
  align-self: flex-start;
}
</style>
