import { describe, expect, it } from 'vitest';
import { noCounts } from '../../modules/battle';
import { FIGURE_CAP, figureCounts } from './layout';

const counts = (c: Partial<ReturnType<typeof noCounts>>) => ({ ...noCounts(), ...c });

describe('the figures a squad shows', () => {
  it('are one per whole unit while the squad is small', () => {
    expect(figureCounts(counts({ razor: 3, hexer: 2.6 }))).toEqual(counts({ razor: 3, hexer: 2 }));
  });

  it('never pass the cap, and every kind present keeps at least one', () => {
    const shown = figureCounts(counts({ razor: 60, hexer: 1, enforcer: 9 }));
    expect(shown.razor + shown.hexer + shown.rigger + shown.enforcer).toBe(FIGURE_CAP);
    expect(shown.hexer).toBeGreaterThanOrEqual(1);
    expect(shown.enforcer).toBeGreaterThanOrEqual(1);
    expect(shown.razor).toBeGreaterThan(shown.enforcer);
  });
});
