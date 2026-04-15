/**
 * Engine-vs-sim dual-entry correctness — cc-authentic fixture (OL-426).
 *
 * Sibling of time-to-beat.test.ts. Kept in its own file per vitest
 * convention, though with namespaced `bootMod` handles the two fixtures
 * could also coexist in one worker.
 */
import { bootCC } from '@/test/cookie-factory/accessors';
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
