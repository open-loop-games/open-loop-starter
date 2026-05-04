import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { Persistent, Purchasable } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { UnitDef } from '../data/types';
import { UnitsKey, UnitsCooldownKey, TugDataKey, type Side } from '../modules';

export interface UnitRow {
  def: UnitDef;
  /** Underlying engine purchasable for the shop entry. */
  purchasable: Purchasable;
  /** True when the cost requirement is currently met. */
  canAfford: ComputedRef<boolean>;
  /** Seconds remaining on this archetype's send cooldown (0 when ready). */
  cooldownRemaining: ComputedRef<number>;
  /** True when both cost and cooldown gates clear. UI sends only when ready. */
  ready: ComputedRef<boolean>;
  /** Send one unit. Always safe to call; engine no-ops when not ready. */
  send(): void;
}

export interface UnitsView {
  side: Side;
  rows: ComputedRef<UnitRow[]>;
  /** Direct lookup by archetype id (used by panels that need a single row). */
  getRow(archetypeId: string): UnitRow | undefined;
}

/**
 * Per-side unit shop view. Wraps the engine's `PurchasableCategory` plus the
 * cooldown record exposed by `units.ts` so each card can render cost,
 * affordability, and cooldown progress without re-injecting separately.
 */
export function useUnits(side: Side): UnitsView {
  const shop = useModule(UnitsKey[side]);
  const cooldown = useModule(UnitsCooldownKey[side]);
  const data = useModule(TugDataKey);

  const rows = computed<UnitRow[]>(() => {
    const out: UnitRow[] = [];
    for (const def of data.units) {
      const purchasable = shop.getPurchasable(def.id);
      if (!purchasable) continue;
      const cdRef: Persistent<number> | undefined = cooldown[def.id];
      out.push(buildRow(def, purchasable, cdRef));
    }
    return out;
  });

  function getRow(archetypeId: string): UnitRow | undefined {
    return rows.value.find((r) => r.def.id === archetypeId);
  }

  return { side, rows, getRow };
}

function buildRow(
  def: UnitDef,
  purchasable: Purchasable,
  cdRef: Persistent<number> | undefined,
): UnitRow {
  const canAfford = computed(() => purchasable.canPurchase.value);
  const cooldownRemaining = computed(() => Math.max(0, cdRef?.value ?? 0));
  const ready = computed(() => canAfford.value && cooldownRemaining.value <= 0);
  return {
    def,
    purchasable,
    canAfford,
    cooldownRemaining,
    ready,
    send: () => {
      purchasable.purchase(1);
    },
  };
}
