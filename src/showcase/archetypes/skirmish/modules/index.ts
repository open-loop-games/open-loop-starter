import type { EngineModule } from '@open-loop/engine';
import { automationModule } from './automation';
import { rosterModule } from './roster';
import { matchModule } from './match';
import { rivalModule } from './rival';
import { tuningModule } from './tuning';

export * from './automation';
export * from './roster';
export * from './match';
export * from './tuning';

/**
 * The skirmish modules in dependency order: the tunables; the roster, which picks the next
 * rival; the match with both seats and the districts between them; the rival seat; the
 * player's lieutenants.
 */
export function createSkirmishModules(): EngineModule[] {
  return [tuningModule, rosterModule, matchModule, rivalModule, automationModule];
}
