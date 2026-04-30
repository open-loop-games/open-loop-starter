import { Decimal, type Engine } from 'open-loop-engine';
import {
  ActionsKey,
  ArcKey,
  CapabilitiesKey,
  GoldKey,
  InitialManaKey,
  LoopKey,
  ManaAddedKey,
  ManaKey,
  ProgressVarsKey,
  QueueKey,
  RegularVarsKey,
} from '../modules';
import type { ArcBeatProbe, BeatProbe } from '@/balance';

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * § 4 windows in seconds. Lifted from `archetypes/looper.md` § 4. One source
 * of truth for both flow-probe snapshot midpoints and arc-probe spec windows.
 *
 * Beats 6 + 7 cluster in 25–60 min per § 4's ordering note — predicate timing
 * within the cluster depends on player plan focus (talent-grinder vs
 * explore-grinder). The windows below are the doc's suggested initial
 * targets; expect the solver (leaf 4) to shift some of them — record
 * material moves in commit notes and sync `archetypes/looper.md` § 4 to
 * match per BALANCING.md § Retune vs reshape → "move the phase".
 *
 * Verify-only set lives in `solve.ts:VERIFY_ONLY_BEATS` — beat-1, beat-3,
 * beat-6 are content-shape-determined (xp curves, action ticks, prereq
 * web), not knob-tunable. Sim-verified under converged proposals but not
 * bisected against. If a verify-only beat lands out-of-window, the
 * resolution surface is content rebalance, not solver extension.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(10)],
  // Widened from 45s to 60s during OL-770's rung-1 retune. Under (γ)
  // chunked Pass-5 (OL-768) with farm-mana-pool's canonical
  // {roam:2, trail:2} target and chunkSize=4, the first loop fits
  // trainers (300 ticks) + 1 roam-chunk (600 ticks) = 900 ticks = 45s
  // exact at 20 TPS. 45s leaves zero headroom for engine-lag, pushing
  // sim-truth to 48s and out of [10, 45]. The 60s upper bound is the
  // "move the phase" retune per BALANCING.md — preserves the "first
  // loop ends" semantic with margin for the (γ)-induced structural
  // floor. Ordering with B3 [30s, 2m00s] preserved.
  'beat-2': [sec(10), sec(60)],
  // Lower bound 30s → 10s after OL-805 reground: Roam at 250 mana is a
  // single-action first loop; roam.level=1 lands at end of loop 0 (~0:14
  // sim-time) under the canonical bootstrap arc, well before the prior
  // 30s floor. Upper bound preserved.
  'beat-3': [sec(10), min(2)],
  'beat-4': [min(1), min(4)],
  'beat-5': [min(3), min(10)],
  'beat-6': [min(25), min(55)],
  'beat-7': [min(30), min(60)],
  'beat-8': [min(60), min(120)],
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Snapshot points for the flow-probe — taken at each beat's window midpoint
 * so per-probe pacing reflects the player's likely state during that beat,
 * not its earliest or latest moment.
 */
export const FLOW_BEATS: BeatProbe[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
}));

/**
 * Predicates for arc-probe. § 4 triggers, decoded for the headless sim-bot
 * (queue-driven plan execution under the canonical content set):
 *
 * - 1: `queue.current !== null AND mana < initialMana` — queue is ticking
 *   and mana has dropped below the pool baseline. Onboarding signal.
 * - 2: `loop.count >= 1` — first reset cycle completed.
 * - 3: any progressVar `level >= 1` — first persistent-progress tick (Roam
 *   1% or Acquaint 1% under canonical content).
 * - 4: `manaAdded > 0` — first manapot harvest extends the per-loop pool.
 *   Triggered by the first regular-action good-check granting `add-mana`.
 * - 5: `actionCompletedAtLeast('trade', 1)` — first basic exchange (gold→mana)
 *   completed. Trade is the canonical bridge action carrying both
 *   `spend-gold` and `add-mana` completion effects.
 * - 6: any capability `talent.level >= 1` AND `loop.count >= 2`. The "loop
 *   N+1 first-N actions faster than loop N" multi-loop comparison from § 4
 *   is a sim-time invariant the solver verifies under the bot drive; the
 *   beat predicate captures the necessary state condition.
 * - 7: any wilds-zone action `timesCompleted >= 1` — first cross-zone action
 *   completed. Zone-gating is per-action prereq web (zones are
 *   `initiallyUnlocked: all` per `modules/zones.ts`); "second zone reached"
 *   operationalizes as content engagement, not zone-system unlock.
 * - 8: `loop.count >= 5 AND avgTalentMult > 1.05 AND any wilds action
 *   completed` — multi-axis compounding visible. Reuses `ArcKey`'s
 *   `averageTalentMultiplier` computed; conjuncts the wilds-completion check
 *   directly because the arc-module's zone-unlock guard is a no-op under
 *   `initiallyUnlocked: all` data.
 */
