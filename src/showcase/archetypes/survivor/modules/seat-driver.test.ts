/**
 * Seat-driver behavioural spec — "a policy swapped for input", asserted.
 *
 * This is the one seam that spans three modules (`arena` movement, `draft`
 * resolution, `run` lifecycle), so it lives here under its own name rather than
 * beside any one of them, per `.claude/rules/archetype-authoring.md` § Balance.
 *
 * No magnitudes. What is asserted is that the SAME mechanics run either way and
 * only the answerer changes — which is the property that makes the balance
 * roster meaningful once a human can sit down at it.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ArenaKey } from './arena';
import { DraftKey } from './draft';
import { RunKey } from './run';
import { PLAYER_SEAT, SEATS, seatById } from '../data/seats';
import { boot, getEngine, tick } from '../sim/harness';

const arena = () => {
  const api = getEngine().tryInject(ArenaKey);
  if (!api) throw new Error('survivor/arena did not provide ArenaKey');
  return api;
};
const draft = () => getEngine().tryInject(DraftKey)!;
const run = () => getEngine().tryInject(RunKey)!;

describe('survivor/seats — drivers', () => {
  beforeEach(() => boot());

  it('keeps the player seat out of the measurable roster', () => {
    // `SEATS` is the balance sweep axis. A seat with no policy has no arc, so a
    // probe that walked it would report a stationary operator as a reading.
    expect(SEATS.every((s) => s.driver === 'policy')).toBe(true);
    expect(SEATS.map((s) => s.id)).not.toContain(PLAYER_SEAT.id);
    expect(seatById(PLAYER_SEAT.id).driver).toBe('player');
  });

  it('opens in briefing so a seat can be assigned before the first run', () => {
    expect(arena().outcome.value).toBe('briefing');
  });

  it('does not advance the floor until a run is started', async () => {
    await tick(60);
    expect(arena().state.value.time).toBe(0);
  });
});

describe('survivor/arena — player-driven movement', () => {
  beforeEach(() => boot());

  it('holds position while nothing is held', async () => {
    run().startRun(PLAYER_SEAT.id);
    const { x, y } = arena().state.value.operator;
    await tick(40);
    expect(arena().state.value.operator.x).toBe(x);
    expect(arena().state.value.operator.y).toBe(y);
  });

  it('moves along the posted heading', async () => {
    run().startRun(PLAYER_SEAT.id);
    const start = { ...arena().state.value.operator };
    arena().setControl({ x: 1, y: 0 });
    await tick(40);
    const now = arena().state.value.operator;
    expect(now.x).toBeGreaterThan(start.x);
    expect(Math.abs(now.y - start.y)).toBeLessThan(1e-6);
  });

  it('normalises a diagonal so it is not faster than an axis', async () => {
    run().startRun(PLAYER_SEAT.id);
    const straightStart = { ...arena().state.value.operator };
    arena().setControl({ x: 1, y: 0 });
    await tick(40);
    const straight = Math.hypot(
      arena().state.value.operator.x - straightStart.x,
      arena().state.value.operator.y - straightStart.y,
    );

    run().startRun(PLAYER_SEAT.id);
    const diagStart = { ...arena().state.value.operator };
    arena().setControl({ x: 1, y: 1 });
    await tick(40);
    const diagonal = Math.hypot(
      arena().state.value.operator.x - diagStart.x,
      arena().state.value.operator.y - diagStart.y,
    );

    expect(diagonal).toBeCloseTo(straight, 4);
  });

  it('keeps the last heading when input stops, so aim survives letting go', async () => {
    run().startRun(PLAYER_SEAT.id);
    arena().setControl({ x: 0, y: 1 });
    await tick(20);
    const aimed = { ...arena().state.value.operator.heading };
    arena().setControl(null);
    await tick(20);
    expect(arena().state.value.operator.heading).toEqual(aimed);
  });

  it('ignores posted control on a policy seat', async () => {
    run().startRun('generalist');
    const start = { ...arena().state.value.operator };
    // `null` is the one input whose effect is unambiguous: it means STAND STILL,
    // and the spec above asserts a player seat obeys it. A policy seat must move
    // anyway, because nothing reads the posted value at all.
    //
    // Asserted this way round deliberately. The earlier form posted (1, 0) and
    // required the heading to differ from it three seconds later, which is not
    // the invariant — the policy is free to CHOOSE (1, 0) when a specimen lies
    // that way, so the test was really asserting a property of the seeded spawn
    // stream and it failed the first time an unrelated change shifted that
    // stream. A behavioural spec must not depend on where the dice landed.
    arena().setControl(null);
    await tick(60);
    const now = arena().state.value.operator;
    expect(Math.hypot(now.x - start.x, now.y - start.y)).toBeGreaterThan(0);
  });
});

describe('survivor/draft — who answers', () => {
  beforeEach(() => boot());

  it('leaves the pick owed and the floor held for a player seat', async () => {
    run().startRun(PLAYER_SEAT.id);
    // Bank straight past the first rung rather than playing to it: this specs
    // WHO answers, not how long income takes.
    arena().state.value.stats.motesBanked = run().nextThreshold.value + 1;
    await tick(4);

    expect(run().pendingPicks.value).toBeGreaterThan(0);
    expect(draft().offers.value.length).toBeGreaterThan(0);

    const held = arena().state.value.time;
    await tick(20);
    expect(arena().state.value.time).toBe(held);
  });

  it('resolves that same pick when the player chooses', async () => {
    run().startRun(PLAYER_SEAT.id);
    arena().state.value.stats.motesBanked = run().nextThreshold.value + 1;
    await tick(4);

    const before = arena().state.value.devices.length;
    draft().choose(0);
    expect(run().pendingPicks.value).toBe(0);
    // Something changed: a device arrived, levelled, or a reagent stacked.
    const after = arena().state.value;
    const grew =
      after.devices.length > before ||
      after.devices.some((d) => d.level > 1) ||
      after.reagentStacks.size > 0;
    expect(grew).toBe(true);

    await tick(20);
    expect(arena().state.value.time).toBeGreaterThan(0);
  });
});
