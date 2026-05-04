import type { Tier } from '../data/types';

/**
 * Per-tier display data. Pure presentation config — labels and a small
 * carve-out list for entries that bespoke UI components render outside
 * the standard UpgradeGrid. The engine-side composition (resources,
 * categories, conversion, reset) flows through `ScalerTiersKey`; this
 * file does not reference any injection key.
 */
export interface TierDisplay {
  id: Tier;
  /** Title shown on the tier-header band and on the tab trigger. */
  title: string;
  /** Display label for the cumulative currency (e.g. 'Coins', 'Prestige Points'). */
  currencyDisplay: string;
  /** Optional shards display label, present on Prestige + Transcend. */
  shardsDisplay?: string;
  /**
   * Entries in the tier's upgrades category that are rendered by bespoke
   * UI components outside the standard UpgradeGrid. Transcend lists
   * 'acc-boost' here because `AccBoostRow.vue` renders it inline in the
   * #extras slot for the cross-currency price cue.
   */
  externalUpgradeIds?: string[];
}

export const ANTIMATTER_DISPLAY: TierDisplay = {
  id: 'antimatter',
  title: 'Antimatter',
  currencyDisplay: 'Coins',
};

export const PRESTIGE_DISPLAY: TierDisplay = {
  id: 'prestige',
  title: 'Prestige',
  currencyDisplay: 'Prestige Points',
  shardsDisplay: 'Prestige Shards',
};

export const TRANSCEND_DISPLAY: TierDisplay = {
  id: 'transcend',
  title: 'Transcendence',
  currencyDisplay: 'Transcend Points',
  shardsDisplay: 'Transcend Shards',
  externalUpgradeIds: ['acc-boost'],
};

export const TIER_DISPLAYS = {
  antimatter: ANTIMATTER_DISPLAY,
  prestige: PRESTIGE_DISPLAY,
  transcend: TRANSCEND_DISPLAY,
} as const;
