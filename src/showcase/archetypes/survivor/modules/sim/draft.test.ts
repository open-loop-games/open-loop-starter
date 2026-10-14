/**
 * Draft spec: what a rewrite offers, and what the star's draft policy takes. Pure over an
 * arena state, so no engine. No magnitudes.
 */

import { describe, expect, it } from 'vitest';
import { ANCHORS, PERKS, RIGS, RIG_BY_ID, STARS } from '../../data';
import { createArena, type ArenaState } from './arena';
import {
  HEADING_BOUND_DISCOUNT,
  chooseCard,
  drawOffer,
  eligibleCards,
  emptyPerks,
  scoreCard,
  type Card,
} from './draft';

const arena = (): ArenaState =>
  createArena({ rng: () => 0.5, rating: 0, startRig: 'prop-pistol', maxHp: 100 });
const veteran = STARS[0]!.instinct;
let n = 0;
const rng = () => (n = (n * 9301 + 49297) % 233280) / 233280;

describe('survivor/draft — offers', () => {
  it('offers a level on the rig worn, every rig not worn, and every perk at the opening', () => {
    const cards = eligibleCards(arena(), emptyPerks()).map((c) => c.item);
    expect(cards).toContainEqual({ kind: 'rig-level', rig: 'prop-pistol', toLevel: 2 });
    expect(cards.filter((c) => c.kind === 'rig-new')).toHaveLength(RIGS.length - 1);
    expect(cards.filter((c) => c.kind === 'perk')).toHaveLength(PERKS.length);
  });

  it('never offers a rig the double already wears', () => {
    const cards = eligibleCards(arena(), emptyPerks()).map((c) => c.item);
    expect(cards).not.toContainEqual({ kind: 'rig-new', rig: 'prop-pistol' });
  });

  it('offers no new rig once every slot is filled, and no level past the cap', () => {
    const a = arena();
    for (const def of RIGS.slice(1, ANCHORS.rigSlots)) a.rigs.push({ def, level: 1, cd: 0 });
    a.rigs[0]!.level = ANCHORS.rigMaxLevel;
    const cards = eligibleCards(a, emptyPerks()).map((c) => c.item);
    expect(cards.some((c) => c.kind === 'rig-new')).toBe(false);
    expect(cards).not.toContainEqual(
      expect.objectContaining({ kind: 'rig-level', rig: 'prop-pistol' }),
    );
  });

  it('stops offering a perk once it is fully stacked', () => {
    const perks = emptyPerks();
    perks.stamina = PERKS.find((p) => p.id === 'stamina')!.maxStacks;
    const cards = eligibleCards(arena(), perks).map((c) => c.item);
    expect(cards).not.toContainEqual(expect.objectContaining({ kind: 'perk', perk: 'stamina' }));
  });

  it('draws without replacement, and never more than the pool holds', () => {
    const offer = drawOffer(arena(), emptyPerks(), 3, rng);
    expect(new Set(offer.map((c) => JSON.stringify(c))).size).toBe(3);
    const pool = eligibleCards(arena(), emptyPerks()).length;
    expect(drawOffer(arena(), emptyPerks(), pool + 5, rng)).toHaveLength(pool);
  });

  it('offers craft service alone when nothing is left', () => {
    const a = arena();
    for (const def of RIGS.slice(1, ANCHORS.rigSlots)) a.rigs.push({ def, level: 1, cd: 0 });
    for (const slot of a.rigs) slot.level = ANCHORS.rigMaxLevel;
    const perks = emptyPerks();
    for (const p of PERKS) perks[p.id] = p.maxStacks;
    expect(drawOffer(a, perks, 3, rng)).toEqual([{ kind: 'craft-service' }]);
  });
});

describe('survivor/draft — the star’s policy', () => {
  const damage: Card = { kind: 'perk', perk: 'bigger-charges', toStack: 1 };
  const reach: Card = { kind: 'perk', perk: 'boom-mic', toStack: 1 };

  it('leans defensive while under its defense share, and offensive once over it', () => {
    const a = arena();
    expect(chooseCard([damage, reach], veteran, 'instinct', { taken: 10, defensive: 0 }, a)).toBe(
      1,
    );
    expect(chooseCard([damage, reach], veteran, 'instinct', { taken: 10, defensive: 9 }, a)).toBe(
      0,
    );
  });

  it('discounts a heading-bound rig for an improvising star, but not for a hand', () => {
    const cone: Card = { kind: 'rig-new', rig: 'pyro-gag' };
    const tally = { taken: 0, defensive: 0 };
    const star = scoreCard(cone, veteran, 'instinct', tally, arena());
    const hand = scoreCard(cone, veteran, 'player', tally, arena());
    expect(hand - star).toBe(HEADING_BOUND_DISCOUNT);
    expect(RIG_BY_ID['pyro-gag'].shape).toBe('heading-cone');
  });

  it('discounts rather than forbids: offered alone, the cone is still taken', () => {
    const cone: Card = { kind: 'rig-new', rig: 'pyro-gag' };
    expect(
      scoreCard(cone, veteran, 'instinct', { taken: 0, defensive: 0 }, arena()),
    ).toBeGreaterThan(0);
  });
});

describe('survivor/draft — the climax', () => {
  const tally = { taken: 2, defensive: 1 };
  const bottles = (): ArenaState =>
    createArena({ rng: () => 0.5, rating: 0, startRig: 'breakaway', maxHp: 100 });

  it('reaches for a single-target rig while the loadout has none', () => {
    const offer: Card[] = [
      { kind: 'rig-new', rig: 'squib-ring' },
      { kind: 'rig-new', rig: 'prop-pistol' },
    ];
    expect(chooseCard(offer, veteran, 'instinct', tally, bottles())).toBe(1);
  });

  it('stops reaching once one is worn', () => {
    const ring = scoreCard(
      { kind: 'rig-new', rig: 'squib-ring' },
      veteran,
      'instinct',
      tally,
      arena(),
    );
    const rifle = scoreCard(
      { kind: 'rig-new', rig: 'dolly-rifle' },
      veteran,
      'instinct',
      tally,
      arena(),
    );
    expect(rifle).toBe(ring);
  });
});
