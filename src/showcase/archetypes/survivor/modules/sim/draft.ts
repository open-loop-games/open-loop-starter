/**
 * Rewrites: the offered draft at every level-up, and the star's draft policy. Pages are
 * drawn from a weighted pool; one is taken and the rest are lost to this offer, though they
 * stay eligible for the next. Pure over the arena state, like the step.
 */
import { weightedPick } from '@open-loop/engine';
import {
  ANCHORS,
  CARD_WEIGHTS,
  CRAFT_SERVICE_HEAL,
  PERKS,
  PERK_BY_ID,
  RIGS,
  RIG_BY_ID,
  type Driver,
  type Instinct,
  type PerkId,
  type RigId,
  type RigShape,
} from '../../data';
import type { ArenaState } from './arena';

export type Card =
  | { kind: 'rig-new'; rig: RigId }
  | { kind: 'rig-level'; rig: RigId; toLevel: number }
  | { kind: 'perk'; perk: PerkId; toStack: number }
  | { kind: 'craft-service' };

export type PerkStacks = Record<PerkId, number>;

export function emptyPerks(): PerkStacks {
  return { stamina: 0, cardio: 0, 'boom-mic': 0, 'crew-call': 0, 'bigger-charges': 0 };
}

/** Every page this build could take now, with its draw weight. */
export function eligibleCards(
  arena: ArenaState,
  perks: PerkStacks,
): { item: Card; weight: number }[] {
  const out: { item: Card; weight: number }[] = [];
  const owned = new Set(arena.rigs.map((r) => r.def.id));
  for (const slot of arena.rigs) {
    if (slot.level < ANCHORS.rigMaxLevel) {
      out.push({
        item: { kind: 'rig-level', rig: slot.def.id, toLevel: slot.level + 1 },
        weight: CARD_WEIGHTS.rigLevel,
      });
    }
  }
  if (arena.rigs.length < ANCHORS.rigSlots) {
    for (const def of RIGS) {
      if (!owned.has(def.id))
        out.push({ item: { kind: 'rig-new', rig: def.id }, weight: CARD_WEIGHTS.rigNew });
    }
  }
  for (const def of PERKS) {
    if (perks[def.id] < def.maxStacks) {
      out.push({
        item: { kind: 'perk', perk: def.id, toStack: perks[def.id] + 1 },
        weight: CARD_WEIGHTS.perk,
      });
    }
  }
  return out;
}

// TODO(expansion): k distinct draws from a weighted pool: weightedPick re-run over a
// shrinking list. The offer shape every offered-draft game draws.
export function drawOffer(
  arena: ArenaState,
  perks: PerkStacks,
  size: number,
  rng: () => number,
): Card[] {
  const pool = eligibleCards(arena, perks);
  const offer: Card[] = [];
  while (offer.length < size && pool.length > 0) {
    const card = weightedPick(pool, rng);
    if (!card) break;
    offer.push(card);
    pool.splice(
      pool.findIndex((p) => p.item === card),
      1,
    );
  }
  if (offer.length === 0) offer.push({ kind: 'craft-service' });
  return offer;
}

export function applyCard(arena: ArenaState, perks: PerkStacks, card: Card): void {
  switch (card.kind) {
    case 'rig-new':
      arena.rigs.push({ def: RIG_BY_ID[card.rig], level: 1, cd: 0 });
      return;
    case 'rig-level': {
      const slot = arena.rigs.find((r) => r.def.id === card.rig)!;
      slot.level = card.toLevel;
      return;
    }
    case 'perk':
      perks[card.perk] = card.toStack;
      return;
    case 'craft-service':
      arena.player.hp = Math.min(
        arena.player.maxHp,
        arena.player.hp + arena.player.maxHp * CRAFT_SERVICE_HEAL,
      );
      return;
  }
}

/** A page that buys damage, as against health, speed or reach. */
export function isOffensive(card: Card): boolean {
  if (card.kind === 'rig-new' || card.kind === 'rig-level') return true;
  if (card.kind === 'perk') return PERK_BY_ID[card.perk].offensive;
  return false;
}

// ─── The star's draft policy ───

/** The pages a take has taken so far, which the policy steers toward its defense share. */
export interface DraftTally {
  taken: number;
  defensive: number;
}

/**
 * Score an improvising star gives up for a heading-bound rig. It cancels the new-rig bonus
 * rather than the whole page, so the rig still enters a loadout with room for it and still
 * deepens when the draw favours it. A discount and not a ban: the policy lands about a
 * third of the cone a perfect aim would (`../../balance/cone-probe.ts`), and a hand is not
 * discounted at all.
 */
export const HEADING_BOUND_DISCOUNT = 7;

/**
 * Score a single-target rig earns while the loadout has none. The lead is one body, and
 * only the pistol and the rifle reach it from outside its contact, so a loadout without one
 * meets the climax unable to close it out.
 */
export const LEAD_REACH_BONUS = 8;

/** Pages after which a new rig stops being worth more than depth. */
const BREADTH_PICKS = 6;

/** How much a rig wants its next level: rises toward the cap, so a take finishes what it starts. */
function levelPressure(toLevel: number): number {
  return 8 * ((toLevel - 1) / ANCHORS.rigMaxLevel) ** 2;
}

/**
 * Scores one page for a star. A page aligned with the star's defense share scores 10, one
 * against it 4; breadth pays early, depth after; a heading-bound rig is discounted for an
 * improvising star; a reach perk pays a star with an appetite for reels.
 */
export function scoreCard(
  card: Card,
  instinct: Instinct,
  driver: Driver,
  tally: DraftTally,
  arena: ArenaState,
): number {
  if (card.kind === 'craft-service') return 0;
  const share = tally.taken > 0 ? tally.defensive / tally.taken : 0;
  const wantsDefensive = share < instinct.defenseShare;
  let score = isOffensive(card) !== wantsDefensive ? 10 : 4;

  if (card.kind === 'rig-new') score += tally.taken < BREADTH_PICKS ? 7 : 1;
  if (card.kind === 'rig-level') score += levelPressure(card.toLevel);

  const rig = card.kind === 'rig-new' || card.kind === 'rig-level' ? RIG_BY_ID[card.rig] : null;
  if (driver !== 'player' && rig?.shape === 'heading-cone') score -= HEADING_BOUND_DISCOUNT;
  if (
    card.kind === 'rig-new' &&
    rig &&
    singleTarget(rig.shape) &&
    !arena.rigs.some((r) => singleTarget(r.def.shape))
  )
    score += LEAD_REACH_BONUS;

  if (card.kind === 'perk' && card.perk === 'boom-mic') score += instinct.eta * 3;
  if (card.kind === 'perk' && card.perk === 'stamina') {
    const hurt = 1 - arena.player.hp / arena.player.maxHp;
    score += hurt * 8;
  }
  return score;
}

function singleTarget(shape: RigShape): boolean {
  return shape === 'nearest' || shape === 'heaviest';
}

/** The star's pick: the highest-scoring page, the first on a tie. */
export function chooseCard(
  offer: readonly Card[],
  instinct: Instinct,
  driver: Driver,
  tally: DraftTally,
  arena: ArenaState,
): number {
  let best = 0;
  let bestScore = -Infinity;
  offer.forEach((card, i) => {
    const score = scoreCard(card, instinct, driver, tally, arena);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
