<!--
  ShellFloat — content anchored over the main region of the enclosing shell, on a
  3×3 grid: a HUD readout, a minimap, an alert. Place it in the shell's #floats
  slot. Floats on one anchor stack in slot order. The float is layout only, like
  the shell: its content draws any surface.

  Outside a shell it renders in place.

  Costume class: olui-shell-float, with data-anchor.
-->
<script setup lang="ts">
import { inject } from 'vue';
import { shellFloatTargetKey, type ShellAnchor } from './shell-props';

defineProps<{
  anchor: ShellAnchor;
}>();

const target = inject(shellFloatTargetKey, null);
</script>

<template>
  <!-- defer: the anchor cells are the shell's own children, so they exist only once it mounts. -->
  <Teleport defer :to="target?.(anchor)" :disabled="!target">
    <div class="olui-shell-float" :data-anchor="anchor"><slot /></div>
  </Teleport>
</template>
