import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export interface UpgradeCellData {
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
   * Opaque per-cell data forwarded to `#cell` / `#reveal-content` slots.
   * Lets archetypes attach rich state without a side-channel lookup.
   */
  extra?: unknown;
}
