import { describe, it, expect } from 'vitest';
import {
  Decimal,
  Formula,
  createBooleanRequirement,
  createCostRequirement,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  type EngineModule,
  type Producer,
  type Purchasable,
  type Resource,
} from '@open-loop/engine';
import { ref } from 'vue';
import { bootTestEngine } from '@/test/bootTestEngine';
import {
  createProducerRow,
  createPurchasableCard,
  createPurchasableRow,
  readMaxAffordable,
  readPriceLines,
  readUnmet,
} from '../purchasable';

interface Def {
  id: string;
}

/**
 * A mill (repeatable, doubling price in gold, at most 3), a charter (one-shot,
 * gold, behind an owned mill), a quarry (one-shot, gold and stone) and a farm
 * (a producer of 2 gold/s per unit, doubling price in gold).
 */
function bootShop() {
  let gold!: Resource<Decimal>;
  let stone!: Resource<Decimal>;
  let get!: (id: string) => Purchasable;
  let farm!: Producer;
  const millOwned = ref(false);
  const mod: EngineModule = {
    id: 'test/shop',
    install(ctx) {
      gold = createResource(new Decimal(0), { id: 'gold', displayName: 'gold' });
      stone = createResource(new Decimal(0), { id: 'stone', displayName: 'stone' });
      const shop = createPurchasableCategory<Def>({
        id: 'shop',
        mapPurchasable: (def) => {
          if (def.id === 'mill')
            return {
              display: { title: 'Mill', description: 'Grinds.' },
              limit: 3,
              requirements: (level) =>
                createCostRequirement({
                  resource: gold,
                  cost: Formula.exponential(level, 10, 2),
                  maxBulkCount: Decimal.dInf,
                }),
            };
          if (def.id === 'charter')
            return {
              display: { description: 'Founds the town.' },
              limit: 1,
              requirements: [
                createBooleanRequirement({ met: () => millOwned.value, description: 'A mill' }),
                createCostRequirement({ resource: gold, cost: 5 }),
              ],
            };
          return {
            display: { description: 'Cuts stone.' },
            limit: 1,
            requirements: [
              createCostRequirement({ resource: gold, cost: 20 }),
              createCostRequirement({ resource: stone, cost: 3 }),
            ],
          };
        },
      });
      shop.register([{ id: 'mill' }, { id: 'charter' }, { id: 'quarry' }]);
      get = (id) => shop.getPurchasable(id)!;
      const fields = createProducerCategory<Def>({
        id: 'fields',
        mapProducer: () => ({
          resource: gold,
          baseRate: 2,
          trigger: 'continuous',
          purchase: { costResource: gold, baseCost: 10, costRatio: 2 },
        }),
        registerTick: ctx.onTick,
      });
      fields.register([{ id: 'farm' }]);
      farm = fields.getProducer('farm')!;
    },
  };
  bootTestEngine({ modules: [mod] });
  return { gold: () => gold, stone: () => stone, get, farm: () => farm, millOwned };
}

describe('readMaxAffordable', () => {
  it('is 0 when not one unit is affordable, not the floor of 1 countToPurchase gives', () => {
    const { get } = bootShop();
    expect(Number(readMaxAffordable(get('mill')))).toBe(0);
  });

  it('counts the units the resource covers, capped by the limit', () => {
    const { gold, get } = bootShop();
    gold().value = new Decimal(30); // 10 + 20
    expect(Number(readMaxAffordable(get('mill')))).toBe(2);
    gold().value = new Decimal(1000);
    expect(Number(readMaxAffordable(get('mill')))).toBe(3);
  });
});

describe('readPriceLines', () => {
  it('gives one line per cost requirement, priced for the next units and marked short', () => {
    const { gold, stone, get } = bootShop();
    gold().value = new Decimal(25);
    const lines = readPriceLines(get('quarry'));
    expect(lines.map((l) => [l.resource, Number(l.amount), l.short])).toEqual([
      [gold(), 20, false],
      [stone(), 3, true],
    ]);
  });

  it('prices a run of units', () => {
    const { get } = bootShop();
    expect(Number(readPriceLines(get('mill'), 2)[0].amount)).toBe(30);
  });
});

describe('readUnmet', () => {
  it('describes the unmet requirements that are not costs', () => {
    const { get, millOwned } = bootShop();
    expect(readUnmet(get('charter'))).toEqual(['A mill']);
    millOwned.value = true;
    expect(readUnmet(get('charter'))).toEqual([]);
  });

  it('does not count the limit as a prerequisite', () => {
    const { gold, get, millOwned } = bootShop();
    millOwned.value = true;
    gold().value = new Decimal(5);
    get('charter').purchase();
    expect(get('charter').maxed.value).toBe(true);
    expect(readUnmet(get('charter'))).toEqual([]);
  });
});

describe('createPurchasableRow', () => {
  it('maps a single-currency purchasable onto the row contract', () => {
    const { gold, get } = bootShop();
    const row = createPurchasableRow(get('mill'), { displayName: 'Mill' });
    expect(row.id).toBe('mill');
    expect(row.costLabel).toBe('gold');
    expect(Number(row.cost!(2))).toBe(30);
    expect(row.displayRate).toBeUndefined();

    gold().value = new Decimal(30);
    expect(Number(row.maxAffordable!.value)).toBe(2);
    expect(row.canPurchase(2)).toBe(true);
    expect(row.canPurchase(3)).toBe(false);

    row.purchase(2);
    expect(Number(row.count.value)).toBe(2);
  });

  it('leaves the price to the story when several resources pay', () => {
    const { get } = bootShop();
    const row = createPurchasableRow(get('quarry'), { displayName: 'Quarry' });
    expect(row.cost).toBeUndefined();
    expect(row.costLabel).toBeUndefined();
  });

  it('reports unmet prerequisites and routes purchase through a story verb', () => {
    const { get } = bootShop();
    const bought: number[] = [];
    const row = createPurchasableRow(get('charter'), {
      displayName: 'Charter',
      purchase: (n) => bought.push(Number(n)),
    });
    expect(row.unmet.value).toEqual(['A mill']);
    row.purchase(1);
    expect(bought).toEqual([1]);
  });
});

describe('createProducerRow', () => {
  it('counts owned units and shows the stack’s total rate', () => {
    const { gold, farm } = bootShop();
    const row = createProducerRow(farm(), { displayName: 'Farm' });
    gold().value = new Decimal(30);
    row.purchase(2);
    expect(Number(row.count.value)).toBe(2);
    expect(Number(row.displayRate!.value)).toBe(4);
    expect(row.costLabel).toBe('gold');
  });
});

describe('createPurchasableCard', () => {
  it('maps a one-shot onto the card contract, owned once maxed', () => {
    const { gold, get, millOwned } = bootShop();
    const card = createPurchasableCard(get('charter'), { displayName: 'Charter' });
    expect((card.description as () => string)()).toBe('Founds the town.');
    expect(Number(card.cost.value)).toBe(5);
    expect(card.costLabel).toBe('gold');
    expect(card.unmet.value).toEqual(['A mill']);
    expect(card.unlocked.value).toBe(true);

    millOwned.value = true;
    gold().value = new Decimal(5);
    expect(card.canPurchase.value).toBe(true);
    card.purchase();
    expect(card.owned.value).toBe(true);
  });
});
