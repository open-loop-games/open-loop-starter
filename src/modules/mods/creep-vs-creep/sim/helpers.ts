/**
 * Sim-test helpers for the Director sim suite (OL-611).
 *
 * Two responsibilities:
 *
 * 1. Engine construction. `buildDirectorEngine()` spins up a creep-vs-creep
 *    engine with the same module set as production, plus optional vars
 *    overrides for probe perturbation. Tests build a fresh engine per run so
 *    persistent state doesn't bleed across cases.
 *
 * 2. Player-side automation. The mod's AI drives only non-player factions
 *    (`ai.ts:174`); without help the player has no goals and no meta-upgrade
 *    purchases, which makes every beat past #1 unreachable. The
 *    `setupAuto*` helpers wire the missing player behaviour for sim runs.
 *
 * Helpers are intentionally narrow — each one targets a specific beat or
 * probe shape rather than trying to be a generic player AI.
 */

import {
  Decimal,
  createEngine,
  setupAutoPurchase,
  type Engine,
  type EngineModule,
} from 'open-loop-engine';
import { CreepWarfareKey, createCreepWarfareModule, type CreepWarfareState } from '../index';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import type { DirectorVars, DirectorVarsOverride } from '../vars';
import type { FactionId, MetaUpgradeId } from '../content';

/** Convert sim-minutes to sim-seconds, the unit `runUntil` measures in. */
export const minutes = (m: number): number => m * 60;

// `process` is a Node global — Vitest runs under Node, but the project lacks
// `@types/node`, so declare the slice we use to keep typecheck clean.
declare const process: { env: Record<string, string | undefined> } | undefined;

/**
 * True when the suite was launched with `SIM_PROBES=1` (e.g. via
 * `pnpm test:sim`). Used by long-running probe + bench files to opt into
 * execution without bloating the default `pnpm test` runtime.
 */
export const simProbesEnabled = (): boolean =>
  typeof process !== 'undefined' && process.env.SIM_PROBES === '1';

export interface BuiltEngine {
  engine: Engine;
  state: CreepWarfareState;
  vars: DirectorVars;
}

/**
 * Construct + start a creep-vs-creep engine with the production module set.
 *
 * `varsOverride` patches the merged Director vars after the mod's own
 * theme/balance overrides — same shape `loadCreepVsCreepVars` accepts.
 * `endOfRoundCountdownSec` defaults to 0 here so rounds chain back-to-back
 * without 30-sim-sec dead intervals between them; that keeps multi-round
 * beat windows aligned with the archetype spec's wall-time targets.
 */
export function buildDirectorEngine(
  varsOverride: DirectorVarsOverride = {},
  options: { gameIdSuffix?: string } = {},
): BuiltEngine {
  const merged: DirectorVarsOverride = {
    ...varsOverride,
    archetype: {
      endOfRoundCountdownSec: 0,
      ...(varsOverride.archetype ?? {}),
    },
  };
  const modules: EngineModule[] = [
    settingsModule,
    uiRegistryModule,
    createCreepWarfareModule(merged),
  ];
  const engine = createEngine({
    gameId: `creep-sim${options.gameIdSuffix ? `-${options.gameIdSuffix}` : ''}`,
    tickRate: 20,
    persistence: false,
    persistenceNamespace: `sim-${Math.random().toString(36).slice(2)}`,
    mods: [{ id: 'solo', name: 'solo', modules, description: '' }],
  });
  engine.selectMod('solo');
  engine.start();
  const state = engine.tryInject(CreepWarfareKey)!;
  return { engine, state, vars: state.vars };
}

// =============================================================================
// State readouts
//
// Director state surfaces the archetype spec references (`territoryShare`,
// `territoryRank`, `roundCount`) aren't first-class refs — they're computed
// from grid + system internals. Sized for sim-test consumption (called
// per-tick from a predicate or once per assertion); not an attempt at a
// generalised readouts pattern. That's a separate question (OL-616).
// =============================================================================

