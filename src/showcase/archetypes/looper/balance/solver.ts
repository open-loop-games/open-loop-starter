/**
 * Looper balance — decision-point search over queue mutation timelines.
 *
 * Per `archetypes/BALANCING-looper.md § Engine harness — fork from save
 * point, fan out` and § Decision-point detection: the search target is the
 * **queue mutation timeline**, not a per-loop template menu. Most loops
 * re-run the prior queue verbatim; the solver only branches at decision
 * points when the cross-loop state shifts in a way that should change the
 * queue (a `good` banks, an action just unlocked, banked mana surplus
 * crossed a feasibility threshold).
 *
 * The expansion primitive is the blob-rooted tree of saves: at each
 * decision point, `importSave(parent.postBlob)` restores the engine,
 * `setSchedule([candidateQueue])` loads a one-mutation candidate, then
 * `runUntil` rolls forward until the next decision point or goal fire.
 * `exportSave` captures the post-rollout blob — that becomes the next
 * node's frozen parent.
 *
 * Two search algorithms share the same expansion machinery:
 *
 *   - **A\*** with `h = 0` (uniform-cost / Dijkstra) over the decision-
 *     point tree. Closed-set dedup by state hash keeps trajectories that
 *     converge on roughly-the-same state from re-expanding. A useful
 *     admissible heuristic for REACH_FOREST_1 is hard to write tightly
 *     under talent compounding — the prototype runs `h=0` and lets beam
 *     answer "is heuristic-driven pruning worth its complexity here?"
 *   - **Beam(W)** ranks frontier nodes by score (forest-progress-weighted)
 *     and keeps the top W per generation. Simpler, no optimality guarantee,
 *     useful as a cost/quality comparison against A\*.
 *
 * Decision-point branching keeps the search tree small even when the
 * trajectory is dozens of loops long. Per `PROGRESSION.md § Regime
 * transitions`, REACH_FOREST_1 spans the bootstrap → mana-economy →
 * unlock-cascade arc (likely 30-80 loops at canonical settings); the
 * decision points along that arc are ~3-6 in number with 2-4 one-mutation
 * candidates each.
 *
 * Operator generator scope (REACH_FOREST_1 prototype): pots-first economy
 * + wander progress + Explore Forest cliff. Pick Locks / Buy Mana / Wild
 * Mana detours are explicitly skipped — the prototype's job is "find a
 * valid trajectory", not "find the optimal trajectory." See
 * BALANCING-looper.md § Algorithm choice for the verdict-shape this
 * prototype feeds.
 */

import { runUntil, type Engine, type RunUntilResult } from '@open-loop/engine';
import {
  getProgressLevel,
  getRegularGood,
  getRegularVar,
  getLoopCount,
  isActionVisible,
  getActionDef,
} from '../modules';
import { BalanceBotControlKey, type LoopQueue } from './bot';
import { evaluateGoal, type Goal } from './goals';

// ─── Cross-loop state snapshot + brackets ────────────────────────────────

/**
 * Coarse-bucketed cross-loop state. The raw fields drive scoring and the
 * search's progress checks; the *brackets* drive rollout-termination
 * decision points and closed-set dedup.
 *
 * Brackets are intentionally coarse — two trajectories with `potsGood = 2`
 * and `potsGood = 3` reach roughly the same regime, so collapsing them into
 * one bracket prunes duplicate expansions. Crossing a bracket boundary is
 * the trigger; the candidate menu is state-conditional on the brackets,
 * not on which one crossed last.
 */
export interface LooperState {
  wander: number;
  forest: number;
  potsGood: number;
  /** Approx banked mana surplus available in the next loop = goodTemp × 50. */
  estManaSurplus: number;
  loopCount: number;
}

export function snapshotState(): LooperState {
  const pots = getRegularVar('pots');
  return {
    wander: getProgressLevel('wander'),
    forest: getProgressLevel('forest'),
    potsGood: getRegularGood('pots'),
    estManaSurplus: pots.good.value * 50,
    loopCount: getLoopCount().value,
  };
}

