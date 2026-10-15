import { beforeEach, describe, expect, it } from 'vitest';
import { addResource, Decimal, toNumber } from '@open-loop/engine';
import { ORDER_LAPSE, RAW_EQ, type ResourceId } from '../data';
import { INTERVAL_RATE, boot, getEngine, tick, tickUntil } from '../sim/harness';
import { getEmpire } from './empire';
import { getExposition } from './exposition';
import { getMinistry } from './ministry';
import { InterlockerTuningRegistryKey } from './tuning';
import { getWorks } from './works';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Opens the sawpit, so the Ministry has spars to ask for, and offers come a second apart. */
function openSawpit(): void {
  const works = getWorks();
  getEngine()
    .tryInject(InterlockerTuningRegistryKey)!
    .pushOverrides('test', { 'ministry/orderPeriod': () => 2 });
  works.res.spruce.value = new Decimal(150);
  expect(toNumber(works.research.getPurchasable('sawpit')!.purchase(1))).toBe(1);
}

/** As if an Exposition had been staged: the Ministry orders from works that have shown. */
function shown(): void {
  addResource(getEmpire().renown, 1);
}

describe('the Ministry of War', () => {
  beforeEach(() => boot());

  it('orders nothing from works that have never shown at an Exposition', async () => {
    openSawpit();
    await tick(5 * INTERVAL_RATE);
    expect(getMinistry().orders.value).toHaveLength(0);
  });

  it('offers orders for the goods the open workshops make', async () => {
    openSawpit();
    shown();
    await tickUntil(() => getMinistry().orders.value.length > 0);
    const order = getMinistry().orders.value[0]!;
    expect(Object.keys(order.lines)).toEqual(['spars']);
  });

  it('takes an order in consignments, and moves it whole from the bins to the dossier', async () => {
    const works = getWorks();
    const ministry = getMinistry();
    openSawpit();
    shown();
    await tickUntil(() => ministry.orders.value.length > 0);
    const order = ministry.orders.value[0]!;
    const asked = order.lines.spars!;
    works.res.spars.value = new Decimal(Math.max(1, Math.floor(asked / 2)));
    if (asked > 1) {
      expect(ministry.deliver(order.id)).toBe(0);
      expect(num(works.res.spars)).toBe(0);
      expect(ministry.orders.value[0]!.filled.spars).toBeGreaterThan(0);
    }
    works.res.spars.value = new Decimal(asked);
    // Consignments leave the bins as they are sent; the dossier scores the order whole.
    expect(ministry.deliver(order.id)).toBe(asked * RAW_EQ.spars);
    expect(ministry.dossier.value).toBe(asked * RAW_EQ.spars);
    expect(ministry.orders.value.find((o) => o.id === order.id)).toBeUndefined();
  });

  it('lets an order lapse, and its consignments with it', async () => {
    const ministry = getMinistry();
    openSawpit();
    shown();
    await tickUntil(() => ministry.orders.value.length > 0);
    const id = ministry.orders.value[0]!.id;
    await tick((ORDER_LAPSE + 1) * INTERVAL_RATE);
    expect(ministry.orders.value.find((o) => o.id === id)).toBeUndefined();
    expect(ministry.dossier.value).toBe(0);
  });

  it('clears the dossier and the orders standing with the Exposition', async () => {
    const works = getWorks();
    const ministry = getMinistry();
    openSawpit();
    shown();
    await tickUntil(() => ministry.orders.value.length > 0);
    ministry.dossier.value = 5000;
    getEngine()
      .tryInject(InterlockerTuningRegistryKey)!
      .pushOverrides('test', { 'expo/threshold': () => 1, 'expo/jurySitting': () => 0 });
    for (const r of ['aeroplanes'] as ResourceId[]) works.res[r].value = new Decimal(1);
    expect(getExposition().stage()).toBeGreaterThan(0);
    expect(ministry.dossier.value).toBe(0);
    expect(ministry.orders.value).toHaveLength(0);
  });
});
