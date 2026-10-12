import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { GEAR } from '../data';
import { boot, tick } from '../sim/harness';
import { getLodge } from './lodge';
import { getWold } from './wold';

const num = (r: { value: unknown }) => toNumber(r.value as number);

describe('the lodge', () => {
  beforeEach(() => boot());

  it('smokes no faster than its scarcest input allows', async () => {
    const { stores } = getLodge();
    // No snare line is owned at the start, so nothing refills the meat.
    stores.meat.value = 0;
    stores.wood.value = 100;
    const jerky = num(stores.jerky);

    await tick(40);
    expect(num(stores.jerky)).toBe(jerky);

    stores.meat.value = 100;
    await tick(40);
    expect(num(stores.jerky)).toBeGreaterThan(jerky);
    expect(num(stores.meat)).toBeLessThan(100);
  });

  it('opens a band to walking once its terrain gear is bought', () => {
    const lodge = getLodge();
    const wold = getWold();
    const fen = wold.tiles.find((t) => t.terrain === 'marsh' && !t.blocked)!;
    expect(wold.hasGearFor(fen)).toBe(false);

    const cost = GEAR.find((g) => g.id === 'waders')!.cost(0);
    for (const [k, v] of Object.entries(cost)) lodge.stores[k as 'hide'].value = v ?? 0;
    expect(lodge.buyGear('waders')).toBe(true);

    expect(wold.hasGearFor(fen)).toBe(true);
  });
});
