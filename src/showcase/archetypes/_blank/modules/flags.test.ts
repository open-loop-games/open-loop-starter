/**
 * The saved flags, specced through the engine's accessor, the way a Gate or an
 * effect reaches them. It goes, or is reshaped, with `flags.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateAccessorKey } from '@open-loop/engine';
import { boot, getEngine } from '../sim/harness';

beforeEach(() => boot());

const accessor = () => getEngine().tryInject(GameStateAccessorKey)!;

describe('saved flags', () => {
  it('keeps a set flag across a save and a load', () => {
    accessor().setFlag('assistance-unlocked', true);
    getEngine().save();
    accessor().setFlag('assistance-unlocked', false);

    expect(getEngine().load().success).toBe(true);
    expect(accessor().getFlag('assistance-unlocked')).toBe(true);
  });

  it('throws on a flag id the game does not list', () => {
    expect(() => accessor().getFlag('assistance-unlockd')).toThrow(/GAME_FLAGS/);
  });
});
