<!--
  BlockingDialog — a modal the user cannot dismiss: no ESC, no overlay-click,
  no close affordance. It stays until the app itself flips `open` false (usually
  after the player makes the one required choice). Built on reka-ui AlertDialog,
  themed with the shared --modal-* tokens.

  Why it exists: useModalStack wraps reka Dialog, which is dismissible by
  construction, so a blocking decision surface (end-of-run victory/defeat, a
  match summary) can't be expressed through the stack — games hand-rolled
  AlertDialog instead. This is that surface as a battery. The chrome (overlay,
  centred panel, title) lives here; the body, any stat list, and the action
  button fill the default slot and stay the game's.

  Reskin: the panel is PORTALED to <body>, so a consumer's `<style scoped>`
  :deep() does NOT reach these chrome hooks (unlike the inline compositions,
  which render in place). Pass `panel-class` and style it from an UNSCOPED rule,
  or set `max-width`. Slotted content keeps its own component scope and styles
  normally.

  Costume hooks (stable API) — for unscoped/global rules only; renames break:
    .olui-blocking-dialog__overlay
    .olui-blocking-dialog__panel   (+ your panel-class)
    .olui-blocking-dialog__title
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
} from 'reka-ui';

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    maxWidth?: string;
    panelClass?: HTMLAttributes['class'];
  }>(),
  { maxWidth: '480px' },
);

defineSlots<{
  title?: () => unknown;
  default?: () => unknown;
}>();
</script>

<template>
  <AlertDialogRoot :open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="olui-blocking-dialog__overlay" />
      <AlertDialogContent
        :class="['olui-blocking-dialog__panel', panelClass]"
        :style="{ maxWidth }"
        :aria-describedby="undefined"
      >
        <AlertDialogTitle class="olui-blocking-dialog__title">
          <slot name="title">
            {{ title }}
          </slot>
        </AlertDialogTitle>
        <slot />
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.olui-blocking-dialog__overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-backdrop);
  z-index: var(--modal-z-base);
}

.olui-blocking-dialog__panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  background: var(--modal-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--modal-radius);
  padding: var(--modal-padding);
  z-index: calc(var(--modal-z-base) + 1);
}

.olui-blocking-dialog__title {
  margin: 0;
  font-size: 1.5em;
  text-align: center;
}
</style>
