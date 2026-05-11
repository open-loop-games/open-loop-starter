import { ref, watch, type Ref } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';

/**
 * Latches `true` the first time `source` strictly exceeds `threshold` and
 * stays true thereafter. Canonicalises the one-way unlock-gate boilerplate
 * (`computed(() => Decimal.gt(monotone?.value ?? 0, 0))`) into an explicit
 * latch — handles non-monotone sources too, where a `computed` would flip
 * back to false after a spend.
 */
export function useLatchOnce(
  source: Ref<DecimalSource | undefined> | (() => DecimalSource | undefined),
  threshold: DecimalSource = 0,
): Ref<boolean> {
  const latched = ref(false);
  const read = typeof source === 'function' ? source : () => source.value;
  watch(
    read,
    (v) => {
      if (!latched.value && Decimal.gt(v ?? 0, threshold)) latched.value = true;
    },
    { immediate: true },
  );
  return latched;
}
