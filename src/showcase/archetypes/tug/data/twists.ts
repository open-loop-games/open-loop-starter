// ─── Skeleton ───
// One twist a battle, drawn in camp before the horn: the weather, the calendar or the camp.
// Every twist acts on both keeps alike, so it moves which host is right, never which side
// is favoured. A lord does not read it; Fairhold sees it in camp.

export interface TwistDef {
  id: string;
  name: string;
  blurb: string;
  /** Bowmen's damage multiplier. */
  bowDamage?: number;
  /** Bowmen's reach multiplier. */
  bowReach?: number;
  /** Knights cannot see past their reach, so they do not charge. */
  noCharge?: boolean;
  /** Every ford is twice as wide; with no ford, the middle floods. */
  flood?: boolean;
  /** Both harvests' multiplier. */
  income?: number;
  /** Both musters' multiplier. */
  muster?: number;
  /** Both gates' hp multiplier. */
  gate?: number;
}

export const TWISTS: TwistDef[] = [
  { id: 'rain', name: 'Rain', blurb: 'Wet bowstrings. Bowmen strike ×0.7.', bowDamage: 0.7 },
  {
    id: 'fog',
    name: 'Fog',
    blurb: 'Knights see nothing to charge, and bowmen reach ×0.7.',
    noCharge: true,
    bowReach: 0.7,
  },
  { id: 'flood', name: 'Flood', blurb: 'The fords run wide.', flood: true },
  { id: 'feast', name: 'Feast day', blurb: 'Harvests ×1.25 on both sides.', income: 1.25 },
  { id: 'fever', name: 'Camp fever', blurb: 'Musters ×0.75 on both sides.', muster: 0.75 },
  { id: 'frost', name: 'Hard frost', blurb: 'Frozen timbers. Gates ×0.75.', gate: 0.75 },
];

export const NO_TWIST: TwistDef = { id: 'none', name: 'Fair weather', blurb: 'Nothing unusual.' };

export function twistById(id: string): TwistDef {
  return TWISTS.find((t) => t.id === id) ?? NO_TWIST;
}
