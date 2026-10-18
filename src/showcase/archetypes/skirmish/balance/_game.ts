/**
 * Shared probe fixture, not runnable on its own. Builds a real skirmish engine with every
 * lieutenant hired, so the player's seat plays the shipping policy (`../modules/policy.ts`)
 * under `PLAYER_PERSONA`. That is the reference player: more automation than a
 * first-contract player has, because the probes measure the design under the policy the
 * spine assumes, not a human.
 *
 * This is not a duplicate of `../sim/harness.ts`: that boots the module list for
 * tick-by-tick behavioral specs; this plays whole matches and reads magnitudes.
 */

import type { Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  AutomationKey,
  CareerKey,
  MatchKey,
  createSkirmishModules,
  type AutomationApi,
  type CareerApi,
  type MatchApi,
} from '../modules';

/** Sim seconds per probe step. Minute-scale matches need no finer clock. */
export const TICK = 0.5;
/** A match still live after this long is a stall. */
export const MAX_MATCH_S = 1800;

export interface Game {
  engine: Engine;
  match: MatchApi;
  career: CareerApi;
  automation: AutomationApi;
  dispose(): void;
}

/** A fresh engine at the briefing of the first contract, with every lieutenant hired. */
export function buildGame(): Game {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createSkirmishModules()],
    persistenceNamespacePrefix: 'skirmish-probe',
  });
  const { engine } = handle;
  const automation = engine.tryInject(AutomationKey)!;
  for (const t of ['fixer', 'quartermaster', 'tactician']) automation.tiers.unlock(t);
  return {
    engine,
    match: engine.tryInject(MatchKey)!,
    career: engine.tryInject(CareerKey)!,
    automation,
    dispose: handle.dispose,
  };
}
