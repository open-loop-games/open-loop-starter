import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { beats, boot, tick } from '../sim/harness';
import { getDojo, getGraduation, getKata, getLineage } from '.';

describe('graduation', () => {
  beforeEach(() => boot());

  it('pays Insight, resets the dojo and keeps the rack', async () => {
    getKata().ink('strike');
    getKata().saveToRack(0, 'opening');
    addResource(getDojo().ki, Decimal.mul(getGraduation().threshold.value, 4.5));
    await tick(1);
    expect(getGraduation().pendingInsight.value).toBe(2);
    expect(getGraduation().graduate()).toBe(2);
    expect(Decimal.fromValue(getDojo().ki.value).toNumber()).toBe(0);
    expect(Decimal.fromValue(getDojo().runKi.value).toNumber()).toBe(0);
    expect(getLineage().graduations.value).toBe(1);
    expect(getKata().rack.value[0]).toMatchObject({ name: 'opening', text: 'strike' });
  });

  it('takes the words back, so a scroll that used them falls back to the first one', async () => {
    getDojo().techniques.getPurchasable('reading')!.count.value = 1;
    getKata().ink('if students > 3: recruit\nstrike');
    addResource(getDojo().ki, Decimal.mul(getGraduation().threshold.value, 4));
    await beats(1);
    getGraduation().graduate();
    expect(getDojo().knows('reading')).toBe(false);
    expect(getKata().inked.value).toContain('try to hire');
  });

  it('keeps the words when Remembered Forms is studied', async () => {
    getDojo().techniques.getPurchasable('reading')!.count.value = 1;
    getLineage().scrolls.getPurchasable('remembered-forms')!.count.value = 1;
    addResource(getDojo().ki, Decimal.mul(getGraduation().threshold.value, 4));
    await tick(1);
    getGraduation().graduate();
    expect(getDojo().knows('reading')).toBe(true);
  });
});
