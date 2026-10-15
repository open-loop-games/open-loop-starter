<script setup lang="ts">
/**
 * Button — the canonical starter button. Wraps Reka's `Primitive` so it's
 * polymorphic (`as="a"`, `asChild`) and a11y-compliant, with `v-hold-repeat`
 * for clicker-game press-and-hold.
 *
 * Consumers use standard Vue idioms:
 *   <Button @click="doThing()" :disabled="!canDo">Open</Button>
 *   <Button repeat @click="buy()">Buy</Button>
 *
 * A press fires once. `repeat` makes a held press fire again at an interval
 * after a short delay: for a repeatable purchase or a stepper. `click` carries
 * the press, so `e.shiftKey` reads at the click. `disabled` suppresses the
 * emit in-component (the directive still runs, but the handler short-circuits).
 */
import { computed } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { vHoldRepeat } from '@/directives';

interface Props extends /* @vue-ignore */ PrimitiveProps {
  as?: PrimitiveProps['as'];
  asChild?: boolean;
  disabled?: boolean;
  /** A held press repeats the click. */
  repeat?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  asChild: false,
  disabled: false,
  repeat: false,
});

const emit = defineEmits<{ click: [event: PointerEvent | KeyboardEvent] }>();

/** The directive argument: `once` stops a held press from repeating. */
const mode = computed(() => (props.repeat ? undefined : 'once'));

function handle(e: PointerEvent | KeyboardEvent): void {
  if (props.disabled) return;
  emit('click', e);
}
</script>

<template>
  <Primitive v-hold-repeat:[mode]="handle" :as="as" :as-child="asChild" :disabled="disabled">
    <slot />
  </Primitive>
</template>
