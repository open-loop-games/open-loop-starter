<!--
  DeskPanel — the left rail: the letterhead, the books, the deal stamp, the
  credit grade and the adding-machine tape. The tape fills as the stamp goes
  quiet, so the rail stays alive after the sales desk takes the deals over.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import type { ResourceReadout } from '@/ui/compositions';
import { getAutomation, getFirm, type LedgerKind } from '../../modules';
import { clock, money, perSecond } from '../format';

const firm = getFirm();
const automation = getAutomation();

/** The books, in the readout shape; this rail renders it as the letterhead's ledger line. */
const books: ResourceReadout = {
  id: 'cash',
  label: 'Cash on hand',
  value: firm.cash,
  rate: automation.income,
};
const cash = computed(() => money(firm.cash.value));
const income = computed(() => perSecond(automation.income.value));
const dealValue = computed(() => money(firm.dealValue.value));
const deskDealing = computed(() => automation.working('sales-desk'));

const lifetime = computed(() => Decimal.fromValue(firm.cash.cumulative?.value ?? 0));
const grade = computed(() => {
  const earned = firm.grades.getAll().filter((e) => e.achievement.earned.value);
  return earned.length ? earned[earned.length - 1].def.grade : 'Unrated';
});
const nextGrade = computed(() => firm.grades.getAll().find((e) => !e.achievement.earned.value));
const gradeProgress = computed(() => {
  const next = nextGrade.value;
  if (!next) return 1;
  return Math.min(1, lifetime.value.div(next.def.threshold).toNumber());
});

// The stamp: each press thumps and floats its yield off the blotter.
const stamping = ref(false);
const floats = ref<Array<{ id: number; text: string; drift: number }>>([]);
let floatId = 0;
function press() {
  firm.deal();
  stamping.value = false;
  requestAnimationFrame(() => (stamping.value = true));
  const id = floatId++;
  floats.value = [
    ...floats.value.slice(-3),
    { id, text: `+${dealValue.value}`, drift: (id % 5) - 2 },
  ];
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), 900);
}

const tapeMark: Record<LedgerKind, string> = {
  acquire: 'ACQ',
  manage: 'MGT',
  hire: 'HIRE',
  milestone: '★',
  grade: 'CR',
  tip: 'TIP',
  away: 'AWAY',
};
</script>

<template>
  <section class="desk">
    <header class="letterhead">
      <div class="crest" aria-hidden="true">C<span>&amp;</span>H</div>
      <div>
        <h1 class="smallcaps">Consolidated Holdings</h1>
        <p class="est">Est. on a single pushcart</p>
      </div>
    </header>

    <div class="books">
      <div class="label smallcaps">{{ books.label }}</div>
      <div class="cash num" data-testid="cash">{{ cash }}</div>
      <div class="income num">{{ income }} from the firm</div>
    </div>

    <div class="stamp-well">
      <Button
        class="stamp"
        :class="{ thump: stamping, carbon: deskDealing }"
        data-testid="deal"
        @click="press"
        @animationend="stamping = false"
      >
        <span class="stamp-face smallcaps">Close a deal</span>
        <span class="stamp-value num">{{ dealValue }}</span>
      </Button>
      <span v-for="f in floats" :key="f.id" class="float num" :style="{ '--drift': f.drift }">{{
        f.text
      }}</span>
      <p v-if="deskDealing" class="desk-note">The sales desk is closing deals for you.</p>
    </div>

    <div class="credit">
      <div
        class="grade-seal smallcaps"
        :class="{ unrated: grade === 'Unrated', worded: grade.length > 3 && grade !== 'Unrated' }"
      >
        {{ grade }}
      </div>
      <div class="credit-text">
        <div class="smallcaps">Credit grade</div>
        <div v-if="nextGrade" class="credit-next">
          {{ nextGrade.def.grade }} at {{ money(nextGrade.def.threshold) }} lifetime revenue
        </div>
        <div v-else class="credit-next">Top of the ratings sheet.</div>
        <ProgressBar class="grade-rule" :value="gradeProgress" />
      </div>
    </div>

    <div class="tape-housing">
      <div class="tape-slot smallcaps">Adding machine</div>
      <ol class="tape" data-testid="tape">
        <li v-for="line in firm.ledger.value" :key="line.seq" :class="line.kind">
          <span class="t">{{ clock(line.at) }}</span>
          <span class="k">{{ tapeMark[line.kind] }}</span>
          <span class="x">{{ line.text }}</span>
          <span v-if="line.amount !== undefined" class="a">{{ money(line.amount) }}</span>
        </li>
        <li v-if="firm.ledger.value.length === 0" class="empty">— no entries —</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.desk {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.letterhead {
  display: flex;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid var(--ledger-rule);
  padding-bottom: 12px;
}
.crest {
  width: 46px;
  height: 46px;
  border: 1.5px solid var(--ink-seal);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--face-letterhead);
  color: var(--ink-seal);
  font-size: 14px;
  letter-spacing: -0.02em;
  white-space: nowrap;
  box-shadow:
    inset 0 0 0 3px var(--walnut),
    inset 0 0 0 4px rgba(210, 169, 78, 0.4);
}
.crest span {
  font-style: italic;
  font-size: 12px;
  margin: 0 1px;
}
h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 400;
  color: var(--ledger-paper);
}
.est {
  margin: 2px 0 0;
  color: var(--typed-dim);
  font-size: 13px;
}

