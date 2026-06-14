/**
 * Per-zone color palette for action-row tints.
 *
 * Game-side presentation only — not part of engine ZoneDef to keep the engine
 * free of content/visual concerns. Used by NextActionList.vue to paint edit-list
 * rows with their zone tint, and to blend two zones on travel rows.
 *
 * Reference: idle-loops-ng/src/data/zone-colors.ts. Hex values from
 * idle-loops-omsi stylesheet.css (.actionList, .actionListNext row
 * backgrounds).
 */

export interface ZoneColor {
  /** Solid accent (borders, icons, emphasis) */
  base: string;
  /** Rgba-0.35 tint for row backgrounds */
  tint: string;
}

export const zoneColors: Record<string, ZoneColor> = {
  beginnersville: { base: '#c2e6cc', tint: 'rgba(194, 230, 204, 0.35)' },
  'forest-path': { base: '#cdded2', tint: 'rgba(205, 222, 210, 0.35)' },
};

const FALLBACK: ZoneColor = { base: '#cccccc', tint: 'rgba(204, 204, 204, 0.25)' };

export function getZoneColor(id: string | undefined): ZoneColor {
  if (!id) return FALLBACK;
  return zoneColors[id] ?? FALLBACK;
}
