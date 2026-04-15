/**
 * Shared helpers for the time-to-beat dual-entry tests. The CF and
 * cc-authentic fixtures live in separate test files because persistent
 * contexts are process-global and booting both in one worker collides;
 * vitest's default per-file isolation gives each fixture a clean process.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Decimal } from 'open-loop-engine';
import { calculateBeatTiming } from 'open-loop-sim';
import { reset, tick } from '@/test/harness';
import type {
  CFProducerDef,
  CFUpgradeDef,
  CFAchievementDef,
} from '@/modules/mods/cookie-factory/content';
import type { CookieFactoryState } from '@/modules/mods/cookie-factory';

export const SAMPLE_OWNED = [1, 10, 25];
export const RELATIVE_BAND = 1e-6;

/**
 * Mirror of installCookieFactoryContent's rate wiring. Feeds the same
 * fully-stacked per-unit rate into calculateBeatTiming that the engine's
 * rate chain produces at runtime. Includes per-producer upgrades,
 * per-producer achievements, and global achievements — the latter live
 * on productionChain and apply to every producer equally.
 */
export function stackedRate(
  producer: CFProducerDef,
  upgrades: CFUpgradeDef[],
  achievements: CFAchievementDef[],
  owned: number,
  cookies: number,
): number {
  let rate = producer.baseRate;
  for (const u of upgrades) {
    if (u.target !== producer.id) continue;
    rate *= 1 + u.limit * u.perLevel;
  }
  for (const a of achievements) {
    if (a.target === producer.id && owned >= a.threshold) {
      rate *= a.bonus;
    } else if (a.target === 'global' && cookies >= a.threshold) {
      rate *= a.bonus;
    }
  }
  return rate;
}

export interface Fixture {
  name: string;
  boot: () => CookieFactoryState;
  producerDefs: CFProducerDef[];
  upgradeDefs: CFUpgradeDef[];
  achievementDefs: CFAchievementDef[];
}

export function runTimeToBeatSuite(fixture: Fixture): void {
  describe(`time-to-beat dual-entry — ${fixture.name}`, () => {
    let state: CookieFactoryState;

    beforeAll(() => {
      state = fixture.boot();
    });

    beforeEach(() => {
      reset(state);
      state.cookies.value = Decimal.fromNumber(1e308);
      // Drive every upgrade to its declared limit. purchaseMax() stopped
      // one short in spot-checks (amountToPurchase seems to return
      // limit - amount - 1 for some limit interpretations), so write the
      // backing amount directly — the scalingAmount watcher syncs sync
      // and the effect computed re-reads on next access.
      for (const up of state.upgrades) {
        up.amount.value = up.limit;
      }
    });

    for (const owned of SAMPLE_OWNED) {
      for (const def of fixture.producerDefs) {
        it(`${def.id} at owned=${owned}`, async () => {
          const entry = state.producers.getEntry(def.id)!;
          // producer.count is a ComputedRef reflecting repeatable.amount,
          // so drive the underlying persistent ref directly.
          entry.producer.repeatable!.amount.value = Decimal.fromNumber(owned);

          // Tick once so achievement watchers flush — global cookie-total
          // and per-producer thresholds earn reactively, not synchronously.
          await tick(1);

          const live = entry.producer.purchaseBeatSeconds.value;
          const closed = calculateBeatTiming({
            baseCost: def.baseCost,
            costMultiplier: def.costScaling,
            baseProduction: stackedRate(
              def,
              fixture.upgradeDefs,
              fixture.achievementDefs,
              owned,
              1e308,
            ),
            quantity: Math.max(1, owned),
            level: owned,
          }).toNumber();

          expect(Number.isFinite(live)).toBe(true);
          expect(Number.isFinite(closed)).toBe(true);
          const relError = Math.abs(live - closed) / closed;
          expect(relError).toBeLessThan(RELATIVE_BAND);
        });
      }
    }
  });
}
