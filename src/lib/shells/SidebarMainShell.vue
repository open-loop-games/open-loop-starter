<!--
  SidebarMainShell — two-column layout with sidebar on the left and main
  content on the right. The `sidebarResources` slot exists because many
  corpus games collapse the persistent resource readout into the sidebar
  rather than a top bar (Kittens Game, Progress Knight, etc.) — not optional.

  Covers ~33% of the 42-game layout corpus; the most common shape.

  Responsive collapse: when `collapsible` is true, the shell sets
  `data-collapsed` via CSS media query below 720px. No JS toggle —
  consumers who want a manual toggle wrap the shell themselves.

  Shell API conventions — see SingleColumnShell.vue.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    sidebarWidth?: string;
    collapsible?: boolean;
  }>(),
  { sidebarWidth: '240px', collapsible: false },
);
</script>

<template>
  <div
    class="olui-sidebar-main"
    :class="{ 'olui-sidebar-main--collapsible': collapsible }"
    :style="{ '--sidebar-main-width': sidebarWidth }"
  >
    <aside class="olui-sidebar-main__sidebar">
      <slot name="sidebarResources" />
      <slot name="sidebar" />
    </aside>
    <section class="olui-sidebar-main__main">
      <slot />
    </section>
  </div>
</template>

<style>
.olui-sidebar-main {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: var(--sidebar-main-width, 240px) 1fr;
  gap: var(--gap);
  padding: var(--gap);
  min-height: 0;
  width: 100%;
}

.olui-sidebar-main__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap);
  overflow: auto;
  min-height: 0;
}

.olui-sidebar-main__main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap);
  overflow: auto;
  min-height: 0;
}

@media (max-width: 720px) {
  .olui-sidebar-main--collapsible {
    grid-template-columns: 1fr;
  }
  .olui-sidebar-main--collapsible[data-collapsed='true'] .olui-sidebar-main__sidebar {
    display: none;
  }
}
</style>
