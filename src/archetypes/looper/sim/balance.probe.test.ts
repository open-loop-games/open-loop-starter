import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOPER_DATA } from '../data';

const { balance, actions, zones, capabilities } = DEFAULT_LOOPER_DATA;

/**
 * Math-only regression locks — milliseconds, no engine boot. The balance
 * leaf (OL-746) re-pins these against solver-converged values; placeholder
 * numbers acceptable until then.
 */
describe('balance probe — solver-knob receipts', () => {
  it('initialMana matches vanilla canonical 250-tick baseline', () => {
    expect(Number(balance.initialMana)).toBe(250);
  });

  it('costDivisor held at vanilla canonical 100', () => {
    expect(Number(balance.costDivisor)).toBe(100);
  });

  it('talentAccrualRatio held at 0.01 — vanilla canonical (1% Level → Talent)', () => {
    expect(Number(balance.talentAccrualRatio)).toBe(0.01);
  });

  it('loopResetEnabled defaults true — the demo always ships with reset enabled', () => {
    expect(balance.loopResetEnabled).toBe(true);
  });
});

describe('balance probe — content cardinality minimums', () => {
  it('capability registry meets minimum (≥ 4 capabilities)', () => {
    expect(capabilities.length).toBeGreaterThanOrEqual(4);
  });

  it('zone ladder meets minimum (≥ 3 zones, all initially visible)', () => {
    expect(zones.length).toBeGreaterThanOrEqual(3);
    // Zones are UI grouping only — no per-zone gating field; per-action
    // prereqs handle bridge-action visibility instead.
  });

  it('action set covers every capability via `weights` at least once', () => {
    const capIds = new Set(capabilities.map((c) => c.id));
    const weighted = new Set(actions.flatMap((a) => Object.keys(a.weights)));
    for (const id of capIds) expect(weighted.has(id)).toBe(true);
  });

  it('every zone has at least one action targeted at it', () => {
    const zoneIds = new Set(zones.map((z) => z.id));
    const targetedZones = new Set(actions.map((a) => a.zoneId));
    for (const id of zoneIds) expect(targetedZones.has(id)).toBe(true);
  });
});

describe('balance probe — prereq graph shape', () => {
  it('exercises all four ActionPrereq variants across the action set', () => {
    const variants = new Set<string>();
    for (const action of actions) {
      if (!action.prereqs) {
        // Unguarded actions are the implicit "always" variant.
        variants.add('always-implicit');
        continue;
      }
      for (const prereq of action.prereqs) {
        variants.add(prereq.kind);
      }
    }
    expect(variants.has('always-implicit')).toBe(true);
    expect(variants.has('action-completion-count')).toBe(true);
    expect(variants.has('capability-tier-level')).toBe(true);
    expect(variants.has('loop-count')).toBe(true);
  });

  it('every prereq references a defined action / capability id', () => {
    const actionIds = new Set(actions.map((a) => a.id));
    const capIds = new Set(capabilities.map((c) => c.id));
    for (const action of actions) {
      if (!action.prereqs) continue;
      for (const prereq of action.prereqs) {
        if (prereq.kind === 'action-completion-count') {
          expect(actionIds.has(prereq.actionId)).toBe(true);
        } else if (prereq.kind === 'capability-tier-level') {
          expect(capIds.has(prereq.capabilityId)).toBe(true);
        }
      }
    }
  });
});
