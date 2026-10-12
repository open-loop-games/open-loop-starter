import { addResource } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { boot, tick, tickUntil } from '../sim/harness';
import { getAutomation, ROUTINE_DWELL, shouldBeginNight, shouldTurnIn } from './automation';
import { getMeta } from './meta';
import { getNight } from './night';

describe('automation policies', () => {
  it('Routine begins a night only once enabled, between nights, after the dwell', () => {
    const ready = { enabled: true, nightActive: false, sinceNightEnded: ROUTINE_DWELL };
    expect(shouldBeginNight(ready)).toBe(true);
    expect(shouldBeginNight({ ...ready, enabled: false })).toBe(false);
    expect(shouldBeginNight({ ...ready, nightActive: true })).toBe(false);
    expect(shouldBeginNight({ ...ready, sinceNightEnded: 0 })).toBe(false);
  });

  it('Discipline turns in only once enabled, during a night, with the plan spent', () => {
    const ready = { enabled: true, nightActive: true, planExhausted: true };
    expect(shouldTurnIn(ready)).toBe(true);
    expect(shouldTurnIn({ ...ready, enabled: false })).toBe(false);
    expect(shouldTurnIn({ ...ready, nightActive: false })).toBe(false);
    expect(shouldTurnIn({ ...ready, planExhausted: false })).toBe(false);
  });
});

describe('automation ladder', () => {
  beforeEach(() => boot());

  async function endOneNight(): Promise<void> {
    const night = getNight();
    getMeta().plan.value = [{ id: 'push-ups', times: 1 }];
    night.beginNight();
    night.turnIn();
    await tickUntil(() => !night.nightActive.value, 100);
  }

  function buy(id: 'routine' | 'discipline'): void {
    const meta = getMeta();
    addResource(meta.intel, 1000);
    meta.notes.getPurchasable(id)!.purchase(1);
  }

  it('without Routine, the next night waits for the player', async () => {
    await endOneNight();
    await tick(20 * (ROUTINE_DWELL + 2));
    expect(getNight().nightActive.value).toBe(false);
  });

  it('with Routine, the next night begins after the dwell', async () => {
    buy('routine');
    expect(getAutomation().hasReached('routine')).toBe(true);
    await endOneNight();
    await tickUntil(() => getNight().nightActive.value, 20 * (ROUTINE_DWELL + 2));
  });

  it("Routine's toggle holds it off", async () => {
    buy('routine');
    getAutomation().autoBegin.value = false;
    await endOneNight();
    await tick(20 * (ROUTINE_DWELL + 2));
    expect(getNight().nightActive.value).toBe(false);
  });

  it('Discipline is hidden until Routine is owned', () => {
    const discipline = getMeta().notes.getPurchasable('discipline')!;
    expect(discipline.visible.value).toBe(false);
    buy('routine');
    expect(discipline.visible.value).toBe(true);
  });

  it('with Discipline, a spent plan ends the night before Nerve runs out', async () => {
    buy('routine');
    buy('discipline');
    const night = getNight();
    getMeta().plan.value = [{ id: 'push-ups', times: 1 }];
    night.beginNight();
    await tickUntil(() => !night.nightActive.value, 20 * 30);
    expect(night.lastNight.value?.cause).toBe('turned-in');
  });
});
