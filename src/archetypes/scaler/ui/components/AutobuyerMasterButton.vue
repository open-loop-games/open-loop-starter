<!--
  Master autobuyer kill-switch button. Standalone component so the
  useAutobuyers() inject runs inside a child of the v-else AppFrame —
  i.e., after engine.start() has installed the autobuyer registry
  module. Mounting it under ScalerAppRoot's <script setup> would fire
  the inject before slot-pick runs engine.start().
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useAutobuyers } from '../../composables';

const autobuyers = useAutobuyers();

function toggle(): void {
  autobuyers.master.value = !autobuyers.master.value;
}
</script>

<template>
  <Button
    class="btn-sm scaler-autobuyer-master"
    :class="{ 'is-active': autobuyers.master.value }"
    :title="autobuyers.master.value ? 'Pause all autobuyers' : 'Resume all autobuyers'"
    @click="toggle"
  >
    {{ autobuyers.master.value ? '☑' : '☐' }} Automation
  </Button>
</template>

<style scoped>
.scaler-autobuyer-master {
  align-self: stretch;
  margin-top: var(--gap-xs);
}
.scaler-autobuyer-master.is-active {
  border-color: var(--color-accent);
}
</style>
