<!--
  About panel — engine / starter / fork copy. Imports the static markdown
  body from `src/about/` via `?raw` and renders through MarkdownDoc.
  Authored to be deletable along with `src/gallery/` when forks strip
  the showcase.
-->
<script setup lang="ts">
import aboutSource from '@/showcase/about/about.md?raw';
import MarkdownDoc from './MarkdownDoc.vue';
</script>

<template>
  <div class="about-panel">
    <MarkdownDoc :source="aboutSource" />
  </div>
</template>

<style>
.about-panel {
  max-width: 760px;
}
</style>
