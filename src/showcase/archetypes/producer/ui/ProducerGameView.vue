<!--
  ProducerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so module getters are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  Shell: ThreePanelShell, the clicker majority's secondary shell (Cookie Clicker,
  Universal Paperclips; `open-loop-research/practical/ui-ux/subgenre-shell-mapping-2026.md`):
  the desk you work at, the holdings you own, the office that runs them.
-->
<script setup lang="ts">
import { inject, watch } from 'vue';
import type { Engine } from '@open-loop/engine';
import { ThreePanelShell, modalStackKey } from '@/lib';
import { getAutomation, getFirm, getStanding, getTips } from '../modules';
import DeskPanel from './components/DeskPanel.vue';
import EndingNote from './components/EndingNote.vue';
import HoldingsPanel from './components/HoldingsPanel.vue';
import OfficePanel from './components/OfficePanel.vue';

// Dev-only hook for the screenshot loop: a stable handle on the modules, and a
// skip that plays forward in half-second steps (the acquisitions desk's cadence),
// catching tips and taking press and wire-room upgrades on sight. Read through
// the hook, not a live `import()` that Vite's module cache could serve stale.
if (import.meta.env.DEV) {
  const engine = inject<Engine>('engine')!;
  const buy = (
    all: { purchasable: { canPurchase: { value: boolean }; purchase(n: number): unknown } }[],
  ) => all.forEach((e) => e.purchasable.canPurchase.value && e.purchasable.purchase(1));
  (window as unknown as Record<string, unknown>).__holdings = {
    engine,
    firm: getFirm(),
    automation: getAutomation(),
    tips: getTips(),
    standing: getStanding(),
    skip: (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.5) {
        engine.tickDriver.advanceTime(0.5);
        getTips().catchTip();
        buy(getStanding().upgrades.getAll());
        buy(getTips().upgrades.getAll());
        buy(getAutomation().executives.getAll());
      }
    },
  };
}

// The deed, once, at the moment the building is bought.
const firm = getFirm();
const stack = inject(modalStackKey)!;
watch(
  () => firm.ending.active.value,
  (bought) => {
    if (!bought) return;
    const id = stack.push(EndingNote, {
      elapsed: firm.elapsed.value,
      onClose: () => stack.remove(id),
    });
  },
);
</script>

<template>
  <ThreePanelShell class="firm" left-width="340px" right-width="360px">
    <template #left>
      <DeskPanel />
    </template>
    <HoldingsPanel />
    <template #right>
      <OfficePanel />
    </template>
  </ThreePanelShell>
</template>

<style scoped>
.firm {
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}
/* The desk is the surface: the shell's columns draw no box of their own. */
.firm {
  gap: 18px;
  padding: 18px;
}
.firm :deep(.olui-three-panel__left),
.firm :deep(.olui-three-panel__main),
.firm :deep(.olui-three-panel__right) {
  background: transparent;
  border: none;
  padding: 0;
}
</style>
