/**
 * Example behavioral suite — the pattern every game test in this fork should
 * copy. It exercises the harness end-to-end (`boot` → `tick` → save/load) so a
 * freshly-ejected repo starts green, and it guards the scaffold's core promise:
 * persistence survives a round-trip.
 *
 * The blank game has no modules of its own yet, so this targets the shared base
 * (settings). As you add game modules, write one suite per module beside it —
 * `src/game/modules/<name>.test.ts` — that boots the harness and asserts the
 * mechanic's *observable behavior* through its public API:
 *
 *   beforeEach(() => boot());
 *   it('a widget produces while it runs', async () => {
 *     startWidget();
 *     await tick(10);
 *     expect(getOutput().gt(0)).toBe(true);   // behavior, not a magic number
 *   });
 *
 * Absolute economy magnitudes belong in the balance probes (`balance/`+`sim/`),
 * not here — this layer specs *what the mechanic does*, which stays true across
 * retunes; the balance layer locks *how much*, with tolerance.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, getEngine, tick } from './harness';
import { SettingsKey } from '@/modules/settings';

beforeEach(() => boot());

describe('harness smoke', () => {
  it('boots with the shared base installed and ticks without error', async () => {
    const settings = getEngine().tryInject(SettingsKey);
    expect(settings).toBeDefined();
    await expect(tick(5)).resolves.toBeUndefined();
  });
});

describe('save round-trip (scaffold persistence)', () => {
  it('restores a persisted setting after a scramble + load', () => {
    const engine = getEngine();
    const { offlineProgress } = engine.tryInject(SettingsKey)!.settings;

    // Persist a non-default value…
    offlineProgress.value = false;
    engine.save();

    // …scramble the live state, then load it back.
    offlineProgress.value = true;
    const result = engine.load();

    expect(result.success).toBe(true);
    expect(offlineProgress.value).toBe(false);
  });
});
