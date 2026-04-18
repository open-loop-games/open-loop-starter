/**
 * Per-faction upgrade tree tests (OL-510).
 *
 * Validates that `grants` bind onto the target chain with attribution, that
 * the declarative effect compounds per level, and that costs scale per the
 * configured `costScaling`.
 *
 * One upgrade system built in `beforeAll` — same persistent-context-collision
 * workaround as goals.test.ts.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import {
  addResource,
  createModifierChain,
  createResource,
  Decimal,
  type DecimalSource,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import { createUpgradeSystem, type UpgradeChains, type UpgradeSystem } from '../upgrades';
import {
  FACTION_IDS,
  UPGRADE_DEFS,
  type FactionId,
  type UpgradeTarget,
} from '../content';

function buildChains(): UpgradeChains {
  const kinds: UpgradeTarget[] = ['yield', 'spread', 'attack', 'defense'];
  const out = {} as UpgradeChains;
  for (const kind of kinds) {
    const row = {} as Record<FactionId, ModifierChain>;
    for (const f of FACTION_IDS) row[f] = createModifierChain(`upgrades-test/${f}/${kind}`);
    out[kind] = row;
  }
  return out;
}

describe('upgrade system', () => {
  let essence: Record<FactionId, Resource<DecimalSource>>;
  let chains: UpgradeChains;
  let upgrades: UpgradeSystem;

  beforeAll(() => {
    essence = {} as Record<FactionId, Resource<DecimalSource>>;
    for (const f of FACTION_IDS) essence[f] = createResource<DecimalSource>(0);
    chains = buildChains();
    upgrades = createUpgradeSystem({ essence, chains });
  });

  it('registers one purchasable per upgrade def per faction', () => {
    for (const f of FACTION_IDS) {
      const cat = upgrades.categoriesByFaction[f];
      expect(cat.size).toBe(UPGRADE_DEFS.length);
      for (const def of UPGRADE_DEFS) {
        expect(cat.getPurchasable(def.id)).toBeDefined();
      }
    }
  });

  it('yield upgrade binds to the faction yield chain at register with attribution', () => {
    // Declarative grants are installed at register time; `bought` gates the
    // binding's `active` predicate, so the modifier is present in bindings()
    // from the start but only contributes to apply() once purchased.
    const bindings = chains.yield.red.bindings();
    const yieldBinding = bindings.find((b) => {
      const d = b.modifier.description;
      const resolved = typeof d === 'function' ? d() : d;
      return resolved?.text === 'Efficient Extraction';
    });
    expect(yieldBinding).toBeDefined();
  });

  it('unpurchased yield upgrade leaves the chain at identity', () => {
    // Green hasn't been touched by prior tests. Each faction has its own
    // chain + category, so other factions' purchases don't bleed in.
    expect(Number(chains.yield.green.apply(10))).toBe(10);
  });

  it('purchased yield upgrade activates its binding; chain apply reflects the multiplier', async () => {
    const yieldUp = upgrades.get('red', 'yield')!;
    addResource(essence.red, 1000);
    expect(yieldUp.canPurchase.value).toBe(true);
    yieldUp.purchase();
    await nextTick();

    const def = UPGRADE_DEFS.find((d) => d.id === 'yield')!;
    const expected = Math.pow(1 + Number(def.perLevel), Number(yieldUp.amount.value));
    expect(Number(chains.yield.red.apply(1))).toBeCloseTo(expected, 4);
  });

  it('upgrade multiplier compounds per level: (1 + perLevel)^amount', async () => {
    const def = UPGRADE_DEFS.find((d) => d.id === 'spread')!;
    const spreadUp = upgrades.get('blue', 'spread')!;
    addResource(essence.blue, 1_000_000);

    // Buy twice — cost scales as baseCost × costScaling^level, so we need
    // headroom. Purchase one at a time so the cost closure re-reads amount.
    spreadUp.purchase();
    await nextTick();
    spreadUp.purchase();
    await nextTick();

    const levels = Number(spreadUp.amount.value);
    expect(levels).toBe(2);

    const expected = Math.pow(1 + Number(def.perLevel), levels);
    const actual = Number(chains.spread.blue.apply(1));
    expect(actual).toBeCloseTo(expected, 4);
  });

  it('unbought upgrade contributes nothing to its chain', () => {
    // Green hasn't bought any attack upgrade — attack chain is identity.
    expect(Number(chains.attack.green.apply(10))).toBe(10);
  });

  it('cost scales as baseCost × costScaling^level', () => {
    const def = UPGRADE_DEFS.find((d) => d.id === 'defense')!;
    const defenseUp = upgrades.get('yellow', 'defense')!;

    // At level 0, exactly `baseCost` essence affords one purchase; one short
    // does not. After purchasing, the next unit costs `baseCost × costScaling`.
    essence.yellow.value = Decimal.sub(def.baseCost, 1);
    expect(defenseUp.canPurchase.value).toBe(false);

    essence.yellow.value = def.baseCost;
    expect(defenseUp.canPurchase.value).toBe(true);
    defenseUp.purchase();

    const nextCost = Decimal.mul(def.baseCost, def.costScaling);
    essence.yellow.value = Decimal.sub(nextCost, 1);
    expect(defenseUp.canPurchase.value).toBe(false);

    essence.yellow.value = nextCost;
    expect(defenseUp.canPurchase.value).toBe(true);
  });
});