/** Coarse bracket of wander level: bootstrap (0-2) / mid (3-4) / unlocked (5+). */
function wanderBracket(w: number): number {
  if (w < 3) return 0;
  if (w < 5) return 1;
  return 2;
}

/** Coarse bracket of pots.good: 0 / 1-2 / 3-4 / 5+. */
function potsGoodBracket(g: number): number {
  if (g === 0) return 0;
  if (g <= 2) return 1;
  if (g <= 4) return 2;
  return 3;
}

/** Coarse bracket of forest level: 0 / ≥1. Goal lives on the transition. */
function forestBracket(f: number): number {
  return f >= 1 ? 1 : 0;
}

function hashState(s: LooperState): string {
  return `w${wanderBracket(s.wander)}|f${forestBracket(s.forest)}|pg${potsGoodBracket(s.potsGood)}`;
}

// ─── Decision-point triggers (bracket transitions) ───────────────────────

/**
 * Decision-point trigger fires when any state bracket changes since the
 * start of the current rollout. Bracket transitions correspond to
 * meaningful state regimes — wander unlock cliffs (0-2 → 3-4 → 5+),
 * mana-economy ladder (potsGood 0 → 1-2 → 3-4 → 5+), and the goal
 * threshold (forest 0 → ≥1).
 *
 * Bracket-transition triggers are *idempotent*: each transition fires
 * exactly once when crossed, but later state-bracket events still fire
 * their own triggers. The prior 'one-shot' design (one trigger per
 * threshold cross) couldn't continue search past `wander-crosses-5` when
 * Explore Forest's 400-mana cost still didn't fit — Pots-good banking
 * past good=2 needed its own decision points to bump smash-slot K and
 * re-attempt. Bracket-based triggers reach those decision points
 * naturally.
 *
 * Trigger naming reflects the bracket that changed; `expand()` uses the
 * trigger id + current state to choose the candidate menu.
 */
export function detectBracketTrigger(prev: LooperState): string | null {
  const cur = snapshotState();
  const wB = wanderBracket(cur.wander);
  const fB = forestBracket(cur.forest);
  const gB = potsGoodBracket(cur.potsGood);
  if (forestBracket(prev.forest) !== fB) return 'forest-bracket';
  if (wanderBracket(prev.wander) !== wB) return 'wander-bracket';
  if (potsGoodBracket(prev.potsGood) !== gB) return 'pots-good-bracket';
  return null;
}

// ─── Operator generator (state-aware queue replacements) ─────────────────

/**
 * Mutation operator = wholesale queue replacement at a decision point. The
 * realized REACH_FOREST_1 mutation menu is small enough (3 triggers × 2-3
 * candidates each ≤ 27 leaf trajectories) that explicit named operators
 * read better than a parameterized ADD/REMOVE/CHANGE/SPLIT taxonomy. The
 * named-operator approach is the prototype's deliberate simplification;
 * the full taxonomy from `BALANCING-looper.md § Mutation operators` is
 * the follow-up after the algorithm-choice verdict settles.
 */
export type Operator =
  | { kind: 'stay' }
  | { kind: 'switch-to-pure-smash' }
  | { kind: 'switch-to-smash-first'; smashCount: number }
  | { kind: 'append-explore-forest' };

function applyOperator(queue: LoopQueue, op: Operator, state: LooperState): LoopQueue | null {
  switch (op.kind) {
    case 'stay':
      return queue;
    case 'switch-to-pure-smash':
      return [{ actionId: 'smash-pots', repeats: 50 }];
    case 'switch-to-smash-first': {
      // Smash-first hybrid: smash slot ahead of wander. K = good + offset.
      return [
        { actionId: 'smash-pots', repeats: op.smashCount },
        { actionId: 'wander', repeats: 1 },
      ];
    }
    case 'append-explore-forest': {
      const def = getActionDef('explore-forest');
      if (!def || !isActionVisible(def)) return null;
      if (queue.some((q) => q.actionId === 'explore-forest')) return null;
      // Once wander has unlocked Forest, Wander itself isn't load-bearing
      // for this trajectory — its 250-mana drain would consume the smash-
      // banked surplus that Explore Forest's 400 cost needs. The Explore
      // Forest loop drops Wander and sizes smash-K to bank exactly enough
      // surplus: `[Smash × K, Explore Forest × 1]` yields net mana of
      // `250 + 50·K` (every smash either burns goodTemp at +50 net or
      // chips an unchecked at −50, but the operator sizes K = potsGood so
      // every smash burns goodTemp; surplus = 50·K). For 400-cost forest,
      // need 50·K ≥ 150, so K ≥ 3 — practically pg ≥ 3.
      return [
        { actionId: 'smash-pots', repeats: state.potsGood },
        { actionId: 'explore-forest', repeats: 1 },
      ];
    }
  }
}

