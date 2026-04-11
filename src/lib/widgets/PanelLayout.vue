<!--
  PanelLayout — titled panel chrome with optional footer + scrollable body.

  NOT a modal wrapper. ModalStack (Phase 1) owns the overlay + dialog
  surface; PanelLayout fits INSIDE a modal — or anywhere else — as the
  reusable "titled panel with a close affordance" primitive.

  Lifted from the cross-consumer signal that every idle-loops-ng panel,
  spell-compiler panel, incloneution modal, and starter panel rebuilds:
  header row (title + close button), scrollable body, optional footer
  row for confirm/cancel. idle-loops-ng and spell-compiler ship identical
  58-LOC BaseModal.vue files; incloneution hand-rolls nine of them with
  no shared base (~1881 LOC).

  Widget API conventions (Phase 2, locked by OL-274 — copy this block
  verbatim into every subsequent widget's file header):

    1. Class hooks (structure) — BEM `olui-{widget}__{element}`. Ship the
       minimum. A hook earns its place only if consumers would select it
       from a stylesheet, OR tests need it for structural assertions.
       Expect 3–6 per widget, never 15. Every shipped class is part of
       the semver contract — breaking one is a major bump.

    2. Data-state attributes (reactive state) — `data-state="X"` on
       elements whose state mutates. Mirrors reka-ui's `data-state='open'`
       convention. Consumers target `[data-state='X']` in CSS. Prefer
       data-attrs over modifier classes so templates set a single
       attribute binding rather than managing class strings.

    3. Custom properties (per-instance knobs) — `--olui-{widget}-*`
       scoped to component root, 3–5 per widget max. Defaults fall back
       to Phase 1 tokens so redeclaring a token re-themes the widget
       without touching selectors. Consumers override per-instance by
       redeclaring the `--olui-{widget}-*` variable on any ancestor.

    4. No behavior props, no game logic. The widget owns visual-only
       behaviors (fill transitions, state animations, focus via reka-ui).
       Consumers own semantics — what the value means, when it hits
       zero, what "depleted" means. Props are presentational.

  PanelLayout specifics:

    Class hooks:
      - olui-panel           — root (flex column)
      - olui-panel__header   — header row; present iff title, header
                               slot, or closable
      - olui-panel__title    — default title element (h3); replaced when
                               header slot is provided
      - olui-panel__close    — close button; present iff closable
      - olui-panel__body     — flex-1 scrollable body
      - olui-panel__footer   — footer row; present iff footer slot has
                               content

    Data-state: none. PanelLayout is purely structural.

    Custom properties:
      - --olui-panel-gap            (default var(--gap))
      - --olui-panel-padding        (default var(--gap-lg))
      - --olui-panel-header-border  (default 1px solid var(--color-border))
      - --olui-panel-max-height     (default 80vh)

    Scrolling: root is display:flex column with max-height set, body is
    flex:1 min-height:0 overflow-y:auto. This lifts the pattern all three
    consumers rebuild — fixed-max panel with scrollable body between
    sticky header and footer.

    Close: clicking the X emits `close`. Parent owns what that means
    (typically ModalStack.remove(id)). Esc is NOT handled here — reka-ui
    Dialog (via Phase 1's ModalStack) already handles Esc at the modal
    layer. Don't reimplement.
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
  --olui-panel-gap: var(--gap);
  --olui-panel-padding: var(--gap-lg);
  --olui-panel-header-border: 1px solid var(--color-border);
  --olui-panel-max-height: 80vh;

  display: flex;
  flex-direction: column;
  max-height: var(--olui-panel-max-height);
  min-height: 0;
}

.olui-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--olui-panel-gap);
  padding: var(--olui-panel-padding);
  border-bottom: var(--olui-panel-header-border);
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
  padding: var(--olui-panel-padding);
}

.olui-panel__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--olui-panel-gap);
  padding: var(--olui-panel-padding);
  border-top: var(--olui-panel-header-border);
}
</style>
