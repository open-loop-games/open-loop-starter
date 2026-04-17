<script setup lang="ts">
import { ThreePanelShell } from '@/lib';
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
    <ThreePanelShell
      class="ledger-body"
      left-width="280px"
      right-width="280px"
    >
      <template #left>
        <ActionsPanel />
      </template>
      <LedgerPanel />
      <template #right>
        <ProducersPanel />
        <UpgradesPanel />
      </template>
    </ThreePanelShell>
  </div>
</template>

<style scoped>
.ledger-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1;
}
.ledger-body {
  flex: 1;
  min-height: 0;
}
</style>
