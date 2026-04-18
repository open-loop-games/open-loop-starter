/**
 * Goal-slot system tests (OL-508).
 *
 * Validates the slot ↔ chain.bind bridge: selecting a goal installs a
 * binding onto the target chain, deselecting releases it, swapping routes
 * across chains, capacity gates selection, and `rebindAll` re-installs
 * bindings after the slot's selections have been externally restored.
 *
 * The engine's `_resetAllPersistentContexts` isn't re-exported, and each
 * `createGoalSystem` call registers a `persistent(..., { name: 'selected' })`
 * under `creep-warfare/goals/{faction}/slot:goals` — re-invoking the
 * factory in the same process collides on that name. Workaround: build
 * one shared goal system in `beforeAll`, reset selections +
 * per-test-seeded chain state in `beforeEach`.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createModifierChain } from 'open-loop-engine';
import type { ModifierChain } from 'open-loop-engine';
import { createGoalSystem, type GoalChains, type GoalSystem } from '../goals';
import { FACTION_IDS, type FactionId, type HotspotDef } from '../content';

function makeChains(namespace: string): GoalChains {
  const build = (kind: string): Record<FactionId, ModifierChain> => {
    const out = {} as Record<FactionId, ModifierChain>;
    for (const f of FACTION_IDS) {
      out[f] = createModifierChain(`${namespace}/${f}/${kind}`);
    }
    return out;
  };
  return { attack: build('attack'), defense: build('defense'), spread: build('spread') };
}

const HOTSPOTS: HotspotDef[] = [
  { id: 'hs-nw', x: 18, y: 18, baseYield: 1, capacity: 100 },
  { id: 'hs-mid', x: 30, y: 30, baseYield: 1, capacity: 100 },
];

describe('goal-slot system', () => {
  let goals: GoalSystem;
  let chains: GoalChains;

  beforeAll(() => {
    chains = makeChains('test-goals');
    goals = createGoalSystem(chains, HOTSPOTS);
  });

  beforeEach(() => {
    // Reset any lingering selections (which auto-unbinds their chain
    // grants via onDeselect) and capacity back to the STARTING default.
    for (const f of FACTION_IDS) goals.slots[f].deselectAll();
    goals.capacity.value = 1;
  });

  it('selecting a claim goal binds a 1.5× modifier onto the spread chain', () => {
    const spreadRed = chains.spread.red;
    expect(spreadRed.bindings().length).toBe(0);

    expect(goals.slots.red.select('claim:hotspot-hs-nw')).toBe(true);

    const bindings = spreadRed.bindings();
    expect(bindings.length).toBe(1);
    expect(bindings[0].id).toBe('creep-warfare/goals/red/claim:hotspot-hs-nw');
    expect(Number(spreadRed.apply(10))).toBeCloseTo(15);
  });

  it('deselecting releases the binding', () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    expect(chains.spread.red.bindings().length).toBe(1);

    expect(goals.slots.red.deselect('claim:hotspot-hs-nw')).toBe(true);
    expect(chains.spread.red.bindings().length).toBe(0);
    expect(Number(chains.spread.red.apply(10))).toBe(10);
  });

  it('defend and pressure goals route to defense and attack respectively', () => {
    goals.capacity.value = 3;
    goals.slots.red.select('defend:sector-nw');
    goals.slots.red.select('pressure:faction-blue');
    goals.slots.red.select('claim:hotspot-hs-mid');

    expect(chains.defense.red.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/red/defend:sector-nw',
    ]);
    expect(chains.attack.red.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/red/pressure:faction-blue',
    ]);
    expect(chains.spread.red.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/red/claim:hotspot-hs-mid',
    ]);
  });

  it('two factions can pick the same goal id without collision', () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    goals.slots.blue.select('claim:hotspot-hs-nw');

    expect(chains.spread.red.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/red/claim:hotspot-hs-nw',
    ]);
    expect(chains.spread.blue.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/blue/claim:hotspot-hs-nw',
    ]);
  });

  it('capacity 1 rejects a second selection', () => {
    expect(goals.capacity.value).toBe(1);
    expect(goals.slots.red.select('claim:hotspot-hs-nw')).toBe(true);
    expect(goals.slots.red.select('defend:sector-nw')).toBe(false);

    expect(chains.spread.red.bindings().length).toBe(1);
    expect(chains.defense.red.bindings().length).toBe(0);
  });

  it('increasing capacity admits a previously-rejected selection', () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    expect(goals.slots.red.select('defend:sector-nw')).toBe(false);

    goals.capacity.value = 2;
    expect(goals.slots.red.select('defend:sector-nw')).toBe(true);
    expect(chains.defense.red.bindings().length).toBe(1);
  });

  it('pool rejects pressure:faction-<self>', () => {
    const pool = goals.goalPoolFor('red');
    expect(pool).not.toContain('pressure:faction-red');
    expect(pool).toContain('pressure:faction-blue');
    expect(goals.slots.red.select('pressure:faction-red')).toBe(false);
  });

  it('rebindAll re-installs bindings for restored slot selections', () => {
    goals.slots.red.restore(['claim:hotspot-hs-mid']);
    // restore() sets _selected without firing onSelect — no binding yet.
    expect(chains.spread.red.bindings().length).toBe(0);

    goals.rebindAll();

    expect(chains.spread.red.bindings().map((b) => b.id)).toEqual([
      'creep-warfare/goals/red/claim:hotspot-hs-mid',
    ]);
  });

  it('rebindAll is idempotent', () => {
    goals.slots.red.select('claim:hotspot-hs-nw');
    goals.rebindAll();
    goals.rebindAll();
    expect(chains.spread.red.bindings().length).toBe(1);
  });
});