/**
 * Generate candidate one-mutation operators against `currentQueue`. The
 * menu is state-conditional, not trigger-conditional — the trigger that
 * fired just told the solver to evaluate now; what's actually worth
 * trying depends on the regime the state lands in.
 *
 * Regime rules (REACH_FOREST_1):
 *   - bootstrap (wander < 3): no useful mutation, only `stay`.
 *   - wander ≥ 3 ∧ potsGood = 0: try switching to pure-smash to bank the
 *     first good; `stay` keeps wandering.
 *   - potsGood ≥ 1 and queue is pure-smash: flip to smash-first hybrid.
 *   - smash-first regime ∧ wander < 5: tune smash-slot K to current good
 *     (good+1 or good+2); `stay` accepts current K.
 *   - wander ≥ 5 ∧ forest = 0: try appending Explore Forest with bumped
 *     smash-slot K (good+2 surplus targets 400-mana cost); `stay` continues
 *     banking more goods first.
 */
function generateCandidates(
  currentQueue: LoopQueue,
  state: LooperState,
): Array<{ op: Operator; queue: LoopQueue }> {
  const ops: Operator[] = [];
  const wB = wanderBracket(state.wander);
  const fB = forestBracket(state.forest);
  const hasSmash = currentQueue.some((q) => q.actionId === 'smash-pots');
  const hasWander = currentQueue.some((q) => q.actionId === 'wander');

  if (fB === 1) {
    // Goal regime — nothing to mutate.
    return [];
  }

  if (wB === 0) {
    // Bootstrap; only stay.
    ops.push({ kind: 'stay' });
  } else if (state.potsGood === 0 && !hasSmash) {
    // Wander ≥ 3 but no goods banked — try pure-smash detour.
    ops.push({ kind: 'switch-to-pure-smash' }, { kind: 'stay' });
  } else if (state.potsGood >= 1 && !hasWander) {
    // Pure-smash with goods banked — flip to smash-first hybrid.
    ops.push(
      { kind: 'switch-to-smash-first', smashCount: state.potsGood + 1 },
      { kind: 'switch-to-smash-first', smashCount: state.potsGood + 2 },
      { kind: 'stay' },
    );
  } else if (wB === 1 && hasSmash && hasWander) {
    // Smash-first regime, still building wander. Tune K to current good.
    ops.push(
      { kind: 'switch-to-smash-first', smashCount: state.potsGood + 1 },
      { kind: 'switch-to-smash-first', smashCount: state.potsGood + 2 },
      { kind: 'stay' },
    );
  } else if (wB === 2 && state.forest === 0) {
    // Forest unlocked — try the goal action, or bank more first.
    ops.push({ kind: 'append-explore-forest' }, { kind: 'stay' });
  } else {
    ops.push({ kind: 'stay' });
  }

  const out: Array<{ op: Operator; queue: LoopQueue }> = [];
  for (const op of ops) {
    const q = applyOperator(currentQueue, op, state);
    if (q !== null) out.push({ op, queue: q });
  }
  return out;
}

// ─── Search node ──────────────────────────────────────────────────────────

