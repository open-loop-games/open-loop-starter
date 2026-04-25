<script setup lang="ts">
import { AppFrame } from '@/lib';
</script>

<template>
  <AppFrame>
    <template #header>
      <div class="ambient-placeholder-header">
        Ambient pilot
      </div>
    </template>
    <div class="ambient-placeholder-body">
      Ambient UI is OL-700's deliverable. boot.ts wires this placeholder so `createApp()` builds;
      OL-700 replaces this component with the resume sequence + panels.
    </div>
  </AppFrame>
</template>

<style scoped>
.ambient-placeholder-header {
  padding: var(--gap-2);
  font-weight: 600;
}
.ambient-placeholder-body {
  padding: var(--gap-3);
  max-width: 60ch;
  line-height: 1.4;
}
</style>