export const ARC_BEATS: ArcBeatProbe[] = [
  {
    id: 'beat-1',
    specWindow: BEAT_WINDOWS['beat-1']!,
    predicate: (engine) => queueTickingAndManaDrained(engine),
  },
  {
    id: 'beat-2',
    specWindow: BEAT_WINDOWS['beat-2']!,
    predicate: (engine) => loopCountAtLeast(engine, 1),
  },
  {
    id: 'beat-3',
    specWindow: BEAT_WINDOWS['beat-3']!,
    predicate: (engine) => anyProgressVarLevelAtLeast(engine, 1),
  },
  {
    id: 'beat-4',
    specWindow: BEAT_WINDOWS['beat-4']!,
    predicate: (engine) => manaAddedAtLeast(engine, 1),
  },
  {
    id: 'beat-5',
    specWindow: BEAT_WINDOWS['beat-5']!,
    predicate: (engine) => actionCompletedAtLeast(engine, 'trade', 1),
  },
  {
    id: 'beat-6',
    specWindow: BEAT_WINDOWS['beat-6']!,
    predicate: (engine) => anyCapabilityTalentAtLeast(engine, 1) && loopCountAtLeast(engine, 2),
  },
  {
    id: 'beat-7',
    specWindow: BEAT_WINDOWS['beat-7']!,
    predicate: (engine) => anyActionInZoneCompleted(engine, 'wilds', 1),
  },
  {
    id: 'beat-8',
    specWindow: BEAT_WINDOWS['beat-8']!,
    predicate: (engine) =>
      loopCountAtLeast(engine, 5) &&
      averageTalentMultiplierAtLeast(engine, 1.05) &&
      anyActionInZoneCompleted(engine, 'wilds', 1),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────
//
// Archetype-scoped per beats.ts convention — promote to `src/balance/` only
// when a second archetype hand-rolls the same shape. The looper-shaped
// predicates (capability talent levels, action completion counts, progressVar
// levels, regularVar totals) are candidates for an idle-loops-style
// fork-extension corpus; mark with `TODO(expansion)` if a sibling appears.

function queueTickingAndManaDrained(engine: Engine): boolean {
  const queue = engine.tryInject(QueueKey);
  const mana = engine.tryInject(ManaKey);
  const initialMana = engine.tryInject(InitialManaKey);
  if (!queue || !mana || !initialMana) return false;
  return queue.current.value !== null && Decimal.lt(mana.value, initialMana.value);
}

function loopCountAtLeast(engine: Engine, n: number): boolean {
  const loop = engine.tryInject(LoopKey);
  return loop ? loop.count.value >= n : false;
}

function manaAddedAtLeast(engine: Engine, n: number): boolean {
  const manaAdded = engine.tryInject(ManaAddedKey);
  return manaAdded ? Decimal.gte(manaAdded.value, n) : false;
}

function manaAtLeast(engine: Engine, n: number): boolean {
  const mana = engine.tryInject(ManaKey);
  return mana ? Decimal.gte(mana.value, n) : false;
}

function goldAtLeast(engine: Engine, n: number): boolean {
  const gold = engine.tryInject(GoldKey);
  return gold ? Decimal.gte(gold.value, n) : false;
}

function actionCompletedAtLeast(engine: Engine, actionId: string, n: number): boolean {
  const actions = engine.tryInject(ActionsKey);
  return actions ? actions.getTimesCompleted(actionId) >= n : false;
}

function anyActionInZoneCompleted(engine: Engine, zoneId: string, n: number): boolean {
  const actions = engine.tryInject(ActionsKey);
  if (!actions) return false;
  for (const def of actions.getAll()) {
    if (def.zoneId !== zoneId) continue;
    if (actions.getTimesCompleted(def.id) >= n) return true;
  }
  return false;
}

function capabilityLevelAtLeast(engine: Engine, capabilityId: string, n: number): boolean {
  const capabilities = engine.tryInject(CapabilitiesKey);
  const state = capabilities?.getState(capabilityId);
  return state ? Decimal.gte(state.level.level.value, n) : false;
}

function anyCapabilityTalentAtLeast(engine: Engine, n: number): boolean {
  const capabilities = engine.tryInject(CapabilitiesKey);
  if (!capabilities) return false;
  for (const entry of capabilities.getAll()) {
    if (Decimal.gte(entry.state.talent.level.value, n)) return true;
  }
  return false;
}

function capabilityTalentAtLeast(engine: Engine, capabilityId: string, n: number): boolean {
  const capabilities = engine.tryInject(CapabilitiesKey);
  const state = capabilities?.getState(capabilityId);
  return state ? Decimal.gte(state.talent.level.value, n) : false;
}

function averageTalentMultiplierAtLeast(engine: Engine, threshold: number): boolean {
  const arc = engine.tryInject(ArcKey);
  return arc ? arc.averageTalentMultiplier.value > threshold : false;
}

function progressVarLevelAtLeast(engine: Engine, progressVarId: string, n: number): boolean {
  const progressVars = engine.tryInject(ProgressVarsKey);
  const state = progressVars?.getState(progressVarId);
  return state ? Decimal.gte(state.level.level.value, n) : false;
}

function anyProgressVarLevelAtLeast(engine: Engine, n: number): boolean {
  const progressVars = engine.tryInject(ProgressVarsKey);
  if (!progressVars) return false;
  for (const entry of progressVars.getAll()) {
    if (Decimal.gte(entry.state.level.level.value, n)) return true;
  }
  return false;
}

function regularVarTotalAtLeast(engine: Engine, regularVarId: string, n: number): boolean {
  const regularVars = engine.tryInject(RegularVarsKey);
  const state = regularVars?.getState(regularVarId);
  return state ? Decimal.gte(state.total.value, n) : false;
}

export {
  queueTickingAndManaDrained,
  loopCountAtLeast,
  manaAddedAtLeast,
  manaAtLeast,
  goldAtLeast,
  actionCompletedAtLeast,
  anyActionInZoneCompleted,
  capabilityLevelAtLeast,
  capabilityTalentAtLeast,
  anyCapabilityTalentAtLeast,
  averageTalentMultiplierAtLeast,
  progressVarLevelAtLeast,
  anyProgressVarLevelAtLeast,
  regularVarTotalAtLeast,
};
