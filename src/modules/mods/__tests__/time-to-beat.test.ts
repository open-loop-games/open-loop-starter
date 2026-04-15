/**
 * Engine-live-vs-closed-form correctness — Cookie Factory fixture.
 *
 * Asserts the engine's live `producer.purchaseBeatSeconds` matches the
 * closed-form `calculateBeatTiming` across every (producer × owned) sample.
 * Both sides compute `Cost(n) / Production(n)` with break_eternity, so
 * divergence should be rounding noise — the 1e-6 relative band catches any
 * real drift (OL-426).
 *
 * The cc-authentic fixture lives in time-to-beat.cc.test.ts because
 * persistent contexts are process-global and vitest isolates workers
 * per file by default.
 */
import { bootCF } from '@/test/cookie-factory/accessors';
import {
  producers,
  upgrades,
  achievements,
} from '@/modules/mods/cookie-factory/content';
import { runTimeToBeatSuite } from './time-to-beat-helpers';

runTimeToBeatSuite({
  name: 'Cookie Factory',
  boot: bootCF,
  producerDefs: producers,
  upgradeDefs: upgrades,
  achievementDefs: achievements,
});
