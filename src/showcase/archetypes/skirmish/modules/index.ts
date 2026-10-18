import type { EngineModule } from '@open-loop/engine';
import { automationModule } from './automation';
import { careerModule } from './career';
import { matchModule } from './match';
import { rivalModule } from './rival';
import { tuningModule } from './tuning';

export * from './automation';
export * from './career';
export * from './match';
export * from './tuning';

/**
 * The skirmish modules in dependency order: the tunables; the career, which outlasts every
 * match; the match with both seats and the districts between them; the rival seat; the
 * player's lieutenants.
 */
export function createSkirmishModules(): EngineModule[] {
  return [tuningModule, careerModule, matchModule, rivalModule, automationModule];
}
