<!--
  PanelLayout — titled panel chrome: header (title + close), scrollable
  body, optional footer. Purely structural; no overlay. Fits inside a
  modal or anywhere else a titled panel is wanted.

  Class hooks: olui-panel, olui-panel__header, olui-panel__title,
  olui-panel__close, olui-panel__body, olui-panel__footer.
  Custom props: --panel-gap, --panel-padding,
  --panel-header-border, --panel-max-height.

  Close emits `close`; parent owns the semantics. Esc is handled one
  layer up by reka-ui Dialog — don't reimplement here.
-->
<script setup lang="ts">
import { computed, useSlots } from 'vue';

withDefaults(
  defineProps<{
    title?: string;
    closable?: boolean;
  }>(),
  { closable: true },
);

defineEmits<{ close: [] }>();

const slots = useSlots();
const hasFooter = computed(() => !!slots.footer);
</script>

<template>
  <div class="olui-panel">
    <header
      v-if="title || $slots.header || closable"
      class="olui-panel__header"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="olui-panel__title"
        >
          {{ title }}
        </h3>
      </slot>
      <button
        v-if="closable"
        type="button"
        class="olui-panel__close"
        aria-label="Close"
        @click="$emit('close')"
      >
        ×
      </button>
    </header>
    <div class="olui-panel__body">
      <slot />
    </div>
    <footer
      v-if="hasFooter"
      class="olui-panel__footer"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>

<style>
.olui-panel {
  --panel-gap: var(--gap);
  --panel-padding: var(--gap-lg);
  --panel-header-border: 1px solid var(--color-border);
  --panel-max-height: 80vh;

  display: flex;
  flex-direction: column;
  max-height: var(--panel-max-height);
  min-height: 0;
}

.olui-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--panel-gap);
  padding: var(--panel-padding);
  border-bottom: var(--panel-header-border);
  flex: 0 0 auto;
}

.olui-panel__title {
  margin: 0;
  font-size: 1.1em;
}

.olui-panel__close {
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 1.25em;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.olui-panel__close:hover,
.olui-panel__close:focus-visible {
  background: var(--color-surface-hover);
}

.olui-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--panel-padding);
}

.olui-panel__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--panel-gap);
  padding: var(--panel-padding);
  border-top: var(--panel-header-border);
}
</style>
