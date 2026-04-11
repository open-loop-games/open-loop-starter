<script setup lang="ts">
import { inject } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from 'reka-ui';
import { modalStackKey, type ModalStackApi } from './useModalStack';

const props = defineProps<{
  stack?: ModalStackApi;
}>();

const injected = inject(modalStackKey, null);
const api = props.stack ?? injected;
if (!api) {
  throw new Error(
    '[olui] <ModalStack /> requires a ModalStackApi. Provide one via modalStackKey or the `stack` prop.',
  );
}

const handleUpdateOpen = (id: string, open: boolean) => {
  if (!open) api.remove(id);
};
</script>

<template>
  <DialogRoot
    v-for="entry in api.stack.value"
    :key="entry.id"
    :open="true"
    @update:open="(v: boolean) => handleUpdateOpen(entry.id, v)"
  >
    <DialogPortal>
      <DialogOverlay class="olui-modal-overlay" />
      <DialogContent class="olui-modal-content">
        <VisuallyHidden>
          <DialogTitle>Dialog</DialogTitle>
          <DialogDescription>Modal dialog</DialogDescription>
        </VisuallyHidden>
        <component
          :is="entry.component"
          v-bind="entry.props ?? {}"
        />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.olui-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-backdrop);
  z-index: var(--modal-z-base);
}

.olui-modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--modal-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--modal-radius);
  padding: var(--modal-padding);
  z-index: calc(var(--modal-z-base) + 1);
  max-width: min(90vw, 600px);
  max-height: 90vh;
  overflow: auto;
}
</style>
