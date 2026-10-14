// ─── Skeleton ───
// The script: what a take stages beyond the scene curves. At the climax the rating's lead
// walks on, and the take is in the can only when it falls; the scene index keeps stepping
// while it stands, and the strike crew strikes the set if it stands too long. Before the
// climax, set pieces and guest stars are rolled into minute windows, and chalk marks wait
// on the floor: a mark filled with kills cuts the lead's part down.

import {
  ANCHORS,
  LEAD_PART,
  RATING_DEPTH,
  arrivalRate,
  incomeRate,
  requiredDps,
  sceneAt,
} from './spine';
import { RATINGS } from './ratings';

export type SetPieceId = 'stampede' | 'wall' | 'ring';
export type GuestId = 'rival' | 'mob';

export interface LeadDef {
  name: string;
  blurb: string;
}

export interface SetPieceDef {
  id: SetPieceId;
  name: string;
  blurb: string;
}

export interface GuestDef {
  id: GuestId;
  name: string;
  blurb: string;
}

/** Each rating's lead, by rating index. R's is the picture's villain: felling it wraps the picture. */
export const LEADS: readonly LeadDef[] = [
  { name: 'The Bouncer', blurb: 'Big, slow, and paid by the hour.' },
  { name: 'The Biker Boss', blurb: 'Leather, chrome and a grudge.' },
  { name: 'The Enforcer', blurb: 'Does every stunt. Hits like it.' },
  { name: 'The Big Bad', blurb: 'The villain of the picture. Fell this one and it wraps.' },
];

export const SET_PIECES: Record<SetPieceId, SetPieceDef> = {
  stampede: {
    id: 'stampede',
    name: 'Stampede',
    blurb: 'A column of bikers tears straight across the set.',
  },
  wall: { id: 'wall', name: 'The Charge', blurb: 'A line of extras sweeps the set. Find the gap.' },
  ring: { id: 'ring', name: 'Surrounded', blurb: 'The crowd closes in from every side at once.' },
};

export const GUESTS: Record<GuestId, GuestDef> = {
  rival: {
    id: 'rival',
    name: 'Guest Star',
    blurb:
      'A rival double, on set for one scene. Down the rival before the scene ends for a jackpot.',
  },
  mob: { id: 'mob', name: 'Crowd Call', blurb: 'A whole call sheet of extras arrives at once.' },
};

/** The set pieces each rating stages, by rating index: a harsher rating adds a shape. */
export const RATING_SET_PIECES: readonly (readonly SetPieceId[])[] = [
  [],
  ['stampede'],
  ['stampede', 'wall'],
  ['stampede', 'wall', 'ring'],
];

/** Guest-star events a take rolls, by rating index. */
export const RATING_GUESTS: readonly number[] = [1, 1, 2, 3];

// ─── Balance ───
// Every staged body is sized off the spine's demand at its scene, so a set piece or a guest
// costs the same seconds of the loadout's design damage at any rating.

export const SCRIPT = {
  /** Seconds the lead stands under the share of the design damage that reaches one body. */
  leadSeconds: 50,
  /**
   * Share of the loadout's design damage that reaches one body: the single-target rigs, and
   * the area rigs while it is close. Assumed; `take-probe.ts` reads the lead's fall time.
   */
  leadShare: 0.3,
  /** Minutes after the climax the strike crew walks on. */
  strikeAfter: 3,
  /** Seconds between strike-crew arrivals once they start. */
  strikeEvery: 15,

  /** First minute a guest and a set piece may play: the opening rig never meets either alone. */
  guestFrom: 2,
  setPieceFrom: 3,
  /** Share of guest events that are a rival rather than a crowd call (Brotato rolls 60/40). */
  rivalShare: 0.6,
  /** Seconds of the scene's design damage a rival's hp takes. */
  rivalSeconds: 12,
  /** A downed rival's jackpot: this many seconds of the scene's income, as one gold reel. */
  jackpotSeconds: 60,
  /** Seconds of arrivals a crowd call brings at once. */
  mobSeconds: 20,

  /** Chalk marks on the set each take. */
  marks: 2,
  /** A mark's radius, world units. */
  markRadius: 220,
  /** Share of a G take's arrivals a mark's kills must reach: a fifth, so filling both is most of a take's work. */
  markShare: 0.2,
  /** Share of the lead's hp each filled mark cuts. */
  markCut: 0.25,
  /** Distance of a mark's centre from the middle of the floor, world units. */
  markDistance: [350, 850] as const,

  /** Bodies in the stampede's column, and its speed. */
  stampedeBodies: 24,
  stampedeSpeed: 240,
  /** Spacing between the charge's bodies, the half-width of the line, and the gap. */
  wallSpacing: 30,
  wallHalfWidth: 900,
  wallGap: 130,
  wallSpeed: 85,
  /** Radius the ring is cast at, and the spacing between its bodies. */
  ringRadius: 420,
  ringSpacing: 28,
};

/** The lead's hp at a rating, before the marks cut it. */
export function leadHp(rating: number): number {
  const scene = sceneAt(ANCHORS.takeSeconds, RATING_DEPTH[rating]);
  return SCRIPT.leadSeconds * SCRIPT.leadShare * requiredDps(scene) * LEAD_PART[rating]!;
}

/** A rival's hp at a scene. */
export function rivalHp(scene: number): number {
  return SCRIPT.rivalSeconds * requiredDps(scene);
}

/** A rival's jackpot at a scene, in reels. */
export function rivalJackpot(scene: number): number {
  return SCRIPT.jackpotSeconds * incomeRate(scene);
}

/** Kills inside a mark that fill it: `markShare` of what walks on over a take at G. */
export const MARK_KILLS = (() => {
  let arrivals = 0;
  for (let t = 0; t < ANCHORS.takeSeconds; t += ANCHORS.sceneSeconds)
    arrivals += arrivalRate(sceneAt(t)) * ANCHORS.sceneSeconds;
  return Math.round(SCRIPT.markShare * arrivals);
})();

export const LAST_RATING = RATINGS.length - 1;
