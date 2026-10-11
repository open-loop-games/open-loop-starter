import { computed, type ComputedRef } from 'vue';
import type { UpgradeCellData } from '@/ui/compositions';
import type { RefinementDef } from '../data/types';
import { getRefinements } from '../modules';

/**
 * Refinements, split into the two states the UI treats differently.
 *
 * The grid only ever holds what is still a decision. Installed refinements
 * leave it entirely and collapse into a single register line — 24 cards would
 * otherwise become a wall of "Bought" by hour four, and the one cell that
 * still needs reading would be buried in it.
 *
 * `UpgradeGrid`'s own `purchasedState: 'removed'` filters owned cells out of
 * the grid, but it has nowhere to put them; the register is this archetype's
 * answer to where they go, so the split happens here and the grid is handed
 * only `open`.
 */
export interface RefinementCellExtra {
  def: RefinementDef;
}

export type RefinementCell = UpgradeCellData<RefinementCellExtra>;

export interface RefinementsView {
  /** Unowned and visible — the cells that still ask a question. */
  open: ComputedRef<RefinementCell[]>;
  /** Owned, in purchase order. Rendered as one compressed strip. */
  installed: ComputedRef<RefinementDef[]>;
  installedCount: ComputedRef<number>;
  total: ComputedRef<number>;
}

export function useRefinementCells(): RefinementsView {
  const refinements = getRefinements();
  const entries = computed(() => refinements.getAll());

  const open = computed<RefinementCell[]>(() =>
    entries.value
      .filter((entry) => entry.purchasable.visible.value && !entry.purchasable.active.value)
      .map((entry) => ({
        id: entry.def.id,
        displayName: entry.def.name,
        description: entry.def.description,
        cost: computed(() => entry.def.cost),
        costLabel: 'mass',
        canBuy: entry.purchasable.canPurchase,
        owned: entry.purchasable.active,
        buy: () => {
          entry.purchasable.purchase(1);
        },
        extra: { def: entry.def },
      })),
  );

  const installed = computed(() =>
    entries.value.filter((entry) => entry.purchasable.active.value).map((entry) => entry.def),
  );

  return {
    open,
    installed,
    installedCount: computed(() => installed.value.length),
    total: computed(() => entries.value.length),
  };
}
