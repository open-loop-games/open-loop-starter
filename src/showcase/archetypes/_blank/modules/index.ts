import type { EngineModule } from '@open-loop/engine';

/**
 * The blank game has no game modules of its own — `bootEngine` still installs
 * the shared base (settings, ui-prefs, ui-registry), so the engine boots with
 * working saves and settings. A fork adds its modules here as it grows.
 */
export function createGameModules(): EngineModule[] {
  return [];
}
