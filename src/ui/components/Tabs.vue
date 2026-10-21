<!--
  Tabs — thin wrapper over reka-ui Tabs primitives. reka-ui owns keyboard
  navigation, roving tabindex, a11y (role=tablist, aria-selected), and
  horizontal/vertical orientation. This wrapper turns the pile of
  compound primitives into a single-prop API: pass an `items` array and
  each tab's content lives in a `#panel-<value>` named slot.

  Items can opt into a `disabled` flag; reka-ui handles the focus skip.
  Trigger labels accept either plain strings (via `label`) or a custom
  `#tab-<value>` slot when the tab head needs an icon or badge.

  Costume classes: olui-tabs, olui-tabs__list, olui-tabs__trigger,
  olui-tabs__trigger--active, olui-tabs__content. All colors, spacing,
  and borders come from `--tabs-*` tokens, set on the olui-tabs element
  or any ancestor.
-->
<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';

export interface TabItem {
  /** Unique id; used for the slot name (`#panel-<value>`) and DOM id. */
  value: string;
  /** Plain-text label shown on the tab head. Override with `#tab-<value>` slot. */
  label: string;
  /** Skip-focusable and unselectable when true. */
  disabled?: boolean;
}

defineProps<{
  items: TabItem[];
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <TabsRoot v-model="model" class="olui-tabs">
    <TabsList class="olui-tabs__list">
      <TabsTrigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        class="olui-tabs__trigger"
      >
        <slot :name="`tab-${item.value}`">
          {{ item.label }}
        </slot>
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="olui-tabs__content"
    >
      <slot :name="`panel-${item.value}`" />
    </TabsContent>
  </TabsRoot>
</template>

<style>
.olui-tabs {
  /* Read each token, never set it, so a value set on any ancestor reaches the widget. */
  --_tabs-list-gap: var(--tabs-list-gap, 0);
  --_tabs-trigger-padding: var(--tabs-trigger-padding, var(--gap-sm) var(--gap));
  --_tabs-trigger-color: var(--tabs-trigger-color, var(--color-text-muted));
  --_tabs-trigger-color-active: var(--tabs-trigger-color-active, var(--color-text));
  --_tabs-trigger-bg: var(--tabs-trigger-bg, transparent);
  --_tabs-trigger-bg-active: var(--tabs-trigger-bg-active, var(--color-surface));
  --_tabs-trigger-border: var(--tabs-trigger-border, var(--color-border));
  --_tabs-trigger-border-active: var(--tabs-trigger-border-active, var(--color-primary));
  --_tabs-trigger-radius: var(--tabs-trigger-radius, var(--radius-sm));

  display: flex;
  flex-direction: column;
  min-height: 0;
}
.olui-tabs__list {
  display: flex;
  gap: var(--_tabs-list-gap);
  border-bottom: 1px solid var(--_tabs-trigger-border);
  margin-bottom: var(--gap-sm);
}
.olui-tabs__trigger {
  padding: var(--_tabs-trigger-padding);
  background: var(--_tabs-trigger-bg);
  color: var(--_tabs-trigger-color);
  border: 1px solid transparent;
  border-bottom: none;
  border-top-left-radius: var(--_tabs-trigger-radius);
  border-top-right-radius: var(--_tabs-trigger-radius);
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  margin-bottom: -1px;
  transition:
    color 0.1s,
    background 0.1s;
}
.olui-tabs__trigger:hover:not([data-disabled]) {
  color: var(--_tabs-trigger-color-active);
}
.olui-tabs__trigger[data-state='active'] {
  color: var(--_tabs-trigger-color-active);
  background: var(--_tabs-trigger-bg-active);
  border-color: var(--_tabs-trigger-border);
  border-bottom-color: var(--_tabs-trigger-bg-active);
  font-weight: 600;
}
.olui-tabs__trigger[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.olui-tabs__content {
  flex: 1;
  min-height: 0;
  outline: none;
}
</style>
