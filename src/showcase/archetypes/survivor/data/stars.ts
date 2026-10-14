// ─── Skeleton ───
// The stars: the character select, the automated players and the balance sweep axis at
// once. A star is a body (an opening rig, a health and a speed bias) and an instinct: the
// parameters of the shipping movement and draft policies that play the take when the star
// improvises. The same take with `driver: 'player'` swaps both policies for input and
// changes no mechanic.

import { ANCHORS, STAR_TAKES } from './spine';
import type { RigId } from './rigs';

/**
 * Who calls the moves in a take. `instinct` runs the star's movement and draft policies;
 * `player` reads input for movement and waits for a picked page. An improvising star is an
 * alternative driver, chosen per take, not automation the player unlocks, so no automation
 * tier gates it.
 */
export type Driver = 'player' | 'instinct';

/**
 * A star's instinct: what the policies are asked to prefer, not what they achieve. The
 * probes measure what they achieve.
 */
export interface Instinct {
  /**
   * Appetite for the fight, 0–1. Sets how deep inside the loadout's reach the star holds
   * the crowd, and how much bodies in reach are worth to it.
   */
  engage: number;
  /** Appetite for reels, 0–1: the weight on the reel terms of the movement score. */
  eta: number;
  /** Share of rewrites the draft policy spends on pages that are not damage. */
  defenseShare: number;
  /** Appetite for the chalk marks, 0–1: the weight on the pull toward an open one. */
  mark: number;
}

export interface StarDef {
  id: 'veteran' | 'pyro' | 'wirework';
  name: string;
  blurb: string;
  startRig: RigId;
  hpMult: number;
  speedMult: number;
  cost: number;
  instinct: Instinct;
}

// ─── Balance ───
// The Veteran is the baseline the spine's `defenseShare` names. The other two each move one
// thing: the Pyro presses into the crowd its cone must face, the Wirework Ace trades health
// for speed and leans on reels. Signing prices are in full takes of clout.

export const STARS: readonly StarDef[] = [
  {
    id: 'veteran',
    name: 'The Veteran',
    blurb: 'Twenty years of falls. Starts with the Prop Pistol.',
    startRig: 'prop-pistol',
    hpMult: 1,
    speedMult: 1,
    cost: 0,
    instinct: { engage: 0.55, eta: 0.65, defenseShare: ANCHORS.defenseShare, mark: 0.7 },
  },
  {
    id: 'pyro',
    name: 'The Pyro',
    blurb: 'Fireproof suit, +20% health. Starts with the Pyro Gag.',
    startRig: 'pyro-gag',
    hpMult: 1.2,
    speedMult: 0.95,
    cost: Math.round(STAR_TAKES.pyro * ANCHORS.cloutPerTake),
    instinct: { engage: 0.72, eta: 0.6, defenseShare: 0.25, mark: 0.5 },
  },
  {
    id: 'wirework',
    name: 'The Wirework Ace',
    blurb: 'Light on the feet, +15% speed. Starts with Breakaway Bottles.',
    startRig: 'breakaway',
    hpMult: 0.9,
    speedMult: 1.15,
    cost: Math.round(STAR_TAKES.wirework * ANCHORS.cloutPerTake),
    instinct: { engage: 0.62, eta: 0.78, defenseShare: 0.3, mark: 0.6 },
  },
];

export function starById(id: string): StarDef {
  const star = STARS.find((s) => s.id === id);
  if (!star) throw new Error(`survivor/stars: no star "${id}"`);
  return star;
}
