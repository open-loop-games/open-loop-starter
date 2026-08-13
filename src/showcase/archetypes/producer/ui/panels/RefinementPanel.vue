<!--
  RefinementPanel — the `UpgradeGrid` battery, plus the thing the battery has
  no opinion about: where a purchased upgrade goes.

  `UpgradeGrid` offers three purchased states — greyed, removed, checkmark.
  Producer needs a fourth behaviour that none of them describe: purchased cells
  leave the grid AND reappear compressed elsewhere. 24 refinements means 23 of
  them are noise by hour four, but dropping them entirely loses the record of
  what the stack is made of.

  So the split happens in `useRefinementCells` and the grid is handed only the
  open cells, while the register below renders the installed ones as one strip.
  This is NOT a battery defect — "where do bought things go" is a game
  decision, and a composition that answered it would be prescribing content.
  Recorded here rather than silently, per § Conformance.
-->
<script setup lang="ts">
import { UpgradeGrid } from '@/ui/compositions';
import { useRefinementCells } from '../../composables/useRefinementCells';

const { open, installed, installedCount, total } = useRefinementCells();
</script>

<template>
  <div class="refinements">
    <div v-if="installedCount > 0" class="refinements__register">
      <div class="refinements__register-head">
        <span>Installed</span>
        <span class="refinements__register-count">{{ installedCount }} / {{ total }}</span>
      </div>
      <p class="refinements__register-body">
        <span v-for="def in installed" :key="def.id" class="refinements__entry">{{
          def.name
        }}</span>
      </p>
    </div>

    <UpgradeGrid
      v-if="open.length"
      class="refinements__grid"
      :cells="open"
      :columns="2"
      reveal="tooltip"
      purchased-state="removed"
    />
    <p v-else class="refinements__empty">Nothing further specified at this scale.</p>
  </div>
</template>

<style scoped>
.refinements {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.refinements__register {
  padding: 7px 9px;
}
.refinements__register-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.refinements__register-count {
  font-variant-numeric: tabular-nums;
}
.refinements__register-body {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.5;
}
/* Separator lives in CSS so the entry list stays a plain node list — no
   join-with-string in the template, which would break at the first name
   containing the separator. */
.refinements__entry + .refinements__entry::before {
  content: ' · ';
}
.refinements__empty {
  margin: 0;
  font-size: 11px;
  font-style: italic;
  opacity: 0.6;
}
</style>
