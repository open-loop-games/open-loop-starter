<!--
  Ledger — a phase's readouts in one row: a label over a figure. An entry
  marked `automated` is drawn in the lamp's green: the clerks do this.
-->
<script setup lang="ts">
export interface LedgerEntry {
  label: string;
  value: string;
  automated?: boolean;
}

defineProps<{ entries: LedgerEntry[] }>();
</script>

<template>
  <dl class="nc-ledger">
    <div v-for="e in entries" :key="e.label" :class="{ automated: e.automated }">
      <dt class="nc-label">{{ e.label }}</dt>
      <dd class="nc-num">{{ e.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.nc-ledger {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 28px;
  margin: 0;
}
.nc-ledger div {
  min-width: 120px;
}
.nc-ledger dd {
  margin: 0;
  font-size: 25px;
  color: var(--nc-paper);
}
.nc-ledger .automated dd {
  color: var(--nc-lamp);
}
</style>
