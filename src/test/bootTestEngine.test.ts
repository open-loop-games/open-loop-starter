import { describe, it, expect } from 'vitest';
import { getSeed, random } from '@open-loop/engine';
import { bootTestEngine } from './bootTestEngine';

describe('bootTestEngine', () => {
  it('replays the same module-global draws on every boot', () => {
    const drawAfterBoot = () => {
      bootTestEngine({ modules: [] });
      return [random(), random()];
    };
    expect(drawAfterBoot()).toEqual(drawAfterBoot());
  });

  it('seeds the stream a module reads with getSeed from the given seed', () => {
    let seenAtInstall: number | undefined;
    bootTestEngine({
      seed: 7,
      modules: [
        {
          id: 'reads-seed',
          install() {
            seenAtInstall = getSeed();
          },
        },
      ],
    });
    expect(seenAtInstall).toBe(7);
  });

  it("ticks at the game's own dt when it runs the fixed tick mode", async () => {
    const seen: number[] = [];
    const { tick } = bootTestEngine({
      intervalRate: 20,
      tickMode: 'fixed',
      fixedDt: 0.12,
      modules: [
        {
          id: 'reads-dt',
          install(ctx) {
            ctx.onTick((dt) => seen.push(dt));
          },
        },
      ],
    });
    await tick(2);
    expect(seen).toEqual([0.12, 0.12]);
  });
});
