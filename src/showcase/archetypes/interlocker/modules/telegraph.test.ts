import { beforeEach, describe, expect, it } from 'vitest';
import { boot, getEngine } from '../sim/harness';
import { getTelegraph } from './telegraph';

describe('the telegraph', () => {
  beforeEach(() => boot());

  it('starts empty when a slot loads', () => {
    const engine = getEngine();
    engine.saveManager!.save();
    getTelegraph().send('a wire from the last game', 'build');
    expect(engine.load().success).toBe(true);
    expect(getTelegraph().log.value).toHaveLength(0);
  });
});
