<script setup lang="ts">
import { ResourceHeaderStrip } from '@/ui/compositions';
import { useResources } from '../composables';

const readouts = useResources();
</script>

<template>
  <ResourceHeaderStrip
    :readouts="readouts"
    orientation="vertical-sidebar"
  />
</template>
