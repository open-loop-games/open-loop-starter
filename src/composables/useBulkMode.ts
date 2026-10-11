import { computed, type WritableComputedRef } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import { useModule } from './useModule';
import { UIPrefsKey } from '@/modules/ui-prefs';

export type BulkMode = number | 'max';

export interface BulkModeApi {
  /** Current mode — writable ref, two-way-bindable from a segmented control. */
  mode: WritableComputedRef<BulkMode>;
  setMode: (next: BulkMode) => void;
  /**
   * Resolve the actual purchase count given how many are affordable:
   * - `max` → the full affordable count.
   * - numeric N → `min(N, affordable)` (AD-style "up to N" fallback, so
   *   the button stays live when the player can only afford part of the tier).
   */
  resolveCount: (maxAffordable: DecimalSource) => DecimalSource;
}

export function useBulkMode(): BulkModeApi {
  const { bulkMode } = useModule(UIPrefsKey);

  const mode = computed<BulkMode>({
    get: () => parse(bulkMode.value),
    set: (next) => {
      bulkMode.value = serialize(next);
    },
  });

  return {
    mode,
    setMode: (next) => {
      mode.value = next;
    },
    resolveCount: (maxAffordable) => {
      const mx = Decimal.fromValue(maxAffordable);
      if (mode.value === 'max') return mx;
      return Decimal.gte(mx, mode.value) ? mode.value : mx;
    },
  };
}

function parse(raw: string): BulkMode {
  if (raw === 'max') return 'max';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function serialize(mode: BulkMode): string {
  return mode === 'max' ? 'max' : String(mode);
}