export interface SearchNode {
  parent: SearchNode | null;
  /** The queue that ran during this node's rollout (post-mutation). */
  queue: LoopQueue;
  /** Operator that produced this queue from the parent's queue. */
  op: Operator | null;
  /** Engine save blob captured after this node's rollout. */
  postBlob: string;
  /** Cross-loop state read off the engine post-rollout. */
  state: LooperState;
  /** Sim-seconds elapsed during this node's rollout (NOT cumulative). */
  rolloutSimTime: number;
  /** Cumulative sim-seconds from root to this node. */
  g: number;
  /** Did the goal predicate fire during or at the end of this rollout? */
  goalReached: boolean;
  /** What ended the rollout: 'decision-point' | 'goal' | 'budget' | 'unreachable'. */
  rolloutTermination: string;
  depth: number;
}

// ─── Problem definition ──────────────────────────────────────────────────

export interface SearchProblem {
  engine: Engine;
  initialBlob: string;
  goal: Goal;
  initialQueue: LoopQueue;
  /** Per-rollout maxSimTime cap (seconds). Caps a runaway loop. */
  perRolloutBudget: number;
  /** Total trajectory sim-time cap = goal.budgetSec. */
  totalBudget: number;
  /** Hard caps for the search itself (not the simulation). */
  maxNodes: number;
  maxWallMs: number;
  /**
   * tickDelta for runUntil. Must divide every action's manaCost evenly
   * given tickRate=20: per-tick drain = tickRate × tickDelta. Smash Pots
   * costs 50 mana, so tickDelta=1 (20-mana ticks) overshoots smash to
   * 60-effective-cost and breaks the goodTemp banking math. tickDelta=0.5
   * gives 10-mana ticks: smash exactly 50, Explore Forest exactly 400.
   */
  tickDelta: number;
}

// ─── Rollout primitive ───────────────────────────────────────────────────

/**
 * Restore the engine to `parent.postBlob`, set the candidate queue, and
 * roll forward until any terminator fires:
 *   - goal predicate (success — return goalReached: true)
 *   - decision-point trigger (return goalReached: false, more search needed)
 *   - per-rollout budget cap (runaway loop)
 *   - total-trajectory sim-time cap (cumulative g + this rollout > totalBudget)
 *
 * Returns a freshly-allocated `SearchNode`. The caller decides whether to
 * dedup it against the closed set or push it onto the frontier.
 */
function rollout(
  problem: SearchProblem,
  parent: SearchNode,
  candidateQueue: LoopQueue,
  op: Operator,
): SearchNode {
  const { engine } = problem;
  const importResult = engine.saveManager!.importSave(parent.postBlob);
  if (!importResult.success) {
    throw new Error('rollout: importSave failed');
  }

  const control = engine.tryInject(BalanceBotControlKey);
  if (!control) throw new Error('rollout: BalanceBotControlKey not provided');
  control.setSchedule([candidateQueue]);

  const stateAtStart = snapshotState();
  let goalReached = false;
  let rolloutTermination = 'budget';

  const remainingBudget = problem.totalBudget - parent.g;
  const cap = Math.min(problem.perRolloutBudget, Math.max(0, remainingBudget));

  const result: RunUntilResult = runUntil({
    engine,
    until: () => {
      if (evaluateGoal(problem.goal.predicate, engine)) {
        goalReached = true;
        rolloutTermination = 'goal';
        return true;
      }
      const trigger = detectBracketTrigger(stateAtStart);
      if (trigger !== null) {
        rolloutTermination = 'bracket';
        return true;
      }
      return false;
    },
    maxSimTime: cap,
    tickDelta: problem.tickDelta,
  });

  const postState = snapshotState();
  const postBlob = engine.saveManager!.exportSave();

  if (!goalReached && result.terminated !== 'predicate') {
    rolloutTermination = 'budget';
  }

  return {
    parent,
    queue: candidateQueue,
    op,
    postBlob,
    state: postState,
    rolloutSimTime: result.elapsedSimulated,
    g: parent.g + result.elapsedSimulated,
    goalReached,
    rolloutTermination,
    depth: parent.depth + 1,
  };
}

// ─── Root node ───────────────────────────────────────────────────────────

