<!--
  Epilogue — the ending, pushed onto the scaffold's modal stack when the Hart is
  taken. The stack portals it outside `.explorer`, so its root carries the
  costume class itself.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle } from 'reka-ui';
import { getChronicle, getWold } from '../modules';
import { milestoneClock } from './format';

const chronicle = getChronicle();
const wold = getWold();

const LABELS: [RegExp, string][] = [
  [/^enter band 1$/, 'First steps in the Old Forest'],
  [/^enter band 2$/, 'Into the Fen'],
  [/^enter band 3$/, 'Onto the Snowfield'],
  [/^enter band 4$/, 'Under the Deepwood'],
  [/^camp (\d)$/, 'Camp $1 raised'],
  [/^first loss$/, 'First haul lost'],
  [/^trophy mattock$/, 'The Old Tusker taken'],
  [/^trophy coracle$/, 'The Mere Wolf taken'],
  [/^trophy sledge$/, 'The White Bear taken'],
  [/^the Hart$/, 'The Pale Hart'],
];

const milestones = computed(() =>
  chronicle.beats.value.flatMap((b) => {
    const hit = LABELS.find(([re]) => re.test(b.label));
    return hit ? [{ at: b.at, text: b.label.replace(hit[0], hit[1]) }] : [];
  }),
);
const finished = computed(() => chronicle.beats.value.find((b) => b.label === 'the Hart')?.at ?? 0);
</script>

<template>
  <article class="explorer sp-epilogue">
    <DialogTitle as-child><h1>The Hart is taken</h1></DialogTitle>
    <p>
      The wold you walked into blind is charted to its heart:
      <span class="sp-num">{{ wold.chartedCount.value }}</span> tiles,
      <span class="sp-num">{{ wold.camps.value.length }}</span> camps. Nothing more waits in the
      Deepwood.
    </p>
    <ol>
      <li v-for="m in milestones" :key="m.text">
        <span class="sp-num">{{ milestoneClock(m.at) }}</span> {{ m.text }}
      </li>
    </ol>
    <p class="coda sp-num">Finished in {{ milestoneClock(finished) }}.</p>
  </article>
</template>

<style scoped>
.sp-epilogue {
  padding: 24px 28px;
}
h1 {
  margin: 0 0 10px;
  font-family: var(--sp-face-display);
  font-weight: 600;
  font-size: 24px;
  color: var(--sp-tallow);
}
p {
  color: var(--sp-birch-dim);
}
ol {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}
li {
  padding: 2px 0;
  color: var(--sp-birch);
}
li .sp-num {
  display: inline-block;
  width: 70px;
  color: var(--sp-ash);
}
.coda {
  color: var(--sp-birch);
}
</style>