/** Cell-count owned by each faction. Walks the full grid. */
export function ownership(state: CreepWarfareState): Record<FactionId, number> {
  const counts: Record<FactionId, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  const g = state.grid.grid;
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const o = g.at(x, y).owner;
      if (o !== null) counts[o]++;
    }
  }
  return counts;
}

/** Fraction of the map each faction owns. */
export function territoryShare(state: CreepWarfareState): Record<FactionId, number> {
  const counts = ownership(state);
  const total = state.grid.grid.width * state.grid.grid.height;
  const out = {} as Record<FactionId, number>;
  for (const f of state.factions) out[f] = total > 0 ? counts[f] / total : 0;
  return out;
}

/** True if the player has the highest territory of any faction at the moment of call. */
export function playerLeads(state: CreepWarfareState): boolean {
  const counts = ownership(state);
  const player = state.vars.archetype.playerFaction;
  const playerCount = counts[player];
  for (const f of state.factions) {
    if (f === player) continue;
    if (counts[f] > playerCount) return false;
  }
  return playerCount > 0;
}

/** Number of completed rounds (`round.seed.value` starts at 1, increments per `startNextRound`). */
export function roundCount(state: CreepWarfareState): number {
  return state.round.seed.value - 1;
}

/** Level of one meta-upgrade. Returns 0 if not yet purchased. */
export function metaLevel(state: CreepWarfareState, id: MetaUpgradeId): number {
  const p = state.meta.get(id);
  return p ? Number(Decimal.floor(p.amount.value as never)) : 0;
}

// =============================================================================
// Player-side automation
//
// Sim runs need the player faction to actually do *something*. The mod's
// production AI excludes the player on purpose (it's the human's seat); for
// tests we wire equivalent automation under `setup*` helpers. Each beat picks
// the strategy that matches its assertion intent — beat 4/7 want a slot-cap
// saver (greedy `purchaseMax` would starve the expensive ratchet), beat 6
// wants a single-target buyer, beats 2 + 5 are happy with broad auto-buy.
// =============================================================================

/**
 * Re-select the player's slot-1 goal at every round start so chain bindings
 * survive the round reset (slot selections live under `slot:goals-{f}` and
 * are wiped by the reset policy). Picks `claim:hotspot-hs-center` — the
 * highest-yield neutral hotspot, a sensible default direction.
 */
export function setupAutoPlayerGoals(state: CreepWarfareState, engine: Engine): () => void {
  const player = state.vars.archetype.playerFaction;
  const slot = state.goals.slots[player];
  const targetId = 'claim:hotspot-hs-center' as const;
  const reselect = () => {
    if (!slot.selected.value.includes(targetId)) {
      slot.select(targetId);
    }
  };
  reselect();
  let lastSeed = state.round.seed.value;
  return engine.loop.onTick(() => {
    if (state.round.seed.value !== lastSeed) {
      lastSeed = state.round.seed.value;
      reselect();
    }
  });
}

/**
 * Greedy auto-buy on every meta-upgrade. Spends meta-currency on whatever's
 * affordable each tick. Suitable for "any meta-upgrade > 0" beats; not
 * suitable for slot-capacity-target beats — the ratchet is more expensive
 * than the chain upgrades so it gets starved.
 */
export function setupAutoMetaGreedy(state: CreepWarfareState, engine: Engine): () => void {
  const purchasables = state.meta.category.getAll().map((e) => e.purchasable);
  return setupAutoPurchase(purchasables, true, (cb) => engine.loop.onTick(cb));
}

/**
 * Save-and-buy on a single named meta-upgrade. Other upgrades are ignored,
 * so the saver can accumulate enough for expensive ratchet levels.
 */
export function setupAutoMetaSingle(
  state: CreepWarfareState,
  engine: Engine,
  id: MetaUpgradeId,
): () => void {
  return engine.loop.onTick(() => {
    const p = state.meta.get(id);
    if (p?.canPurchase.value) p.purchase();
  });
}
