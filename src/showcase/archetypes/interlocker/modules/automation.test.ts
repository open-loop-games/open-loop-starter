import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import {
  BUREAUX,
  BUREAU_COST,
  CHARTERS,
  type BureauId,
  type ResearchId,
  type ResourceId,
} from '../data';
import { INTERVAL_RATE, boot, getEngine, tick } from '../sim/harness';
import { getAutomation } from './automation';
import { getEmpire } from './empire';
import { InterlockerTuningRegistryKey } from './tuning';
import { getWorks } from './works';

/** Grants every charter, so the bureaux open, and employs every bureau up to `bureau`. */
function employ(bureau: BureauId): void {
  const empire = getEmpire();
  for (const c of CHARTERS) empire.charters.getPurchasable(c.id)!.count.value = 1;
  for (const b of BUREAUX.slice(0, BUREAUX.findIndex((x) => x.id === bureau) + 1)) {
    empire.renown.value = new Decimal(BUREAU_COST[b.id]);
    expect(toNumber(empire.bureaux.getPurchasable(b.id)!.purchase(1))).toBe(1);
  }
}

/** Opens the sawpit, so a trade has seats. */
function openSawpit(): void {
  const works = getWorks();
  works.res.spruce.value = new Decimal(150);
  expect(toNumber(works.research.getPurchasable('sawpit')!.purchase(1))).toBe(1);
}

describe('the foreman’s bureaux', () => {
  beforeEach(() => boot());

  it('open only once every charter is held', () => {
    const empire = getEmpire();
    const seating = empire.bureaux.getPurchasable('seating')!;
    expect(seating.visible.value).toBe(false);
    for (const c of CHARTERS) empire.charters.getPurchasable(c.id)!.count.value = 1;
    expect(seating.visible.value).toBe(true);
  });

  it('are employed in order, each after the last', () => {
    const empire = getEmpire();
    for (const c of CHARTERS) empire.charters.getPurchasable(c.id)!.count.value = 1;
    empire.renown.value = new Decimal(1e6);
    expect(empire.bureaux.getPurchasable('estate')!.canPurchase.value).toBe(false);
    expect(toNumber(empire.bureaux.getPurchasable('seating')!.purchase(1))).toBe(1);
    expect(empire.bureaux.getPurchasable('estate')!.canPurchase.value).toBe(true);
  });

  it('leave the compagnons idle until Le Contremaître is employed', async () => {
    const works = getWorks();
    openSawpit();
    await tick(3 * INTERVAL_RATE);
    expect(works.workersIdle.value).toBe(works.workersTotal.value);

    employ('seating');
    expect(getAutomation().tiers.hasReached('seating')).toBe(true);
    // A full bin, so the purse lets the trade draw on it.
    works.res.spruce.value = new Decimal(Math.floor(works.cap.spruce.value));
    await tick(3 * INTERVAL_RATE);
    expect(toNumber(works.crew.sawyer.value)).toBeGreaterThan(0);
  });

  it('stop when the player switches a bureau off', async () => {
    const works = getWorks();
    openSawpit();
    employ('seating');
    getAutomation().active.seating.value = false;
    works.res.spruce.value = new Decimal(Math.floor(works.cap.spruce.value));
    await tick(3 * INTERVAL_RATE);
    expect(works.workersIdle.value).toBe(works.workersTotal.value);
  });

  it('let the Académie’s secretary patent the path when funds allow', async () => {
    const works = getWorks();
    employ('academie');
    works.res.spruce.value = new Decimal(150);
    await tick(2 * INTERVAL_RATE);
    expect(works.researched('sawpit').value).toBe(true);
  });
});

describe('Le Contremaître and steam', () => {
  beforeEach(() => boot());

  it('seats no machinists in an engine shop the boilers cannot power', async () => {
    const works = getWorks();
    getEngine()
      .tryInject(InterlockerTuningRegistryKey)!
      .pushOverrides('test', { 'storage/fillSeconds': () => 1500 });
    for (const id of ['sawpit', 'concession', 'hall', 'steam'] as ResearchId[]) {
      for (const [r, cap] of Object.entries(works.cap))
        works.res[r as ResourceId].value = new Decimal(Math.floor(cap.value));
      expect(toNumber(works.research.getPurchasable(id)!.purchase(1))).toBe(1);
    }
    for (const [r, cap] of Object.entries(works.cap))
      works.res[r as ResourceId].value = new Decimal(Math.floor(cap.value));
    works.assign('machinist', 1);
    employ('seating');
    await tick(4 * INTERVAL_RATE);
    expect(toNumber(works.crew.machinist.value)).toBe(0);
  });
});
