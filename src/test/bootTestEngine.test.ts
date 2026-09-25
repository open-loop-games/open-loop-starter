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
});
