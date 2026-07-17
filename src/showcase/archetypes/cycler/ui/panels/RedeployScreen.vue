<!--
  RedeployScreen — the OVERRUN payout overlay. The line broke; the run ends and PAYS
  OUT (a Redeploy bell, not a fail — Industry-Idle, not Thronefall). Shows the run
  summary (wave survived, reach, Fragments minted) and the Redeploy CTA that banks
  the payout and re-pegs W₀=C/H for a deeper cycle. Fragments auto-bank on the breach;
  Redeploy is re-peg-only. Mounts absolute over the world when the run has ended.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format, formatTime } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { getCycle, getPrestige } from '../../modules';
import { useCyclerRun } from '../../composables/useCyclerRun';

const cycle = getCycle();
const prestige = getPrestige();
const run = useCyclerRun();

const wave = computed(() => cycle.endedAtWave.value ?? 0);
const runLen = computed(() =>
  cycle.endedAtMinutes.value !== null
    ? formatTime(Math.round(cycle.endedAtMinutes.value * 60))
    : '—',
);
const minted = computed(() => format(run.pendingFragments.value, 0));
const total = computed(() => format(prestige.fragments.value, 0));
const cycleNo = computed(() => prestige.mergeCount.value + 1);
</script>

<template>
  <div class="cyc-regroup">
    <div class="cyc-regroup__box">
      <div class="cyc-regroup__hd">
        Line Overrun
      </div>
      <div class="cyc-regroup__sub">
        cycle {{ cycleNo }} · survived to wave {{ wave }} · {{ runLen }} · DEFCON 1 breach
      </div>
      <div class="cyc-regroup__stat">
        <span>reach attained</span><b>Power L{{ run.powerLevel.value }}</b>
      </div>
      <div class="cyc-regroup__stat">
        <span>fragments banked</span><b>◈ {{ total }}</b>
      </div>
      <div class="cyc-regroup__stat">
        <span>this run minted</span><b class="gain">◈ + {{ minted }}</b>
      </div>
      <p class="cyc-regroup__note">
        Fragments salvaged from the wreck. Spend them on Reinforce / Dampen, then stand the line
        back up — it holds as long as ever, but reaches further into the dark.
      </p>
      <Button
        class="cyc-btn cyc-regroup__cta"
        @click="run.merge()"
      >
        ◈ Redeploy the line →
      </Button>
    </div>
  </div>
</template>

<style scoped>
.cyc-regroup {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: radial-gradient(circle at 50% 45%, rgba(122, 37, 48, 0.28), rgba(4, 7, 10, 0.9) 70%);
}
.cyc-regroup__box {
  border: 1px solid var(--cyc-red);
  background: rgba(7, 16, 22, 0.94);
  padding: 22px 26px;
  max-width: 440px;
  text-align: center;
  box-shadow: 0 0 40px -8px var(--cyc-red);
}
.cyc-regroup__hd {
  font-size: 15px;
  letter-spacing: 3px;
  color: var(--cyc-red);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.cyc-regroup__sub {
  font-size: 11px;
  color: var(--cyc-grn2);
  letter-spacing: 0.5px;
  margin-bottom: 14px;
  font-variant-numeric: tabular-nums;
}
.cyc-regroup__stat {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  padding: 5px 0;
  border-bottom: 1px solid var(--cyc-grndim);
}
.cyc-regroup__stat span {
  color: var(--cyc-grn2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.cyc-regroup__stat b {
  color: var(--cyc-grn);
  font-variant-numeric: tabular-nums;
}
.cyc-regroup__stat b.gain {
  color: var(--cyc-amb);
}
.cyc-regroup__note {
  font-size: 10px;
  color: var(--cyc-grn2);
  margin: 12px 0 14px;
  line-height: 1.5;
}
.cyc-regroup__cta {
  width: 100%;
  padding: 11px;
  font-size: 13px;
  letter-spacing: 2px;
  box-shadow: 0 0 16px -4px var(--cyc-grn);
  animation: cyc-beacon 1.6s ease-in-out infinite;
}
@keyframes cyc-beacon {
  50% {
    box-shadow: 0 0 22px 0 var(--cyc-grn);
  }
}
</style>
