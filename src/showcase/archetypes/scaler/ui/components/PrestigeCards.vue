<!--
  PrestigeCards — the three prestige buttons and what each would bank. Reboot's
  meter fills toward the first Legacy, then toward the next point; Rewrite's
  toward its threshold of Legacy earned; the Age's toward its gate of Continuity
  earned this Age. Under Reboot and Rewrite sit the duty switch and share of the
  automation that takes each over: the Succession Plan, the Crossover Event.
  Turning the Age stays yours.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Select from '@/ui/components/Select.vue';
import { REBOOT_THRESHOLD, REWRITE_THRESHOLD, ageName } from '../../data';
import {
  getAutomation,
  getCanon,
  getContinuity,
  getCore,
  getLegacy,
  getPrestige,
  getRun,
} from '../../modules';
import { fmt, fmtMult } from '../format';

const core = getCore();
const run = getRun();
const legacy = getLegacy();
const continuity = getContinuity();
const canon = getCanon();
const prestige = getPrestige();
const automation = getAutomation();

const canReboot = computed(() => Decimal.gte(prestige.pendingLegacy.value, 1));
const rebootFill = computed(() => {
  const target = canReboot.value ? prestige.nextLegacyAt.value : REBOOT_THRESHOLD;
  return Math.min(1, Decimal.div(run.runEarned.value, target).toNumber());
});
const inElseworld = computed(() => prestige.elseworlds.current.value !== null);
const showRewrite = computed(() => core.rewrites.value > 0 || core.reboots.value >= 3);
const canRewrite = computed(() => Decimal.gte(prestige.pendingContinuity.value, 1));
const rewriteFill = computed(() =>
  Math.min(1, Decimal.div(legacy.legacyEarned.value, REWRITE_THRESHOLD).toNumber()),
);
const showAge = computed(() => core.ages.value > 0 || core.rewrites.value >= 3);
const canTurn = computed(() => Decimal.gte(prestige.pendingCanon.value, 1));
const ageFill = computed(() =>
  Math.min(1, Decimal.div(continuity.continuityEarned.value, prestige.ageGate.value).toNumber()),
);
const succession = computed(() => automation.ladder.isUnlocked('succession'));
const crossover = computed(() => canon.upgrade('crossover').active.value);

const SHARES = [
  { value: '0', label: 'any gain' },
  { value: '0.25', label: '25% of earned' },
  { value: '0.5', label: '50% of earned' },
  { value: '1', label: '100% of earned' },
] as const;
const rebootShare = computed({
  get: () => String(automation.autoRebootShare.value),
  set: (v: string) => {
    automation.autoRebootShare.value = Number(v);
  },
});
const rewriteShare = computed({
  get: () => String(automation.crossoverShare.value),
  set: (v: string) => {
    automation.crossoverShare.value = Number(v);
  },
});
</script>

<template>
  <section class="panel card">
    <span class="caption">Reboot the Timeline</span>
    <p class="what">
      End this issue. Everything you recruited is gone; you keep Legacy, and every hero works harder
      for each point of Legacy earned.
    </p>
    <ProgressBar class="meter" :value="rebootFill" />
    <div class="line num">
      <span>Run {{ fmt(run.runEarned.value) }}</span>
      <span>{{
        canReboot ? `next at ${fmt(prestige.nextLegacyAt.value)}` : `needs ${fmt(REBOOT_THRESHOLD)}`
      }}</span>
    </div>
    <Button class="act big" :disabled="!canReboot" data-testid="reboot" @click="prestige.reboot()">
      <template v-if="canReboot">
        Reboot +<span class="num">{{ fmt(prestige.pendingLegacy.value) }}</span>
      </template>
      <template v-else>Reboot</template>
    </Button>
    <p v-if="inElseworld && canReboot" class="warn">Rebooting now abandons the Elseworld.</p>
    <div class="line dim num">
      <span>Bonus {{ fmtMult(legacy.legacyMultiplier.value) }}</span>
      <span>earned {{ fmt(legacy.legacyEarned.value) }}</span>
    </div>
    <div v-if="succession" class="auto reveal">
      <Button
        class="duty"
        role="switch"
        :aria-checked="automation.autoRebootOn.value"
        aria-label="Succession Plan on duty"
        @click="automation.autoRebootOn.value = !automation.autoRebootOn.value"
      >
        Succession Plan {{ automation.autoRebootOn.value ? 'on' : 'off' }}
      </Button>
      <span>reboots at</span>
      <Select v-model="rebootShare" :options="SHARES" aria-label="Succession Plan share" />
      <span class="num">every {{ Math.round(automation.rebootInterval()) }}s at most</span>
    </div>
  </section>

  <section v-if="showRewrite" class="panel card rewrite reveal">
    <span class="caption orbit">Rewrite the Multiverse</span>
    <p class="what">
      Retire the whole run of issues. Legacy, its shop and the Network are gone; Continuity remains,
      and every point earned this Age multiplies the corps.
    </p>
    <ProgressBar class="meter orbit" :value="rewriteFill" />
    <div class="line num">
      <span>Earned {{ fmt(legacy.legacyEarned.value) }}</span>
      <span>needs {{ fmt(REWRITE_THRESHOLD) }}</span>
    </div>
    <Button
      class="act orbit big"
      :disabled="!canRewrite"
      data-testid="rewrite"
      @click="prestige.rewrite()"
    >
      <template v-if="canRewrite">
        Rewrite +<span class="num">{{ fmt(prestige.pendingContinuity.value) }}</span>
      </template>
      <template v-else>Rewrite</template>
    </Button>
    <div v-if="crossover" class="auto reveal">
      <Button
        class="duty"
        role="switch"
        :aria-checked="automation.crossoverOn.value"
        aria-label="Crossover Event on duty"
        @click="automation.crossoverOn.value = !automation.crossoverOn.value"
      >
        Crossover {{ automation.crossoverOn.value ? 'on' : 'off' }}
      </Button>
      <span>rewrites at</span>
      <Select v-model="rewriteShare" :options="SHARES" aria-label="Crossover Event share" />
    </div>
  </section>

  <section v-if="showAge" class="panel card age reveal">
    <span class="caption foil">Turn the Age</span>
    <p class="what">
      Close the {{ ageName(core.ages.value) }} Age. Continuity, its shop and the Earths are gone,
      but for the automation and the Archives; Canon remains, and multiplies the corps and every
      Rewrite.
    </p>
    <ProgressBar class="meter foil" :value="ageFill" />
    <div class="line num">
      <span>Earned {{ fmt(continuity.continuityEarned.value) }}</span>
      <span>needs {{ fmt(prestige.ageGate.value) }}</span>
    </div>
    <Button
      class="act foil big"
      :disabled="!canTurn"
      data-testid="turn-age"
      @click="prestige.turnAge()"
    >
      <template v-if="canTurn">
        Begin the {{ ageName(core.ages.value + 1) }} Age +<span class="num">{{
          fmt(prestige.pendingCanon.value)
        }}</span>
      </template>
      <template v-else>Turn the Age</template>
    </Button>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.what {
  margin: 2px 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--newsprint-dim);
}
.line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
}
.line.dim {
  color: var(--newsprint-dim);
}
.big {
  padding: 10px 12px;
  font-size: 13px;
}
.warn {
  margin: 0;
  color: var(--cape);
  font-size: 12px;
}
.auto {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--steel);
  border-top: 2px dashed var(--newsprint-faint);
  padding-top: 8px;
}
</style>