.books .label {
  color: var(--typed-dim);
  font-size: 13px;
}
.cash {
  font-size: 38px;
  line-height: 1.1;
  color: var(--ledger-paper);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.income {
  color: var(--ink-affordable);
  font-size: 15px;
  margin-top: 2px;
}

.stamp-well {
  position: relative;
  display: grid;
  justify-items: center;
  padding: 6px 0;
}
.stamp {
  width: 200px;
  height: 120px;
  border: 3px double var(--ink-affordable);
  border-radius: 6px;
  background:
    radial-gradient(circle at 30% 25%, rgba(124, 199, 154, 0.12), transparent 60%),
    rgba(124, 199, 154, 0.05);
  color: var(--ink-affordable);
  display: grid;
  place-content: center;
  gap: 4px;
  transform: rotate(-3deg);
  transition: background-color 0.15s;
  user-select: none;
  padding: 0;
  font: inherit;
}
.stamp:hover {
  background-color: rgba(124, 199, 154, 0.12);
}
.stamp:focus-visible {
  outline: 2px solid var(--ink-seal);
  outline-offset: 4px;
}
.stamp.thump {
  animation: thump 0.16s ease-out;
}
.stamp.carbon {
  border-color: var(--ink-carbon);
  color: var(--ink-carbon);
  background-color: rgba(127, 159, 211, 0.06);
}
.stamp-face {
  font-size: 24px;
}
.stamp-value {
  font-size: 17px;
}
@keyframes thump {
  0% {
    transform: rotate(-3deg) scale(1);
  }
  40% {
    transform: rotate(-2deg) scale(0.93);
  }
  100% {
    transform: rotate(-3deg) scale(1);
  }
}
.float {
  position: absolute;
  top: -10px;
  left: calc(50% - 20px + var(--drift) * 34px);
  color: var(--ink-affordable);
  pointer-events: none;
  animation: float-off 0.9s ease-out forwards;
  font-size: 17px;
}
@keyframes float-off {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-34px);
  }
}
.desk-note {
  margin: 10px 0 0;
  color: var(--ink-carbon);
  font-size: 13px;
}

.credit {
  display: flex;
  gap: 12px;
  align-items: center;
}
.grade-seal {
  min-width: 62px;
  height: 62px;
  padding: 0 6px;
  border-radius: 50%;
  border: 2px solid var(--ink-seal);
  color: var(--ink-seal);
  display: grid;
  place-items: center;
  font-size: 20px;
  box-shadow:
    inset 0 0 0 4px var(--walnut),
    inset 0 0 0 5px rgba(210, 169, 78, 0.35);
}
.grade-seal.worded {
  font-size: 12px;
  line-height: 1.1;
  text-align: center;
  white-space: normal;
  width: 62px;
}
.grade-seal.unrated {
  font-size: 12px;
  color: var(--ink-filed);
  border-color: var(--ink-filed);
  box-shadow: none;
}
.credit-text {
  flex: 1;
  font-size: 13px;
}
.credit-text .smallcaps {
  color: var(--typed-dim);
}
.credit-next {
  margin: 2px 0 6px;
}
.grade-rule {
  --progress-bar-fill: var(--ink-seal);
  --progress-bar-track: var(--ledger-rule);
  --progress-bar-radius: 0;
  --progress-bar-transition: transform 0.3s linear;
}
.grade-rule :deep(.olui-progress-bar__track) {
  min-height: 3px;
}

.tape-housing {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tape-slot {
  width: 100%;
  text-align: center;
  font-size: 11px;
  color: var(--typed-dim);
  border: 1px solid var(--ledger-rule);
  border-bottom: 4px solid #0c0907;
  padding: 4px 0;
  border-radius: 3px 3px 0 0;
  background: var(--walnut-grain);
}
.tape {
  list-style: none;
  margin: 0;
  width: 88%;
  padding: 8px 10px 18px;
  background: var(--tape-paper);
  color: var(--tape-ink);
  font-family: var(--face-adding-machine);
  font-size: 12px;
  min-height: 60px;
  max-height: 300px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 70%, transparent);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
}
.tape li {
  display: grid;
  grid-template-columns: 40px 34px 1fr auto;
  gap: 4px;
  line-height: 1.6;
  white-space: nowrap;
}
.tape .t {
  opacity: 0.55;
}
.tape .x {
  overflow: hidden;
  text-overflow: ellipsis;
}
.tape .a {
  color: #9b2f1f;
  font-variant-numeric: tabular-nums;
}
.tape .milestone .k,
.tape .grade .k,
.tape li.milestone,
.tape li.grade {
  color: #6b4a0e;
}
.tape .empty {
  display: block;
  text-align: center;
  opacity: 0.5;
}
</style>
