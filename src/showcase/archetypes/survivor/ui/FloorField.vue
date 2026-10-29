<!--
  FloorField — hosts the pixi floor. It owns the animation-frame loop, keeps the scene in a
  plain `let` outside Vue reactivity, and hands the scene the live arena each frame; the
  scene draws it and writes nothing. Pointer input is not read here: it bubbles to the take's
  stage, which steers the double.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { getTake } from '../modules';
import { FloorScene } from './floor/floor-scene';

const take = getTake();
const host = useTemplateRef<HTMLDivElement>('host');

let scene: FloorScene | null = null;
let raf = 0;
let last = 0;
let observer: ResizeObserver | undefined;

function frame(t: number): void {
  const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
  last = t;
  scene?.render(take.arena(), dt, t / 1000);
  raf = requestAnimationFrame(frame);
}

/** The floor's counts and draw time, which the frame-time check reads beside its frame times. */
defineExpose({ stats: () => scene?.stats() });

onMounted(() => {
  scene = new FloorScene(host.value!);
  observer = new ResizeObserver(() => scene?.resize());
  observer.observe(host.value!);
  raf = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  observer?.disconnect();
  scene?.dispose();
  scene = null;
});
</script>

<template>
  <div ref="host" class="floor" aria-label="The soundstage floor" />
</template>

<style scoped>
.floor {
  position: absolute;
  inset: 0;
  cursor: crosshair;
}
.floor :deep(canvas) {
  display: block;
}
</style>
