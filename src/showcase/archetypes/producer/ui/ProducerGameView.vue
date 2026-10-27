<!--
  ProducerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: ColumnShell with both rails, the clicker majority's secondary shell (Cookie
  Clicker, Universal Paperclips; `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`):
  the desk you work at, the holdings you own, the office that runs them. The shell draws
  no panels, so the desk itself is the surface.
-->
<script setup lang="ts">
import { inject, watch } from 'vue';
import { ColumnShell, modalStackKey } from '@/lib';
import { useDevHandle } from '@/composables/useDevHandle';
import { getAutomation, getFirm, getStanding, getTips } from '../modules';
import DeskPanel from './components/DeskPanel.vue';
import EndingNote from './components/EndingNote.vue';
import HoldingsPanel from './components/HoldingsPanel.vue';
import OfficePanel from './components/OfficePanel.vue';

// Dev-only hook for the screenshot loop, on window.__game: its skip plays forward
// in half-second steps (the acquisitions desk's cadence), catching tips and taking
// press and wire-room upgrades on sight.
if (import.meta.env.DEV) {
  const buy = (
    all: { purchasable: { canPurchase: { value: boolean }; purchase(n: number): unknown } }[],
  ) => all.forEach((e) => e.purchasable.canPurchase.value && e.purchasable.purchase(1));
  useDevHandle(
    { firm: getFirm(), automation: getAutomation(), tips: getTips(), standing: getStanding() },
    {
      chunk: 0.5,
      step: () => {
        getTips().catchTip();
        buy(getStanding().upgrades.getAll());
        buy(getTips().upgrades.getAll());
        buy(getAutomation().executives.getAll());
      },
    },
  );
}

// The deed, once, at the moment the building is bought.
const firm = getFirm();
const stack = inject(modalStackKey)!;
watch(
  () => firm.ending.active.value,
  (bought) => {
    if (!bought) return;
    stack.push(EndingNote, { elapsed: firm.elapsed.value });
  },
);
</script>

<template>
  <ColumnShell
    class="firm"
    side-bar-left-width="340px"
    side-bar-right-width="360px"
    max-width="1440px"
  >
    <template #sideBarLeft>
      <DeskPanel />
    </template>
    <HoldingsPanel />
    <template #sideBarRight>
      <OfficePanel />
    </template>
  </ColumnShell>
</template>

<style scoped>
.firm {
  --shell-gap: 18px;
}
</style>
