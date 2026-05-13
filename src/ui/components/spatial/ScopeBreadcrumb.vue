<script setup lang="ts" generic="N, E">
import { computed } from 'vue';
import type { GraphNode, ScopeStack, ScopeState } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { useScopeStack } from '@/composables/useScopeStack';

interface Props {
  stack: ScopeStack<N, E>;
  variant?: 'compact' | 'expanded';
  rootLabel?: string;
  showBackButton?: boolean;
  enableEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'expanded',
  rootLabel: undefined,
  showBackButton: true,
  enableEscape: true,
});

defineSlots<{
  root?(props: { label: string }): unknown;
  crumb?(props: {
    node: GraphNode<N>;
    depth: number;
    isCurrent: boolean;
    state: ScopeState | undefined;
  }): unknown;
  separator?(): unknown;
  'back-button'?(props: { depth: number }): unknown;
}>();

const view = useScopeStack(props.stack);

interface Crumb {
  node: GraphNode<N>;
  depth: number;
  isCurrent: boolean;
  path: readonly string[];
  key: string;
}

const crumbs = computed<Crumb[]>(() => {
  const trail = view.breadcrumb.value;
  return trail.map((node, i) => {
    const path = trail.slice(0, i + 1).map((n) => n.id);
    return {
      node,
      depth: i + 1,
      isCurrent: i === trail.length - 1,
      path,
      key: path.join('/'),
    };
  });
});

function goTo(targetDepth: number): void {
  if (targetDepth <= 0) {
    props.stack.exitToRoot();
    return;
  }
  while (props.stack.depth > targetDepth) {
    props.stack.exit();
  }
}

function onEscape(event: KeyboardEvent): void {
  if (!props.enableEscape) return;
  if (props.stack.depth === 0) return;
  event.preventDefault();
  props.stack.exit();
}

function stateFor(path: readonly string[]): ScopeState | undefined {
  return view.stateAt(path).value;
}
</script>

<template>
  <nav
    :class="['scope-breadcrumb', `scope-breadcrumb--${variant}`]"
    :tabindex="-1"
    aria-label="Scope navigation"
    @keydown.escape="onEscape"
  >
    <slot
      v-if="showBackButton && view.depth.value > 0"
      name="back-button"
      :depth="view.depth.value"
    >
      <Button
        type="button"
        class="scope-breadcrumb__back"
        aria-label="Go back one level"
        @click="goTo(view.depth.value - 1)"
      >
        ← Back
      </Button>
    </slot>

    <ol
      v-if="view.depth.value > 0"
      class="scope-breadcrumb__trail"
    >
      <li
        v-if="rootLabel"
        class="scope-breadcrumb__item"
        data-crumb-depth="0"
      >
        <slot
          name="root"
          :label="rootLabel"
        >
          <Button
            type="button"
            class="scope-breadcrumb__crumb"
            @click="goTo(0)"
          >
            {{ rootLabel }}
          </Button>
        </slot>
        <slot name="separator">
          <span
            class="scope-breadcrumb__sep"
            aria-hidden="true"
          >›</span>
        </slot>
      </li>
      <li
        v-for="c in crumbs"
        :key="c.key"
        class="scope-breadcrumb__item"
        :data-crumb-depth="c.depth"
        :data-crumb-current="c.isCurrent ? 'true' : undefined"
      >
        <slot
          name="crumb"
          :node="c.node"
          :depth="c.depth"
          :is-current="c.isCurrent"
          :state="stateFor(c.path)"
        >
          <Button
            type="button"
            :class="[
              'scope-breadcrumb__crumb',
              { 'scope-breadcrumb__crumb--current': c.isCurrent },
            ]"
            :disabled="c.isCurrent"
            @click="goTo(c.depth)"
          >
            {{ c.node.id }}
          </Button>
        </slot>
        <slot
          v-if="!c.isCurrent"
          name="separator"
        >
          <span
            class="scope-breadcrumb__sep"
            aria-hidden="true"
          >›</span>
        </slot>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.scope-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--scope-breadcrumb-gap, var(--gap-sm));
  padding: var(--scope-breadcrumb-padding, 0);
  background: var(--scope-breadcrumb-bg, transparent);
  border-radius: var(--scope-breadcrumb-radius, var(--radius-sm));
  outline: none;
}

.scope-breadcrumb__trail {
  display: flex;
  align-items: center;
  gap: var(--scope-breadcrumb-gap, var(--gap-sm));
  list-style: none;
  margin: 0;
  padding: 0;
}

.scope-breadcrumb__item {
  display: flex;
  align-items: center;
  gap: var(--scope-breadcrumb-gap, var(--gap-sm));
}

.scope-breadcrumb__crumb {
  background: none;
  border: 0;
  padding: 0;
  color: var(--scope-breadcrumb-crumb-color, var(--color-text-muted));
  font: inherit;
  font-weight: var(--scope-breadcrumb-crumb-weight, 500);
  cursor: pointer;
}

.scope-breadcrumb__crumb:hover:not(:disabled) {
  color: var(--scope-breadcrumb-crumb-hover-color, var(--color-text));
}

.scope-breadcrumb__crumb--current,
.scope-breadcrumb__crumb:disabled {
  color: var(--scope-breadcrumb-crumb-current-color, var(--color-text));
  cursor: default;
}

.scope-breadcrumb__sep {
  color: var(--scope-breadcrumb-separator-color, var(--color-border));
}

.scope-breadcrumb__back {
  background: none;
  border: 0;
  padding: 0;
  color: var(--scope-breadcrumb-back-button-color, var(--color-text-muted));
  font: inherit;
  cursor: pointer;
}

.scope-breadcrumb__back:hover {
  color: var(--scope-breadcrumb-back-button-hover-color, var(--color-text));
}

.scope-breadcrumb--compact .scope-breadcrumb__item:not([data-crumb-current='true']) {
  display: none;
}
</style>
