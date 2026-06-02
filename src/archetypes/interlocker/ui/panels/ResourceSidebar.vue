<script setup lang="ts">
import { useResources } from '../composables';
import ResourceList from '../components/ResourceList.vue';

const readouts = useResources();
</script>

<template>
  <ResourceList :readouts="readouts" />
</template>
