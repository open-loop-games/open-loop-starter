// ─── Skeleton ───
// The keep weapon: one engine on the walls, charged over the battle and fired by its keep.
// Fairhold mounts one kind a battle, chosen in camp from those the boons have opened; each
// lord mounts his own.

export type WeaponKind = 'trebuchet' | 'firepots';

export interface WeaponDef {
  kind: WeaponKind;
  name: string;
  blurb: string;
  /** The boon that opens it for Fairhold. */
  boon: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    kind: 'trebuchet',
    name: 'the Trebuchet',
    blurb: 'A stone on their foremost ranks.',
    boon: 'trebuchet',
  },
  {
    kind: 'firepots',
    name: 'Fire-pots',
    blurb: 'Burns the engine nearest our gate.',
    boon: 'firepots',
  },
];

export function weapon(kind: WeaponKind): WeaponDef {
  return WEAPONS.find((w) => w.kind === kind)!;
}
