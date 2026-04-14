/**
 * cc-authentic — Cookie Clicker calibration fixture, dev-gated.
 *
 * Reuses cookieFactoryModule's install wiring (via installCookieFactoryContent)
 * with CC's exact constants. Sharing wiring is deliberate: cc-authentic's
 * job is to measure engine drift via different *constants*, not different
 * *composition* — if the wiring diverged, the test would be measuring CF's
 * wiring decisions instead of the engine.
 *
 * Picker-gated behind `import.meta.env.DEV` in src/modules/index.ts so it
 * never ships in production bundles.
 */
import type { EngineModule, EngineContext } from 'open-loop-engine';
import { installCookieFactoryContent } from '@/modules/mods/cookie-factory';
import { producers, upgrades, achievements } from './content';

export const ccAuthenticModule: EngineModule = {
  id: 'cc-authentic',
  dependencies: ['settings', 'ui-registry'],
  install(ctx: EngineContext) {
    installCookieFactoryContent(ctx, { producers, upgrades, achievements });
  },
};
