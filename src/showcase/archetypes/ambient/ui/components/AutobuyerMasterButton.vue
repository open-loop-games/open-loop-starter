<!--
  Master autobuyer kill-switch button (ambient: "Tending"). Standalone
  component so the useAutobuyers() inject runs inside a child of the
  v-else AppFrame — i.e., after engine.start() has installed the
  autobuyer registry module. Mounting it under AmbientAppRoot's
  <script setup> would fire the inject before slot-pick runs
  engine.start().
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
    class="btn-sm almanac-autobuyer-master"
    :class="{ 'is-active': autobuyers.master.value }"
    :title="autobuyers.master.value ? 'Pause tending' : 'Resume tending'"
    @click="toggle"
  >
    {{ autobuyers.master.value ? '☑' : '☐' }} Tending
  </Button>
</template>
