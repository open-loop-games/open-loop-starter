<!--
  TabsBarShell — horizontal twin of SidebarMainShell. Resources + tabs pinned
  to top or bottom; main content fills the rest.

  Covers ~21% of the 42-game layout corpus. Horizontal counterpart to
  SidebarMain; `navPosition: 'bottom'` covers mobile-first layouts
  (e.g. `fundamental`) without a separate shell.

  Shell API conventions — see SingleColumnShell.vue.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    navPosition?: 'top' | 'bottom';
  }>(),
  { navPosition: 'top' },
);
</script>

<template>
  <div
    class="olui-tabs-bar"
    :data-nav-position="navPosition"
  >
    <nav class="olui-tabs-bar__nav">
      <div
        v-if="$slots.resources"
        class="olui-tabs-bar__resources"
      >
        <slot name="resources" />
      </div>
      <div
        v-if="$slots.tabs"
        class="olui-tabs-bar__tabs"
      >
        <slot name="tabs" />
      </div>
    </nav>
    <section class="olui-tabs-bar__main">
      <slot />
    </section>
  </div>
</template>

<style>
.olui-tabs-bar {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.olui-tabs-bar[data-nav-position='bottom'] {
  flex-direction: column-reverse;
}

.olui-tabs-bar__nav {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.olui-tabs-bar[data-nav-position='bottom'] .olui-tabs-bar__nav {
  border-bottom: none;
  border-top: 1px solid var(--color-border);
}

.olui-tabs-bar__tabs {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}

.olui-tabs-bar__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
  min-height: 0;
  overflow: auto;
}
</style>
