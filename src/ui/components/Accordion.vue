<!--
  Accordion — thin wrapper over reka-ui Accordion primitives. reka-ui owns
  expand/collapse animation hooks, keyboard navigation (Up/Down/Home/End),
  and a11y (role=region, aria-labelledby, aria-expanded). This wrapper
  turns the pile of compound primitives into a single-prop API: pass an
  `items` array, and each item's content lives in a `#panel-<value>`
  named slot.

  Single vs multi expansion via the `type` prop ('single' | 'multiple').
  Single + collapsible (default) lets the player close every section;
  multiple lets several stay open at once — useful for the modifier-chain
  readout where the player wants to see all factor groups simultaneously.

  Class hooks: olui-accordion, olui-accordion__item, olui-accordion__trigger,
  olui-accordion__trigger[data-state='open'], olui-accordion__content.
  All colors, spacing, and the chevron come from CSS custom properties
  rooted on the olui-accordion class — forks override via `--accordion-*`
  tokens.
-->
<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui';

export interface AccordionItemDef {
  /** Unique key; used for the slot name (`#panel-<value>`) and DOM id. */
  value: string;
  /** Plain-text label shown on the trigger. Override with `#trigger-<value>` slot. */
  label: string;
  /** Skip-focusable and unselectable when true. */
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    items: AccordionItemDef[];
    /** 'single' allows one panel open at a time; 'multiple' allows many. */
    type?: 'single' | 'multiple';
    /** Single-mode only: whether the open panel can be closed. */
    collapsible?: boolean;
  }>(),
  { type: 'single', collapsible: true },
);

const model = defineModel<string | string[]>();
</script>

<template>
  <AccordionRoot
    v-model="model"
    :type="type as 'single'"
    :collapsible="collapsible"
    class="olui-accordion"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      :disabled="item.disabled"
      class="olui-accordion__item"
    >
      <AccordionHeader class="olui-accordion__header">
        <AccordionTrigger class="olui-accordion__trigger">
          <slot :name="`trigger-${item.value}`">
            <span class="olui-accordion__label">{{ item.label }}</span>
          </slot>
          <span
            class="olui-accordion__chevron"
            aria-hidden="true"
          >▾</span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="olui-accordion__content">
        <slot :name="`panel-${item.value}`" />
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>

<style>
.olui-accordion {
  --accordion-item-gap: 0;
  --accordion-trigger-padding: var(--gap-sm) var(--gap);
  --accordion-trigger-color: var(--color-text);
  --accordion-trigger-color-active: var(--color-text);
  --accordion-trigger-bg: transparent;
  --accordion-trigger-bg-active: var(--color-surface);
  --accordion-trigger-bg-hover: var(--color-surface);
  --accordion-border: var(--color-border);
  --accordion-content-padding: var(--gap-sm) var(--gap);
  --accordion-radius: var(--radius-sm);
  --accordion-chevron-size: 0.85em;

  display: flex;
  flex-direction: column;
  gap: var(--accordion-item-gap);
  border: 1px solid var(--accordion-border);
  border-radius: var(--accordion-radius);
  overflow: hidden;
}
.olui-accordion__item {
  display: flex;
  flex-direction: column;
}
.olui-accordion__item + .olui-accordion__item {
  border-top: 1px solid var(--accordion-border);
}
.olui-accordion__header {
  margin: 0;
}
.olui-accordion__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--accordion-trigger-padding);
  background: var(--accordion-trigger-bg);
  color: var(--accordion-trigger-color);
  border: none;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 500;
  text-align: left;
  transition:
    background 0.1s,
    color 0.1s;
}
.olui-accordion__trigger:hover:not([data-disabled]) {
  background: var(--accordion-trigger-bg-hover);
}
.olui-accordion__trigger[data-state='open'] {
  background: var(--accordion-trigger-bg-active);
  color: var(--accordion-trigger-color-active);
  font-weight: 600;
}
.olui-accordion__trigger[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.olui-accordion__label {
  flex: 1;
  min-width: 0;
}
.olui-accordion__chevron {
  display: inline-block;
  margin-left: var(--gap-sm);
  font-size: var(--accordion-chevron-size);
  transition: transform 0.15s ease-out;
}
.olui-accordion__trigger[data-state='open'] .olui-accordion__chevron {
  transform: rotate(180deg);
}
.olui-accordion__content {
  padding: var(--accordion-content-padding);
  background: var(--accordion-trigger-bg-active);
  font-size: 0.92em;
}
.olui-accordion__content[data-state='closed'] {
  display: none;
}
</style>
