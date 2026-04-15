/**
 * Headless Cookie Factory harness — boots a real engine for vitest.
 *
 * CF-only by design. Generalization to an archetype-agnostic `bootMod` is
 * deferred until a second consumer exists (OL-427). Keeping the surface
 * small here means the correctness test in time-to-beat.test.ts can import
 * a pair of clean boot functions instead of a switching helper.
 */
import { vi } from 'vitest';
import {
  Decimal,
  createEngine,
  type Engine,
  type EngineModule,
} from 'open-loop-engine';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import { cookieFactoryModule, CookieFactoryKey, type CookieFactoryState } from '@/modules/mods/cookie-factory';
import { ccAuthenticModule } from '@/modules/mods/cc-authentic';

vi.stubGlobal('performance', globalThis.performance ?? { now: () => Date.now() });

// Persistent contexts are process-global, so at most one fixture may boot
// per vitest worker. Tests that need both the CF and cc-authentic fixtures
// split into separate files — vitest's default per-file isolation gives
// each a clean process.
let engine: Engine | null = null;

function bootWith(contentModule: EngineModule): CookieFactoryState {
  if (engine) {
    throw new Error(
      'Engine already booted in this worker — split tests across files to boot a second fixture',
    );
  }
  engine = createEngine({
    gameId: 'cf-test',
    persistence: false,
    tickRate: 20,
  });
  engine.use(settingsModule);
  engine.use(uiRegistryModule);
  engine.use(contentModule);
  engine.start();
  const state = engine.tryInject(CookieFactoryKey);
  if (!state) throw new Error('Cookie Factory state not provided after start()');
  return state;
}

export function bootCF(): CookieFactoryState {
  return bootWith(cookieFactoryModule);
}

export function bootCC(): CookieFactoryState {
  return bootWith(ccAuthenticModule);
}

/**
 * Reset a booted fixture to a clean, automation-off state. Zeroes cookies
 * and producer counts, clears achievements, disables auto-buy toggles.
 * Call in beforeEach to isolate test cases without re-booting the engine.
 */
export function reset(state: CookieFactoryState): void {
  state.autoBuyProducers.value = false;
  state.autoBuyUpgrades.value = false;
  state.cookies.value = Decimal.dZero;
  for (const entry of state.producers.getAll()) {
    const repeatable = entry.producer.repeatable;
    if (repeatable) repeatable.amount.value = Decimal.dZero;
  }
  for (const up of state.upgrades) {
    up.amount.value = Decimal.dZero;
  }
  for (const { achievement } of state.achievements.getAll()) {
    achievement.earned.value = false;
  }
}

/** Advance the engine by n real ticks. Async to flush queued microtasks. */
export async function tick(n = 1): Promise<void> {
  if (!engine) throw new Error('No engine booted — call bootCF() or bootCC() first');
  for (let i = 0; i < n; i++) {
    engine.loop.stepOnce();
    await Promise.resolve();
  }
}

export async function tickUntil(
  condition: () => boolean,
  maxTicks = 50_000,
): Promise<number> {
  if (!engine) throw new Error('No engine booted — call bootCF() or bootCC() first');
  for (let i = 0; i < maxTicks; i++) {
    if (condition()) return i;
    engine.loop.stepOnce();
    await Promise.resolve();
  }
  throw new Error(`tickUntil timed out after ${maxTicks} ticks`);
}
