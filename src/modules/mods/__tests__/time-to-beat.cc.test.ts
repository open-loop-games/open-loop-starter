/**
 * Engine-vs-sim dual-entry correctness — cc-authentic fixture (OL-426).
 *
 * Sibling of time-to-beat.test.ts. Split into its own file because both
 * fixtures install the Cookie Factory content wiring in process-global
 * persistent contexts, so they can't co-exist in one vitest worker.
 */
import { bootCC } from '@/test/harness';
import {
  producers,
  upgrades,
  achievements,
} from '@/modules/mods/cc-authentic/content';
import { runTimeToBeatSuite } from './time-to-beat-helpers';

runTimeToBeatSuite({
  name: 'cc-authentic',
  boot: bootCC,
  producerDefs: producers,
  upgradeDefs: upgrades,
  achievementDefs: achievements,
});
