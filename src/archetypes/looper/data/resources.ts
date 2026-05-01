// ─── Skeleton ───
// Slim resource set for the looper demo — gold only. Mana is a separate
// module (modules/mana.ts); reward effects and completionEffects reference it
// via addMana(), not as a resource.
//
// Guild, reputation, supplies, herbs, and other vanilla idle-loops resources
// are skipped content (no guild mechanic, no inventory resources in slim demo).

export interface ResourceDef {
  id: string;
  name: string;
  precision: number;
  tracked?: boolean;
  initiallyHidden?: boolean;
}

export const RESOURCE_DEFS: ResourceDef[] = [
  { id: 'gold', name: 'Gold', precision: 0, tracked: true },
];

export type ResourceId = 'gold';
