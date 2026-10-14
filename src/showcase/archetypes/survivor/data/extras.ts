// ─── Skeleton ───
// The extras: the crowd that walks onto the soundstage from every side. A kind is part of
// the cast, not a stat block: its hp is a factor on the scene's hp, and it joins the floor
// from a scene index on. A kind is structural, so nothing here is perturbable.

export type ExtraId = 'grunt' | 'biker' | 'bruiser' | 'henchman';

/** The bodies the script stages rather than the crowd. */
export type CastId = 'lead' | 'rival' | 'strike-crew';

export interface ExtraKind {
  id: ExtraId | CastId;
  /** Multiple of the scene's extra hp. Also the reel a kill drops, so income tracks the hp dealt. */
  hpFactor: number;
  /** Walking speed, world units a second. */
  speed: number;
  /** Draw weight among the kinds open at a scene. */
  weight: number;
  /** First scene index the kind walks on at. */
  fromScene: number;
  radius: number;
  /** Multiple of the scene's contact damage a touch deals; 1 when absent. */
  contact?: number;
}

export const EXTRAS: readonly ExtraKind[] = [
  { id: 'grunt', hpFactor: 1, speed: 62, weight: 10, fromScene: 0, radius: 11 },
  { id: 'biker', hpFactor: 0.7, speed: 165, weight: 4, fromScene: 1, radius: 10 },
  { id: 'bruiser', hpFactor: 4, speed: 42, weight: 2, fromScene: 2, radius: 17 },
  { id: 'henchman', hpFactor: 2, speed: 80, weight: 3, fromScene: 4, radius: 13 },
];

export function eligibleExtras(scene: number): ExtraKind[] {
  return EXTRAS.filter((k) => scene >= k.fromScene);
}

/**
 * The cast the script stages. Their hp is sized by the script, not the roster, so
 * `hpFactor` here is only the reel a kill drops in scene-hp units.
 */
export const CAST: Record<CastId, ExtraKind> = {
  lead: { id: 'lead', hpFactor: 0, speed: 70, weight: 0, fromScene: 0, radius: 30, contact: 5 },
  rival: { id: 'rival', hpFactor: 0, speed: 95, weight: 0, fromScene: 0, radius: 21, contact: 3 },
  'strike-crew': {
    id: 'strike-crew',
    hpFactor: 0,
    speed: 230,
    weight: 0,
    fromScene: 0,
    radius: 16,
    contact: Infinity,
  },
};

// ─── Balance ───
// The roster shifts the mean hp of what arrives as heavier kinds join: 1.0 at scene 0, 1.41
// from scene 4. The spine's hp flux carries this factor, so the per-level rig gain is solved
// against the mix and not just against the scene's hp.

/** Weighted mean hpFactor of what arrives at a scene. */
export function meanHpFactor(scene: number): number {
  const ks = eligibleExtras(scene);
  const w = ks.reduce((a, k) => a + k.weight, 0);
  return ks.reduce((a, k) => a + k.weight * k.hpFactor, 0) / w;
}
