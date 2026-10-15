<!--
  ReturnReport — the bookkeeper's note on a return: how long the firm ran
  without you and what it made. Time past the window is written off the books
  in red ink, not raised as a warning.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';
import type { OfflineReturn } from '../../modules';
import { money } from '../format';

const props = defineProps<{
  report: OfflineReturn;
  /** The window the replay was clamped to, in seconds. */
  windowSeconds: number;
  onClose: () => void;
}>();

const minutes = (s: number) => `${Math.round(s / 60)} min`;
const hours = (s: number) => (s >= 5400 ? `${(s / 3600).toFixed(1)} h` : minutes(s));
const unkept = computed(() => Math.max(0, props.report.awaySeconds - props.report.caughtUpSeconds));
</script>

<template>
  <section class="note">
    <DialogTitle as-child>
      <h2 class="smallcaps">While you were out</h2>
    </DialogTitle>
    <p class="lede">The night bookkeeper kept the firm running.</p>
    <dl>
      <dt>Away</dt>
      <dd class="num">{{ hours(report.awaySeconds) }}</dd>
      <dt>On the books</dt>
      <dd class="num">{{ minutes(report.caughtUpSeconds) }}</dd>
      <dt>Made</dt>
      <dd class="num gain">{{ money(report.cashGained) }}</dd>
    </dl>
    <p v-if="unkept > 0" class="unkept">
      {{ hours(unkept) }} written off: the books keep at most {{ minutes(windowSeconds) }}.
    </p>
    <Button class="resume smallcaps" @click="onClose">Back to the desk</Button>
  </section>
</template>

<style scoped>
.note {
  min-width: 320px;
  padding: 18px 22px;
  background: var(--tape-paper);
  color: var(--tape-ink);
  font-family: var(--face-ledger);
  border-radius: var(--radius-paper);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}
h2 {
  margin: 0;
  font-family: var(--face-letterhead);
  font-variant: small-caps;
  letter-spacing: 0.08em;
  font-weight: 400;
  font-size: 20px;
}
.lede {
  margin: 4px 0 12px;
  font-style: italic;
  font-family: var(--face-letterhead);
}
dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 0 0 12px;
  font-family: var(--face-adding-machine);
}
dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.gain {
  color: #2f6b45;
}
.unkept {
  margin: 0 0 12px;
  color: #9b2f1f;
  font-size: 13px;
}
.resume {
  font-family: var(--face-letterhead);
  font-variant: small-caps;
  letter-spacing: 0.08em;
  border: 1px solid var(--tape-ink);
  background: transparent;
  color: var(--tape-ink);
  border-radius: var(--radius-paper);
  padding: 5px 12px;
}
</style>
