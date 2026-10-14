// ─── Skeleton ───
// The rewrites: the writers' pages, offered at every level-up. A page is a new rig, a level
// on a rig the double wears, or a perk that is not a rig. When nothing is left to offer,
// craft service is the only page.

import { OFFENSIVE_PERK_STACKS, PERK_STEP } from './spine';

export type PerkId = keyof typeof PERK_STEP;

export interface PerkDef {
  id: PerkId;
  name: string;
  blurb: string;
  maxStacks: number;
  /** Counts toward damage rather than survival or income. */
  offensive: boolean;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const PERKS: readonly PerkDef[] = [
  {
    id: 'stamina',
    name: 'Stamina',
    blurb: `+${pct(PERK_STEP.stamina)} max health, healed in.`,
    maxStacks: 5,
    offensive: false,
  },
  {
    id: 'cardio',
    name: 'Cardio',
    blurb: `+${pct(PERK_STEP.cardio)} move speed.`,
    maxStacks: 5,
    offensive: false,
  },
  {
    id: 'boom-mic',
    name: 'Boom Mic',
    blurb: `+${pct(PERK_STEP['boom-mic'])} reel pickup reach.`,
    maxStacks: 4,
    offensive: false,
  },
  {
    id: 'crew-call',
    name: 'Crew Call',
    blurb: `+${pct(PERK_STEP['crew-call'])} rig fire rate.`,
    maxStacks: OFFENSIVE_PERK_STACKS,
    offensive: true,
  },
  {
    id: 'bigger-charges',
    name: 'Bigger Charges',
    blurb: `+${pct(PERK_STEP['bigger-charges'])} rig damage.`,
    maxStacks: OFFENSIVE_PERK_STACKS,
    offensive: true,
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p])) as Record<
  PerkId,
  PerkDef
>;

/** Pages offered at a rewrite before Script Doctor. */
export const BASE_OFFER = 3;

/** Share of max health craft service restores. */
export const CRAFT_SERVICE_HEAL = 0.3;

// ─── Balance ───
// Draw weights by page kind. A level on a rig the double wears is the likeliest page, so
// a take deepens what it has, which is the order the spine's mean loadout assumes.

export const CARD_WEIGHTS = { rigLevel: 3, rigNew: 2.5, perk: 1.4 } as const;
