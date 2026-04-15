/**
 * Cookie Factory accessor pack — typed wrappers over `bootMod` plus a
 * shared `reset` helper. cc-authentic reuses this because it installs the
 * same `CookieFactoryKey` shape with different constants.
 *
 * This is the CF-specific layer; the archetype-agnostic skeleton is
 * `src/test/bootMod.ts`. New archetypes ship their own accessor pack
 * alongside themselves.
 */
import { Decimal, type EngineModule } from 'open-loop-engine';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import {
  cookieFactoryModule,
  CookieFactoryKey,
  type CookieFactoryState,
} from '@/modules/mods/cookie-factory';
import { ccAuthenticModule } from '@/modules/mods/cc-authentic';
import { bootMod, type BootHandle } from '@/test/bootMod';

export interface CFBoot {
  handle: BootHandle;
  state: CookieFactoryState;
}

function bootWith(contentModule: EngineModule, prefix: string): CFBoot {
  const handle = bootMod({
    modules: [settingsModule, uiRegistryModule, contentModule],
    namespacePrefix: prefix,
  });
  const state = handle.engine.tryInject(CookieFactoryKey);
  if (!state) {
    handle.dispose();
    throw new Error(`Cookie Factory state not provided after start() for ${prefix}`);
  }
  return { handle, state };
}

export function bootCF(): CFBoot {
  return bootWith(cookieFactoryModule, 'cf');
}

export function bootCC(): CFBoot {
  return bootWith(ccAuthenticModule, 'cc');
}

/**
 * Reset a booted fixture to a clean, automation-off state. Zeroes cookies
 * and producer counts, clears achievements, disables auto-buy toggles.
 * Call in `beforeEach` to isolate test cases without re-booting.
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
