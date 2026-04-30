import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOPER_DATA } from '../data';

const { balance, actions, zones, capabilities, progressVars, regularVars } = DEFAULT_LOOPER_DATA;

/**
 * Math-only regression locks — milliseconds, no engine boot. The balance
 * leaf (OL-746) re-pins these against solver-converged values; placeholder
 * numbers acceptable until then.
 */
describe('balance probe — solver-knob receipts', () => {
  it('initialMana held at vanilla canonical 250 (OL-782 reverted OL-770 rung-1 retune)', () => {
    expect(Number(balance.initialMana)).toBe(250);
  });

  it('costDivisor held at vanilla canonical 100', () => {
    expect(Number(balance.costDivisor)).toBe(100);
  });

  it('talentAccrualRatio held at 0.01 — vanilla canonical (1% Level → Talent)', () => {
    expect(Number(balance.talentAccrualRatio)).toBe(0.01);
  });

  it('loopResetEnabled defaults true', () => {
    expect(balance.loopResetEnabled).toBe(true);
  });
});

describe('balance probe — content cardinality minimums', () => {
  it('capability registry locked at 4 (single-axis canonical)', () => {
    expect(capabilities.length).toBe(4);
  });

  it('zone count locked at 2 (Hearth + Wilds — UI grouping only)', () => {
    expect(zones.length).toBe(2);
  });

  it('progressVar registry: 4 total, 2 per zone', () => {
    expect(progressVars.length).toBe(4);
    for (const zone of zones) {
      const inZone = progressVars.filter((p) => p.zoneId === zone.id);
      expect(inZone.length).toBe(2);
    }
  });

  it('regularVar registry: ≥1 per progressVar (some shared via multi-axis scaling)', () => {
    expect(regularVars.length).toBeGreaterThanOrEqual(progressVars.length);
  });

  it('action set covers every capability via `weights` at least once', () => {
    const capIds = new Set(capabilities.map((c) => c.id));
    const weighted = new Set(actions.flatMap((a) => Object.keys(a.weights)));
    for (const id of capIds) expect(weighted.has(id)).toBe(true);
  });

  it('every action-type variant is exercised', () => {
    const types = new Set(actions.map((a) => a.type));
    expect(types.has('progress')).toBe(true);
    expect(types.has('regular')).toBe(true);
    expect(types.has('basic')).toBe(true);
  });

  it('every progressVar has ≥1 progress-type action targeting it', () => {
    const targeted = new Set(
      actions.filter((a) => a.type === 'progress').map((a) => a.progressVarId),
    );
    for (const pv of progressVars) expect(targeted.has(pv.id)).toBe(true);
  });

  it('every regularVar has ≥1 regular-type action checking against it', () => {
    const checked = new Set(actions.filter((a) => a.type === 'regular').map((a) => a.regularVarId));
    for (const rv of regularVars) expect(checked.has(rv.id)).toBe(true);
  });

  it('manapot frame: ≥1 regular action grants mana via rewardEffects', () => {
    const manaGranters = actions.filter(
      (a) => a.type === 'regular' && a.rewardEffects.some((e) => e.kind === 'add-mana'),
    );
    expect(manaGranters.length).toBeGreaterThanOrEqual(1);
  });

  it('gold↔mana exchange frame: ≥1 regular action grants gold AND ≥1 basic action spends gold for mana', () => {
    const goldGranters = actions.filter(
      (a) => a.type === 'regular' && a.rewardEffects.some((e) => e.kind === 'add-gold'),
    );
    const goldSpenders = actions.filter(
      (a) =>
        a.type === 'basic' &&
        a.completionEffects?.some((e) => e.kind === 'spend-gold') &&
        a.completionEffects?.some((e) => e.kind === 'exchange-gold-to-mana'),
    );
    expect(goldGranters.length).toBeGreaterThanOrEqual(1);
    expect(goldSpenders.length).toBeGreaterThanOrEqual(1);
  });
});