function rootNode(problem: SearchProblem): SearchNode {
  // Apply the initial queue at the root; this gives us the first rollout
  // segment from t=0 until the first decision point fires (or goal fires).
  const { engine } = problem;
  const result = engine.saveManager!.importSave(problem.initialBlob);
  if (!result.success) throw new Error('rootNode: importSave failed');

  const control = engine.tryInject(BalanceBotControlKey);
  if (!control) throw new Error('rootNode: BalanceBotControlKey not provided');
  control.setSchedule([problem.initialQueue]);

  const initialState = snapshotState();
  let goalReached = false;
  let rolloutTermination = 'budget';

  const run = runUntil({
    engine,
    until: () => {
      if (evaluateGoal(problem.goal.predicate, engine)) {
        goalReached = true;
        rolloutTermination = 'goal';
        return true;
      }
      const trigger = detectBracketTrigger(initialState);
      if (trigger !== null) {
        rolloutTermination = 'bracket';
        return true;
      }
      return false;
    },
    maxSimTime: problem.totalBudget,
    tickDelta: problem.tickDelta,
  });

  return {
    parent: null,
    queue: problem.initialQueue,
    op: null,
    postBlob: engine.saveManager!.exportSave(),
    state: snapshotState(),
    rolloutSimTime: run.elapsedSimulated,
    g: run.elapsedSimulated,
    goalReached,
    rolloutTermination,
    depth: 0,
  };
}

// ─── Expansion ───────────────────────────────────────────────────────────

/**
 * Expand `node` by generating one-mutation candidates against its decision-
 * point trigger and rolling each forward. Returns the children; the caller
 * decides which to push onto the frontier and how to rank them.
 */
function expand(problem: SearchProblem, node: SearchNode): SearchNode[] {
  if (node.goalReached) return [];
  if (node.rolloutTermination !== 'bracket') return [];

  const candidates = generateCandidates(node.queue, node.state);
  const children: SearchNode[] = [];
  for (const { op, queue } of candidates) {
    children.push(rollout(problem, node, queue, op));
  }
  return children;
}

// ─── Trajectory reconstruction ───────────────────────────────────────────

export function trajectoryFor(leaf: SearchNode): LoopQueue[] {
  const trail: LoopQueue[] = [];
  let cur: SearchNode | null = leaf;
  while (cur !== null) {
    trail.unshift(cur.queue);
    cur = cur.parent;
  }
  return trail;
}

// ─── Search result ───────────────────────────────────────────────────────

export interface SearchResult {
  found: boolean;
  trajectory: LoopQueue[];
  /** Cumulative sim-time of the winning trajectory (Infinity if not found). */
  totalSimTime: number;
  /** Number of nodes the search popped from the frontier and expanded. */
  nodesExpanded: number;
  /** Number of nodes the search generated (sum of children across expansions). */
  nodesGenerated: number;
  /** Wall-clock milliseconds spent. */
  wallTimeMs: number;
  /** Why the search stopped: 'goal' | 'exhausted' | 'budget' | 'walltime'. */
  termination: string;
}

// ─── A* (h = 0) ──────────────────────────────────────────────────────────

/**
 * Uniform-cost search over the decision-point tree with closed-set dedup.
 * Heuristic is `h = 0` — true admissible bounds under talent compounding
 * are hard to write tightly; the prototype runs Dijkstra and lets beam
 * answer "is heuristic pruning worth the complexity?"
 *
 * TODO(expansion): `Planner<S, A, G>` candidate — shared
 * `{problem, expand(node), goalReached(state), hashState(state)}` contract
 * for state-space search across consumers (cycler / explorer / scripter
 * balance leaves are the N=2+ family). N=1 seed; deliberate pause point per
 * `BALANCING-looper.md § Engine-surface verdict`. See
 * `open-loop-engine/docs/candidate-primitives.md` §
 * `Planner<S, A, G>` — constructive state-space search.
 */
