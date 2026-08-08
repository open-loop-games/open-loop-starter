/**
 * Draft behavioural spec — offer generation and pick application.
 *
 * Offer generation is pure over arena state, so most of this needs no engine at
 * all. The mechanic under test is what the pool is ALLOWED to present given what
 * a run holds; which offer a seat takes is policy, and its consequences are the
 * probe's business.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createSeededRNG } from '@open-loop/engine';
import { DraftKey, candidateOffers, drawOffers, scoreOffer } from './draft';
import { RunKey } from './run';
import { createArenaState } from './sim/step';
import type { ArenaParams, ArenaState } from './sim/types';
import { BASELINE_SEAT } from '../data/seats';
import { boot, getEngine, tick } from '../sim/harness';

const params: ArenaParams = {
  engage: 0.55,
  eta: 0.65,
  speedMul: 1,
  dpsMul: 1,
  toughnessMul: 1,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: createSeededRNG(1),
};

const fresh = (): ArenaState => createArenaState(params);

describe('survivor/draft — offers', () => {
  it('offers the unowned devices and every reagent at the opening', () => {
    const offers = candidateOffers(fresh());
    expect(offers.some((o) => o.kind === 'device-acquire')).toBe(true);
    expect(offers.some((o) => o.kind === 'reagent')).toBe(true);
  });

  it('never offers to acquire a device already held', () => {
    const state = fresh();
    const held = state.devices[0].defId;
    const offers = candidateOffers(state);
    expect(offers.some((o) => o.kind === 'device-acquire' && o.id === held)).toBe(false);
  });

  it('offers to level a held device instead', () => {
    const state = fresh();
    const held = state.devices[0].defId;
    const offers = candidateOffers(state);
    expect(offers.some((o) => o.kind === 'device-level' && o.id === held)).toBe(true);
  });

  it('withholds an evolution until its device is maxed AND its reagent is held', () => {
    const state = fresh();
    state.devices[0].level = 8;
    expect(candidateOffers(state).some((o) => o.kind === 'evolution')).toBe(false);
    state.reagentStacks.set('catalyst', 1);
    expect(candidateOffers(state).some((o) => o.kind === 'evolution')).toBe(true);
  });

  it('stops offering a reagent once fully stacked', () => {
    const state = fresh();
    state.reagentStacks.set('catalyst', 4);
    expect(candidateOffers(state).some((o) => o.id === 'catalyst')).toBe(false);
  });

  it('draws without replacement', () => {
    const drawn = drawOffers(candidateOffers(fresh()), 3, createSeededRNG(5));
    expect(new Set(drawn.map((o) => `${o.kind}:${o.id}`)).size).toBe(drawn.length);
  });

  it('never draws more than the pool holds', () => {
    expect(drawOffers(candidateOffers(fresh()).slice(0, 2), 3, createSeededRNG(5))).toHaveLength(2);
  });

  it('weights the draw toward a device the run is deepening', () => {
    // The commitment property: without it a run can never reach an evolution,
    // because the device it is levelling is rarely on the table.
    const state = fresh();
    state.devices[0].level = 7;
    const deep = state.devices[0].defId;
    const candidates = candidateOffers(state);
    let seen = 0;
    for (let s = 0; s < 60; s++) {
      const drawn = drawOffers(candidates, 3, createSeededRNG(s), state.devices);
      if (drawn.some((o) => o.kind === 'device-level' && o.id === deep)) seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });
});

describe('survivor/draft — policy', () => {
  it('always prefers an evolution', () => {
    const evo = { kind: 'evolution' as const, id: 'continuum-arc', label: '', defensive: false };
    const other = { kind: 'reagent' as const, id: 'catalyst', label: '', defensive: false };
    expect(scoreOffer(evo, BASELINE_SEAT, 0, 0)).toBeGreaterThan(
      scoreOffer(other, BASELINE_SEAT, 0, 0),
    );
  });

  it('leans defensive while under the seat’s declared share', () => {
    const def = { kind: 'reagent' as const, id: 'ablative-plating', label: '', defensive: true };
    const off = { kind: 'reagent' as const, id: 'reactant-mass', label: '', defensive: false };
    // Zero defensive picks so far — a seat with σ > 0 wants one.
    expect(scoreOffer(def, BASELINE_SEAT, 0, 4)).toBeGreaterThan(
      scoreOffer(off, BASELINE_SEAT, 0, 4),
    );
  });
});

describe('survivor/draft — applied', () => {
  beforeEach(() => boot());

  it('resolves owed picks and grows the loadout', async () => {
    const run = getEngine().tryInject(RunKey)!;
    const draft = getEngine().tryInject(DraftKey)!;
    run.startRun('generalist');
    await tick(1400);
    const taken = draft.taken.value;
    const total = Object.values(taken).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(run.pendingPicks.value).toBe(0);
  });
});
