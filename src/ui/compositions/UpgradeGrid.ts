import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface UpgradeCellData<T = never> {
  id: string;
  name: string;
  description: string | (() => string);
  cost: Ref<DecimalSource>;
  costLabel: string;
  /** One-shot — non-parametric. Producers use the row-shape's parametric form. */
  canBuy: Ref<boolean>;
  owned: Ref<boolean>;
  level?: Ref<DecimalSource>;
  formula?: () => string;
  buy: () => void;
  position?: number;
  /**
   * Typed per-cell payload forwarded to the `#cell` / `#reveal-content` slots —
   * the extension seam (see `ProducerRowData.extra`). Parameterize the
   * component (`UpgradeGrid<MyCell>`) to type it; defaults to `never`.
   */
  extra?: T;
}
