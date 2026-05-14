# Balancing — Looper

Per-archetype balance log per `BALANCING.md § Graduating findings`. Looper's
balance pass hasn't run yet — this doc starts as a pre-pass *search-strategy
spec* and grows learnings as the harness work proceeds. Game-mechanics
foundation lives at `src/archetypes/looper/PROGRESSION.md`; cite that doc,
don't restate it here.

## Methodology — why this archetype needs #7

Looper is single-subsystem **Discrete planning / scheduling** per the
research subsystem inventory (`open-loop-research/inbox/closed-form-progression/looper.md`
row 15). Methodology #7 (solver-driven balance) per `BALANCING.md
§ Theme 3 #7` lands here.

The output is **a multi-loop trajectory**, not a per-beat scalar that
bisects on fire-time. State carries across loops along multiple channels
(talent XP, progress-var XP, regular-var `checked` + `good`, loop count),
queue mutations are small and local, and canonical trajectories run 50+
loops with the queue as a slowly-evolving artifact. Producer/ambient/tug's
one-engine + importSave-per-iteration *linear bisection* shape isn't the
right primitive — the shift is to one-engine + blob-rooted tree-structured
rollouts.

## Search target — the queue as evolving artifact

The solver does NOT search over fixed-cardinality per-loop queue templates
or template-id sequences. The search target is a **queue mutation
timeline**: most loops re-run the prior queue verbatim (state grows under
it), and a small fraction are *decision-point loops* where the queue
mutates by one local operation.

The player's natural play-loop is observe-tweak-run-observe (see
PROGRESSION.md § Queue mutation taxonomy). The solver replicates this
loop. The mutation space IS the search space — search is over **tweaks at
decision points**, not over arbitrary game states.

### Mutation operators

Per PROGRESSION.md § Queue mutation taxonomy: ADD / REMOVE / CHANGE-count /
SPLIT-count. Each generated dynamically from current engine state —
operators that reference locked or unavailable actions aren't in the menu
this turn. Examples:

- ADD `Pick Locks × 1` once wander ≥ 3 just landed.
- CHANGE-count on `Smash Pots × K` from K to K+1 once a new `good` banked.
- SPLIT `Wander × 3` into `Wander × 1, Smash Pots × N, Wander × 2` when an
  intervening mana-banking opportunity opens.

The operator generator reads engine state via the same module-public
accessors the solver uses for goal evaluation (`getStatLevel`,
`getProgressLevel`, `getLoopCount`, `getTimesCompleted`, regular-var
state). Engine-as-oracle posture per `BALANCING.md § Engine as oracle`.

### Templates as procedures over state

The "chip-backlog-while-allowing-forward-progress" pattern (PROGRESSION.md
§ good → goodTemp budget) is a procedure: read `good`, emit `Smash × (good +
1 or 2)`. Same procedure across hundreds of loops; emitted queue grows as
state evolves. The procedure library is part of the search policy, not the
search space.

## Engine harness — fork from save point, fan out

The base operation:

1. At a decision-point loop, `exportSave()` captures the checkpoint blob.
2. For each candidate mutation in the operator menu, fan out a rollout:
   - `importSave(checkpoint)` restores engine to the decision-point state.
   - Apply the mutation to the current queue.
   - `setSchedule(new queue)` via `BalanceBotControlKey` (see
     `src/archetypes/looper/balance/bot.ts`).
   - `runUntil(H loops OR goal predicate fires OR budget exceeded)`.
   - Capture post-rollout state + new save blob.
3. Score each rollout against goal-distance.
4. Commit best mutation. Capture its post-rollout blob as the new
   trajectory checkpoint. Advance.

One engine, blob-rooted tree of saves. The mutation tree is the search
space; node expansion = importSave + apply mutation + rollout + score.

Closed-set dedup via coarse state-hash (cross-loop state vector
discretized). Two trajectories that reach roughly the same state by
different paths converge in the search.

## Decision-point detection

The solver runs the current queue forward without mutation until a
decision-point heuristic fires. Candidate triggers:

- **Action just unlocked** — a prereq landed (`wander ≥ 3` → Pick Locks,
  Buy Mana available; `wander ≥ 5` → Explore Forest, Wild Mana, Old
  Shortcut; `Per_talent ≥ 1` + loop count thresholds → Gather Herbs).
- **good incremented** — `pots.good` or `locks.good` just crossed a %10
  boundary. The mana-banking budget for subsequent loops shifted; queue
  sizing may want to follow.
- **Stat-level cost reduction crossed a feasibility threshold** — an
  action's adjusted ticks dropped enough to fit in the remaining mana
  budget of a loop where it didn't fit before.
- **Talent multiplier crossed a feasibility threshold across loops** —
  same shape, but driven by talent compounding rather than within-loop
  stat-level XP.

Fallback: re-evaluate every K loops regardless of triggers. K-value
settled by prototype; the cost of a no-mutation re-evaluation is one
rollout's worth of sim time.

## Rollout horizon

The horizon H per rollout is a tradeoff between myopia and cost:

- **H = 1 loop:** misses the burned-run pay-off pattern (a loop that's
  mana-negative this loop but enables a high-value next loop).
- **H = large:** captures compounding, costs O(H) sim time per rollout.

