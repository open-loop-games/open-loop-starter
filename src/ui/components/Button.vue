<script setup lang="ts">
/**
 * Button — the canonical starter button. Wraps Reka's `Primitive` so it's
 * polymorphic (`as="a"`, `asChild`) and a11y-compliant, while baking in
 * `v-hold-repeat` for clicker-game press-and-hold semantics.
 *
 * Consumers use standard Vue idioms:
 *   <Button @click="doThing()" :disabled="!canDo">Buy</Button>
 *
 * Hold-repeat fires once on press, then at interval after a short delay.
 * `disabled` suppresses the emit in-component (the directive still runs,
 * but the handler short-circuits).
 */
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { vHoldRepeat } from '@/directives';

interface Props extends /* @vue-ignore */ PrimitiveProps {
  as?: PrimitiveProps['as'];
  asChild?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  asChild: false,
  disabled: false,
});

const emit = defineEmits<{ click: [] }>();

function handle(): void {
  if (props.disabled) return;
  emit('click');
}
</script>

<template>
  <Primitive v-hold-repeat="handle" :as="as" :as-child="asChild" :disabled="disabled">
    <slot />
  </Primitive>
</template>
