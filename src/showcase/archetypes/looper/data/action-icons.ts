/**
 * Icon registry for actions. Lookup via nullish-coalescing chain — no icon
 * field on ActionDef. Keeps content data files uncluttered and lets the
 * registry grow independently.
 *
 * Icon strings are Iconify set-prefix:icon-name, resolved at runtime by
 * `@iconify/vue`. Primary set is `game-icons` for action tiles, `mdi` for
 * UI chrome.
 *
 * Reference: idle-loops-ng/src/data/action-icons.ts.
 */

/** Per-action icon overrides. Key = ActionDef.id. */
export const actionIcons: Record<string, string> = {
  // Beginnersville
  wander: 'game-icons:walking-boot',
  'smash-pots': 'game-icons:broken-pottery',
  'pick-locks': 'game-icons:lockpicks',
  'buy-mana': 'game-icons:magic-swirl',
  'meet-people': 'game-icons:conversation',

  // Forest Path
  'explore-forest': 'game-icons:forest',
  'wild-mana': 'game-icons:magic-swirl',
  'gather-herbs': 'game-icons:herbs-bundle',
  'old-shortcut': 'game-icons:mountain-road',
};

/** Fallback icon per zone when no per-action override exists. */
export const zoneFallbackIcons: Record<string, string> = {
  beginnersville: 'game-icons:village',
  'forest-path': 'game-icons:forest',
};

const GENERIC_FALLBACK = 'game-icons:scroll-unfurled';

/** Resolve the icon for a given action id + zone. */
export function getActionIcon(actionId: string, zoneId: string | undefined): string {
  return (
    actionIcons[actionId] ?? (zoneId ? zoneFallbackIcons[zoneId] : undefined) ?? GENERIC_FALLBACK
  );
}
