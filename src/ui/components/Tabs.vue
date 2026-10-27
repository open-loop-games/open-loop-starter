<!--
  Tabs — thin wrapper over reka-ui Tabs primitives. reka-ui owns keyboard
  navigation, roving tabindex, a11y (role=tablist, aria-selected), and
  horizontal/vertical orientation. This wrapper turns the pile of
  compound primitives into a single-prop API: pass an `items` array and
  each tab's content lives in a `#panel-<value>` named slot.

  Items can opt into a `disabled` flag; reka-ui handles the focus skip.
  Trigger labels accept either plain strings (via `label`) or a custom
  `#tab-<value>` slot when the tab head needs an icon or badge.

  The reveal grammar is built in. An item with `visible: false` stays out
  until the game unlocks it. A tab revealed after mount, or whose `notify`
  turns true while another tab is selected, carries an unread dot until the
  player selects it. `orientation="vertical"` stacks the list beside the
  panels.

  Costume classes: olui-tabs, olui-tabs__list, olui-tabs__trigger,
  olui-tabs__unread, olui-tabs__content. Attributes: data-orientation on the
  root and each trigger; data-state='active' and data-unread on a trigger.
  All colors, spacing and borders come from `--tabs-*` tokens, set on the
  olui-tabs element or any ancestor.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';

export interface TabItem {
  /** Unique id; used for the slot name (`#panel-<value>`) and DOM id. */
  value: string;
  /** Plain-text label shown on the tab head. Override with `#tab-<value>` slot. */
  label: string;
  /** Skip-focusable and unselectable when true. */
  disabled?: boolean;
  /** False keeps the tab and its panel out until the game unlocks them. Default true. */
  visible?: boolean;
  /** Each time this turns true while the tab is not selected, the tab is marked unread. */
  notify?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: TabItem[];
    orientation?: 'horizontal' | 'vertical';
  }>(),
  { orientation: 'horizontal' },
);

const model = defineModel<string>({ required: true });

const shown = computed(() => props.items.filter((item) => item.visible !== false));

// A tab is unread from a reveal or a notify until the player selects it. Tabs visible when
// the component mounts start read: a loaded save opens on a settled board.
const unread = ref(new Set<string>());
function markNew(now: string[], before: string[]): void {
  const added = now.filter((value) => !before.includes(value) && value !== model.value);
  if (added.length) unread.value = new Set([...unread.value, ...added]);
}
watch(() => shown.value.map((item) => item.value), markNew);
watch(() => shown.value.filter((item) => item.notify).map((item) => item.value), markNew);
watch(model, (value) => {
  if (!unread.value.has(value)) return;
  const next = new Set(unread.value);
  next.delete(value);
  unread.value = next;
});
</script>

<template>
  <TabsRoot v-model="model" :orientation="orientation" class="olui-tabs">
    <TabsList class="olui-tabs__list">
      <TabsTrigger
        v-for="item in shown"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        class="olui-tabs__trigger"
        :data-unread="unread.has(item.value) || undefined"
        :aria-description="unread.has(item.value) ? 'unread' : undefined"
      >
        <slot :name="`tab-${item.value}`">
          {{ item.label }}
        </slot>
        <span v-if="unread.has(item.value)" class="olui-tabs__unread" aria-hidden="true" />
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="item in shown"
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
  --_tabs-unread-color: var(--tabs-unread-color, var(--color-primary));

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
/* State selectors sit in :where(), so every trigger rule is one class deep and a game's
   costume rule wins, and the vertical rules below override these by order. */
.olui-tabs__trigger:where([data-state='active']) {
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
.olui-tabs__unread {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--_tabs-unread-color);
  vertical-align: middle;
}

/* Vertical: the list stands beside the panels, and the active tab opens to the right.
   The list rule is a child chain from its own root, so nested tabs keep their own layout. */
.olui-tabs:where([data-orientation='vertical']) {
  flex-direction: row;
}
:where(.olui-tabs[data-orientation='vertical']) > .olui-tabs__list {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid var(--_tabs-trigger-border);
  margin-bottom: 0;
  margin-right: var(--gap-sm);
}
.olui-tabs__trigger:where([data-orientation='vertical']) {
  text-align: left;
  border: 1px solid transparent;
  border-right: none;
  border-radius: var(--_tabs-trigger-radius) 0 0 var(--_tabs-trigger-radius);
  margin-bottom: 0;
  margin-right: -1px;
}
.olui-tabs__trigger:where([data-orientation='vertical'][data-state='active']) {
  border-color: var(--_tabs-trigger-border);
  border-right-color: var(--_tabs-trigger-bg-active);
}
.olui-tabs__content {
  flex: 1;
  min-height: 0;
  outline: none;
}
</style>