For REACH_FOREST_1: H ≥ ~3 to see at least one mana-banking cycle (smash
loop banks `good`, next loop burns goodTemp for surplus). Exact H to be
settled by prototype. For STAT_TIER_COMPOUND or WANDER_TIME_BOUND, the
horizon may want to be longer because talent compounding takes more loops
to register a meaningful score delta.

## Scoring

Score the post-rollout state against the goal predicate. Naive
"goal-progress-per-sim-sec" penalizes mana-economy investment trajectories
that pay off later; better is a state-distance estimate that values
intermediate state correctly.

For REACH_FOREST_1, a candidate scoring function:

- If goal met during rollout: score = remaining mana / total mana spent
  (lower is better — finishes faster).
- If not met: score = a closed-form lower bound on remaining sim-time to
  goal, given (wander level, forest level, `pots.good`, `locks.good`,
  banked gold, top-talent levels).

The closed-form lower bound is the algorithm's heuristic — same machinery
as A*'s h(n). Tightness vs computational cost is open; settle by prototype.

## Algorithm choice

Open per `BALANCING.md § Theme 3 #7`. Resolve in-leaf by running two
algorithms side-by-side on REACH_FOREST_1 at canonical settings.

- **A\* over mutation-applied states.** Admissible heuristic = closed-form
  remaining-sim-time estimate. Pruning power depends on heuristic
  tightness; loose heuristics over the unlock-cliff structure may
  not prune enough to beat beam.
- **Beam search at width W.** Bounded-width best-first heuristic. Doesn't
  guarantee optimal; for "find a viable trajectory" rather than "find the
  optimal trajectory," beam is often the right cost/quality tradeoff.
- **MCTS-style best-of-N rollouts** (fallback). Transitions are
  deterministic, so UCT degenerates to best-of-N rollouts. Lift this if
  A\*'s heuristic is too loose AND beam's W blows up.

The prototype's output: a comparison table (nodes-expanded /
nodes-generated / wall-time / solution-trajectory) plus a written verdict
on which algorithm fronts the harness and on which goal-shape.

## Backtracking — open

Decision-point loops commit the best mutation linearly (new checkpoint
becomes the trajectory's frozen prefix). With deterministic transitions
and a clearly-improving heuristic, linear-commit converges fine for
reach-goal predicates like REACH_FOREST_1. For goals with non-trivial
local optima (STAT_TIER_COMPOUND with multi-axis talent compounding
paths), backtracking — keeping a frontier of recent commits and re-trying
alternatives when forward progress stalls — may earn its weight. Open
until measured.

## Open verdicts (resolve in-leaf; record outcomes here as learnings land)

- **Engine-surface verdict.** Default posture: ad-hoc composition of
  `runUntil` + `BalanceBotControlKey` + `OverrideRegistry.pushScope` +
  custom search code. Drop a `Planner<S, A, G>` candidate entry in
  `open-loop-engine/docs/candidate-primitives.md` to seed N=1; wait for
  N=2 from cycler / explorer / scripter before promoting to a research
  ticket. Open: confirm the ad-hoc posture by writing the search code
  and seeing what the abstraction would have bought.
- **Lock semantics.** Probable: trajectory waypoints + feasibility
  frontier. Waypoints capture canonical-state checkpoints at chosen
  sim-time intervals (matches producer/ambient verify shape); feasibility
  frontier captures, per goal × tunable-perturbation, whether the solver
  found a reachable trajectory within budget (boolean grid). Open:
  confirm during `verify.ts` and `solve.ts` implementation.
- **Decision-point detector composition.** Heuristic-trigger set vs
  fixed-cadence K-loop fallback. Open: settle by prototype which triggers
  fire often enough to obviate the fallback.
- **State-hash discretization granularity.** Coarse enough that
  "roughly the same place" trajectories converge; fine enough that
  genuinely distinct states stay distinct. Open: settle by prototype.
- **Rollout horizon H per goal.** Open per goal; REACH_FOREST_1 likely H
  ≥ 3, the other two longer.
- **Backtracking vs linear-commit.** Open per goal; REACH_FOREST_1
  likely linear-commit is fine.

## Findings to graduate at close (cross-archetype)

These confirmed during the looper data-side fold and bot foundations (see
the OL-959 session 2 comment trail). Promote to `BALANCING.md` PR
amendments when the looper leaf closes:

- **Dead-fields-in-data N=3 confirmed** (producer + tug + looper). Looper
  fold deleted four fields: three decorative (initialMana, costDivisor,
  talentAccrualRatio — shadowed by inline consts before the tuning
  registry landed) plus one dead (`loopResetEnabled`, never read). Same
  shape OL-957 (tug) named.
- **`getRate` faithfulness N=2 confirmed** (ambient + looper). Looper has
  out-of-band rate channels (mana drain via tick callback, per-completion
  XP, reward-effect mana adds); `getRate` does not faithfully capture
  income shape. Confirms OL-956's rule: stasis-aware-tick mode adoption
  is sound iff `getRate` faithfully captures all income channels.
  Looper's accessor (`balance/bot.ts:buildLooperAccessor`) reports zero
  rate for mana with a header note flagging the unfaithful surface.
- **Override-path redundant with `tunable()` N=2 confirmed** (tug +
  looper). Looper fold deleted `data/balance.ts` entirely with no
  override-path retention. The `tunable()` reader pattern subsumes the
  override-path mechanism for the cross-cutting scalars looper exposes.
