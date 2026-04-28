import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOPER_DATA } from '../data';

const { balance, actions, zones, skills } = DEFAULT_LOOPER_DATA;

/**
 * Math-only regression locks — milliseconds, no engine boot. The balance
 * leaf (OL-737) re-pins these against solver-converged values; placeholder
 * numbers acceptable until then.
 */
describe('balance probe — solver-knob receipts', () => {
  it('timeResourcePoolBase matches beat-2 baseline (placeholder; solver-pinned in OL-737)', () => {
    expect(Number(balance.timeResourcePoolBase)).toBe(4000);
  });

  it('skillLevelDivisor held at the locked value', () => {
    expect(Number(balance.skillLevelDivisor)).toBe(100);
  });

  it('instinctXpRatio held at 0.01 — PK / incloneution baseline', () => {
    expect(Number(balance.instinctXpRatio)).toBe(0.01);
  });

  it('retention curve constants pinned for the design-assertion probe', () => {
    expect(Number(balance.retentionExponent)).toBeCloseTo(0.8);
    expect(Number(balance.retentionDivisor)).toBe(30);
  });

  it('loopResetEnabled defaults true — the demo always ships with reset enabled', () => {
    expect(balance.loopResetEnabled).toBe(true);
  });
});

describe('balance probe — content cardinality minimums', () => {
  it('skill registry meets two-tier minimum (≥ 4 skills)', () => {
    expect(skills.length).toBeGreaterThanOrEqual(4);
  });

  it('zone ladder meets minimum (≥ 3 zones with at least 2 gated)', () => {
    expect(zones.length).toBeGreaterThanOrEqual(3);
    expect(zones.filter((z) => z.requires.length > 0).length).toBeGreaterThanOrEqual(2);
  });

  it('action set covers every skill at least once', () => {
    const skillIds = new Set(skills.map((s) => s.id));
    const granted = new Set(actions.flatMap((a) => a.xpGrants.map((g) => g.skillId)));
    for (const id of skillIds) expect(granted.has(id)).toBe(true);
  });

  it('every zone has at least one action targeted at it', () => {
    const zoneIds = new Set(zones.map((z) => z.id));
    const targetedZones = new Set(actions.map((a) => a.zoneId));
    for (const id of zoneIds) expect(targetedZones.has(id)).toBe(true);
  });

  it('initial zone (Beginnersville) has empty `requires` so it boots unlocked', () => {
    expect(zones[0].requires).toHaveLength(0);
  });
});