describe('balance probe — gold↔mana exchange algebraic identity', () => {
  // Per archetypes/looper.md § 6 row `gold-mana-exchange-correctness`:
  // `manaAdded = goldSpent × exchangeMult` per completion of the basic
  // exchange. The dispatcher in modules/actions.ts snapshots pre-batch gold
  // before applying completionEffects, so spend-gold/exchange ordering
  // doesn't affect the identity. This receipt locks the identity by
  // construction: every basic exchange action carries `spend-gold: 'all'`
  // followed by `exchange-gold-to-mana`, and a positive exchangeMult.
  it('every gold→mana exchange action declares spend-gold:all + exchange-gold-to-mana with a positive exchangeMult', () => {
    const exchanges = actions.filter(
      (a): a is typeof a & { type: 'basic' } =>
        a.type === 'basic' &&
        !!a.completionEffects?.some((e) => e.kind === 'exchange-gold-to-mana'),
    );
    expect(exchanges.length).toBeGreaterThanOrEqual(1);
    for (const action of exchanges) {
      const effects = action.completionEffects ?? [];
      const spendIdx = effects.findIndex((e) => e.kind === 'spend-gold');
      const exchangeIdx = effects.findIndex((e) => e.kind === 'exchange-gold-to-mana');
      expect(spendIdx).toBeGreaterThanOrEqual(0);
      expect(exchangeIdx).toBeGreaterThanOrEqual(0);
      const spend = effects[spendIdx];
      if (spend.kind === 'spend-gold') {
        expect(spend.amount).toBe('all');
      }
      expect(action.exchangeMult).toBeDefined();
      expect(Number(action.exchangeMult!)).toBeGreaterThan(0);
    }
  });
});

describe('balance probe — prereq graph shape', () => {
  it('exercises all five ActionPrereq variants across the action set', () => {
    const variants = new Set<string>();
    for (const action of actions) {
      if (!action.prereqs) {
        variants.add('always-implicit');
        continue;
      }
      for (const prereq of action.prereqs) variants.add(prereq.kind);
    }
    expect(variants.has('always-implicit')).toBe(true);
    expect(variants.has('action-completion-count')).toBe(true);
    expect(variants.has('capability-tier-level')).toBe(true);
    expect(variants.has('progress-var-level')).toBe(true);
    expect(variants.has('loop-count')).toBe(true);
  });

  it('every prereq references a defined action / capability / progressVar id', () => {
    const actionIds = new Set(actions.map((a) => a.id));
    const capIds = new Set(capabilities.map((c) => c.id));
    const progressVarIds = new Set(progressVars.map((p) => p.id));
    for (const action of actions) {
      if (!action.prereqs) continue;
      for (const prereq of action.prereqs) {
        if (prereq.kind === 'action-completion-count') {
          expect(actionIds.has(prereq.actionId)).toBe(true);
        } else if (prereq.kind === 'capability-tier-level') {
          expect(capIds.has(prereq.capabilityId)).toBe(true);
        } else if (prereq.kind === 'progress-var-level') {
          expect(progressVarIds.has(prereq.progressVarId)).toBe(true);
        }
      }
    }
  });
});

describe('balance probe — multi-axis scaling shape', () => {
  it('every progressVar `scales` entry references a defined regularVar id', () => {
    const regularVarIds = new Set(regularVars.map((r) => r.id));
    for (const pv of progressVars) {
      for (const scale of pv.scales) {
        expect(regularVarIds.has(scale.regularVarId)).toBe(true);
      }
    }
  });

  it('multi-axis scaling exists — ≥1 regularVar has ≥2 progressVar contributors', () => {
    const contributorCount = new Map<string, number>();
    for (const pv of progressVars) {
      for (const scale of pv.scales) {
        contributorCount.set(
          scale.regularVarId,
          (contributorCount.get(scale.regularVarId) ?? 0) + 1,
        );
      }
    }
    const multiAxis = [...contributorCount.values()].filter((n) => n >= 2);
    expect(multiAxis.length).toBeGreaterThanOrEqual(1);
  });
});
