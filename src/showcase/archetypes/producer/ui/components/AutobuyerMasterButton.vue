<!--
  Master autobuyer kill-switch button. A header action that reads module state
  (`useAutobuyers`), so it's its own component under the game view — every module
  read lives below the post-start frame.
  See `.claude/rules/app-root-discipline.md`.
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
    class="btn-sm bakery-autobuyer-master"
    :class="{ 'is-active': autobuyers.master.value }"
    :title="autobuyers.master.value ? 'Pause all autobuyers' : 'Resume all autobuyers'"
    @click="toggle"
  >
    {{ autobuyers.master.value ? '☑' : '☐' }} Automation
  </Button>
</template>
