<!--
  LastPagePanel — Phase IV: the box comes back down the chute with one page
  in it, and the first verb returns to read it.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { getBox } from '../../modules';

const box = getBox();
</script>

<template>
  <section class="nc-phase nc-last-page">
    <p class="nc-label">County Records &middot; Sub-basement B &middot; 2:14 a.m.</p>
    <p class="lede">The box is back on the desk. No label. One page left at the bottom.</p>
    <Button class="nc-verb" aria-label="Read a page" @click="box.readLast()">Read a page</Button>
  </section>
</template>

<style scoped>
.nc-last-page {
  padding-top: 8vh;
}
.lede {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--nc-paper);
}
</style>
