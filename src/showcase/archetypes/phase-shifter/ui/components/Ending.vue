<!--
  Ending — the case closed. The tick driver has stopped and stays stopped;
  these lines are all that is left.
-->
<script setup lang="ts">
import { ENDING } from '../../data';
</script>

<template>
  <article class="nc-ending">
    <p class="case">Case 1147 &middot; closed</p>
    <p v-for="(line, i) in ENDING" :key="line" :style="{ animationDelay: `${i * 1.2}s` }">
      {{ line }}
    </p>
  </article>
</template>

<style scoped>
.nc-ending {
  padding-top: 14vh;
  font-size: 20px;
}
.nc-ending p {
  margin: 0 0 14px;
  animation: nc-arrive 1.2s ease-out both;
}
.nc-ending p:last-child {
  color: var(--nc-manila);
}
.nc-ending .case {
  color: var(--nc-stamp);
  font-family: var(--nc-face-typed);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 14px;
}
</style>
