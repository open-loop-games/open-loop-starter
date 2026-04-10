<script setup lang="ts">
import ResourcesPanel from '@/ui/panels/ResourcesPanel.vue';
import ActionsPanel from '@/ui/panels/ActionsPanel.vue';
import ProducersPanel from '@/ui/panels/ProducersPanel.vue';
import UpgradesPanel from '@/ui/panels/UpgradesPanel.vue';
import LoopPanel from '@/ui/panels/LoopPanel.vue';
import LedgerPanel from '@/ui/panels/LedgerPanel.vue';
</script>

<template>
  <div class="ledger-layout">
    <LoopPanel />
    <ResourcesPanel />
    <LedgerPanel />
    <div class="two-col">
      <ActionsPanel />
      <div class="side">
        <ProducersPanel />
        <UpgradesPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ledger-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
.side {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
@media (max-width: 720px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
</style>
