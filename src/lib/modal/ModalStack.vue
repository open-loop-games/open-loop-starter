<script setup lang="ts">
import { inject } from 'vue';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent } from 'reka-ui';
import { modalStackKey, type ModalStackApi } from './useModalStack';

// Consuming modals must render their own <DialogTitle as-child><h*>…</h*></DialogTitle>
// for screen-reader labelling. aria-describedby is opted out (undefined) so reka-ui
// does not require a DialogDescription.

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
      <DialogContent
        :class="['olui-modal-content', `olui-modal-content--${entry.size ?? 'md'}`]"
        :aria-describedby="undefined"
      >
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
  width: min(90vw, var(--modal-content-max-md));
  max-height: 90vh;
  overflow: auto;
}

.olui-modal-content--sm {
  width: min(90vw, var(--modal-content-max-sm));
}
.olui-modal-content--md {
  width: min(90vw, var(--modal-content-max-md));
}
.olui-modal-content--lg {
  width: min(90vw, var(--modal-content-max-lg));
}
.olui-modal-content--xl {
  width: min(90vw, var(--modal-content-max-xl));
}
</style>