export function astar(problem: SearchProblem): SearchResult {
  const t0 = Date.now();
  const root = rootNode(problem);
  if (root.goalReached) {
    return {
      found: true,
      trajectory: [root.queue],
      totalSimTime: root.g,
      nodesExpanded: 0,
      nodesGenerated: 1,
      wallTimeMs: Date.now() - t0,
      termination: 'goal',
    };
  }

  // Priority queue (linear scan; trees are small so a heap is overkill).
  const frontier: SearchNode[] = [root];
  const closed = new Set<string>();
  let nodesExpanded = 0;
  let nodesGenerated = 1;
  let termination = 'exhausted';

  while (frontier.length > 0) {
    if (Date.now() - t0 > problem.maxWallMs) {
      termination = 'walltime';
      break;
    }
    if (nodesExpanded >= problem.maxNodes) {
      termination = 'budget';
      break;
    }

    // Pop lowest g.
    let bestIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      if (frontier[i]!.g < frontier[bestIdx]!.g) bestIdx = i;
    }
    const node = frontier.splice(bestIdx, 1)[0]!;
    const key = hashState(node.state);
    if (closed.has(key)) continue;
    closed.add(key);

    if (node.goalReached) {
      return {
        found: true,
        trajectory: trajectoryFor(node),
        totalSimTime: node.g,
        nodesExpanded,
        nodesGenerated,
        wallTimeMs: Date.now() - t0,
        termination: 'goal',
      };
    }

    nodesExpanded++;
    const children = expand(problem, node);
    nodesGenerated += children.length;
    for (const c of children) {
      if (c.g > problem.totalBudget) continue;
      if (!closed.has(hashState(c.state))) frontier.push(c);
    }
  }

  return {
    found: false,
    trajectory: [],
    totalSimTime: Infinity,
    nodesExpanded,
    nodesGenerated,
    wallTimeMs: Date.now() - t0,
    termination,
  };
}

// ─── Beam(W) ─────────────────────────────────────────────────────────────

/**
 * Bounded-width best-first search. Score = forest progress weighted heavily,
 * then wander progress, then banked pots-good. No closed-set dedup — beam's
 * width bound provides its own pruning.
 */
function score(s: LooperState): number {
  return s.forest * 1000 + s.wander * 100 + s.potsGood * 10 + s.estManaSurplus;
}

export function beam(problem: SearchProblem, width = 8): SearchResult {
  const t0 = Date.now();
  const root = rootNode(problem);
  if (root.goalReached) {
    return {
      found: true,
      trajectory: [root.queue],
      totalSimTime: root.g,
      nodesExpanded: 0,
      nodesGenerated: 1,
      wallTimeMs: Date.now() - t0,
      termination: 'goal',
    };
  }

  let frontier: SearchNode[] = [root];
  let nodesExpanded = 0;
  let nodesGenerated = 1;
  let termination = 'exhausted';

  while (frontier.length > 0) {
    if (Date.now() - t0 > problem.maxWallMs) {
      termination = 'walltime';
      break;
    }
    if (nodesExpanded >= problem.maxNodes) {
      termination = 'budget';
      break;
    }

    const children: SearchNode[] = [];
    for (const node of frontier) {
      if (node.goalReached) {
        return {
          found: true,
          trajectory: trajectoryFor(node),
          totalSimTime: node.g,
          nodesExpanded,
          nodesGenerated,
          wallTimeMs: Date.now() - t0,
          termination: 'goal',
        };
      }
      nodesExpanded++;
      const expanded = expand(problem, node);
      nodesGenerated += expanded.length;
      for (const c of expanded) {
        if (c.g <= problem.totalBudget) children.push(c);
      }
    }
    if (children.length === 0) {
      termination = 'exhausted';
      break;
    }
    // Check whether any child reached the goal before pruning the frontier.
    const winner = children.find((c) => c.goalReached);
    if (winner) {
      return {
        found: true,
        trajectory: trajectoryFor(winner),
        totalSimTime: winner.g,
        nodesExpanded,
        nodesGenerated,
        wallTimeMs: Date.now() - t0,
        termination: 'goal',
      };
    }
    children.sort((a, b) => score(b.state) - score(a.state));
    frontier = children.slice(0, width);
  }

  return {
    found: false,
    trajectory: [],
    totalSimTime: Infinity,
    nodesExpanded,
    nodesGenerated,
    wallTimeMs: Date.now() - t0,
    termination,
  };
}
