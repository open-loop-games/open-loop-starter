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

## Algorithm choice — verdict (REACH_FOREST_1 prototype)

Both **A\* with `h = 0` (uniform-cost / Dijkstra)** and **beam(W=8)** find
the goal at canonical settings on the same trajectory:

```
algo       found  simTime  expanded  generated  wallTime  termination
A* (h=0)   yes    7m23s    5         13         ~800ms    goal
Beam(W=8)  yes    7m23s    13        15         ~1000ms   goal
```

Same 5-step mutation timeline:

```
step 0: [wander × 1]                       (bootstrap; wander 0 → 3)
step 1: [wander × 1]                       (stay; wander 3 → 5)
step 2: [smash-pots × 50]                  (switch-to-pure-smash; bank first good)
step 3: [smash-pots × 3, wander × 1]       (smash-first hybrid; build wander + bank more good)
step 4: [smash-pots × 3, explore-forest × 1]  (goal action; explore-forest completes mid-loop)
```

The verdict is "A\* with `h = 0` fronts the harness; beam is the
fallback when state-bracket coarsening doesn't collapse enough." Reasons:

- A\* with closed-set bracket-dedup expands fewer nodes (5 vs 13) because
  beam expands every frontier node per generation while A\* pops
  cheapest-g first and dedups by state hash. For trees of dozens of
  nodes (REACH_FOREST_1's actual scale), the difference is small; for
  deeper goals (STAT_TIER_COMPOUND, where talent compounding generates
  many near-identical states), dedup matters more.
- A useful admissible heuristic is hard to write tightly under talent
  compounding's positive feedback. The prototype uses `h = 0` —
  optimality guarantee is preserved, pruning power is purely from the
  closed set. Future-you can add a tightening heuristic once the
  bracket-state shape stabilizes across goals.
- The verdict is weak from a single goal — STAT_TIER_COMPOUND and
  WANDER_TIME_BOUND are explicitly out of prototype scope per
  description; the algorithm-choice comparison will get more weight when
  those goals get their own decision-point + operator menus.

Beam doesn't promote to primary because its top-W-by-score pruning isn't
load-bearing for this search-tree size. MCTS-fallback per the prior
framing isn't justified; both algorithms terminate in under 1s.

## Backtracking — open

Decision-point loops commit the best mutation linearly (new checkpoint
becomes the trajectory's frozen prefix). With deterministic transitions
and a clearly-improving heuristic, linear-commit converges fine for
reach-goal predicates like REACH_FOREST_1. For goals with non-trivial
local optima (STAT_TIER_COMPOUND with multi-axis talent compounding
paths), backtracking — keeping a frontier of recent commits and re-trying
alternatives when forward progress stalls — may earn its weight. Open
until measured.

## Verdicts settled by the REACH_FOREST_1 prototype

- **Engine-surface verdict.** Ad-hoc composition of `runUntil` +
  `BalanceBotControlKey` + `OverrideRegistry.pushScope` + custom search
  code works end-to-end on REACH_FOREST_1. Reading the search code, the
  only piece that "wants" engine support is the bracket-trigger
  detection inside `runUntil`'s `until` predicate — and that wires
  through cleanly without a primitive. The `Planner<S, A, G>` candidate-
  primitives.md drop is still right to make as an N=1 seed for the
  cycler/explorer/scripter family; abstraction promotion waits for N=2.
- **Decision-point detector composition.** Bracket-transition triggers
  (state-space crossed a coarse-bucket boundary) work better than
  one-shot heuristic crosses (e.g., `wander-crosses-5`). One-shot
  triggers can't re-fire once their threshold is crossed; bracket
  transitions naturally re-fire on the next bucket boundary. The
  prototype's brackets — wander {0-2, 3-4, 5+}, potsGood {0, 1-2, 3-4,
  5+}, forest {0, ≥1} — produce a 6-level tree with branching factor 2-3.
- **State-hash discretization granularity.** The same brackets used for
  triggering double as the closed-set hash key. Coarse enough that
  parallel trajectories converging on roughly the same regime get
  deduplicated; fine enough that pre-bootstrap (wander 0-2) and
  smash-economy-active (potsGood ≥ 1) states stay distinct. Single-axis
  bucket counts: wander 3, potsGood 4, forest 2 → 24 possible hashes.
- **Rollout horizon H per goal.** N/A under bracket-transition
  termination: each rollout runs until ANY bracket crosses (or goal
  fires, or budget exhausts). Effective H varies — bootstrap rollout is
  ~3 loops, mid-arc rollouts are ~6-10 loops, goal rollout is 1 loop.
  Fixed-cadence K-loop fallback isn't needed because every realistic
  trajectory crosses a bracket eventually.
- **Backtracking vs linear-commit.** REACH_FOREST_1 doesn't exercise
  backtracking — A\* with closed-set dedup converges on the optimal
  trajectory without needing to re-try committed mutations. Open for
  STAT_TIER_COMPOUND, where multi-axis talent compounding may create
  trajectories that look promising mid-rollout but stall.

## Open (carry into the next leaf or perturbation sweep)

- **Lock semantics.** Probable shape unchanged: trajectory waypoints
  (canonical-state checkpoints at chosen sim-time intervals; matches
  producer/ambient verify shape) plus a feasibility frontier (boolean
  grid over goal × tunable-perturbation). Implementation lands with
  `verify.ts` and `solve.ts` once the perturbation sweep follow-up
  starts; the algorithm-choice verdict above doesn't constrain it.
- **Algorithm generalization.** The verdict above is from one goal. The
  next leaf (perturbation sweep + STAT_TIER_COMPOUND / WANDER_TIME_BOUND
  decision-point work) re-tests the A\*-primary call on those goal
  shapes, especially STAT_TIER_COMPOUND's hundreds-of-loops Per talent
  grind where the closed-set may dedup most of the tree away.

## Findings landed during the prototype (engine-side gotchas)

These are properties of the looper port + engine substrate the prototype
surfaced. Documented here so future-you doesn't re-discover them.

- **`tickDelta` must divide every action's `manaCost` evenly.** Per-tick
  mana drain at default engine settings = `tickRate × tickDelta`. With
  `tickRate=20`, `tickDelta=1` (the sibling-solver canonical value)
  gives 20-mana ticks. Smash Pots's 50-mana cost overshoots to a
  60-effective-cost (3 ticks of 20-drain instead of the 50-mana
  intended). This breaks the goodTemp banking math by exactly the
  amount needed to fit Explore Forest in a single loop. The prototype
  uses `tickDelta=0.5` (10-mana ticks: smash exactly 50, Explore Forest
  exactly 400). Other action cost grids in the first arc (Wander 250,
  Wild Mana 150, Pick Locks 400, Buy Mana 100, Gather Herbs 200, Old
  Shortcut 1200, Meet People 800) all divide by 10, so 0.5 works
  uniformly. Future expansion of the action grid should pick a
  `tickDelta` matching the GCD of all manaCosts.
- **Bot `setSchedule` must force edit→active promotion.** The looper's
  `activeLoopQueue` and `editLoopQueue` Sequencer state is NOT inside
  `withPersistentContext` — its `items` array is a Vue ref, not a
  Persistent ref, so `saveManager.importSave(blob)` doesn't restore it.
  Without explicit handling, queue state leaks from prior rollouts (the
  candidate queue only takes effect after one residual loop completes).
  `setSchedule` calls `restartActionQueue` after `loadEditQueue` so the
  candidate runs on the loop that's starting, not the one after.
- **Bot `setSchedule` indexes off by one** (parked as known issue).
  `bot.ts:beforeRestart` reads `getLoopCount().value` and uses it
  directly as the schedule index — but the engine emits `beforeRestart`
  *before* `count.value++` (see `open-loop-engine/src/systems/loop.ts:213-218`
  and `tests/systems/loop-log.test.ts:155-166`). The handler should
  index `loopCount + 1` for "the loop about to start." The bug doesn't
  bite the decision-point branching solver shape because every rollout
  calls `setSchedule([singleQueue])` — schedule.length=1 keeps the bot
  in past-end "leave edit alone" mode for any loopCount ≥ 1, and the
  single queue replays correctly via `restartActionQueue`'s edit→active
  copy. The bug WOULD bite a multi-queue `setSchedule([Q0, Q1, ...])`
  call — verify pass-shapes that re-run a full LoopSchedule end-to-end
  should be implemented as iterated single-queue `setSchedule` calls,
  same as the solver itself.
- **Action-runner's `canRun` zone-gate skips wrong-zone items.** Each
  loop reset selects `beginnersville` (`modules/zones.ts:261`); the
  per-tick dispatcher's `canRun` (`modules/action-runner.ts:420`)
  returns `'never'` for any item whose `def.zoneId !== getCurrentZone()`.
  UI players resolve this by clicking the zone selector mid-loop; the
  bot has no UI. The Sequencer's `'start'` event doesn't fire on a
  `'never'` gate (it emits `'skip'` instead), so a post-hoc handler
  can't react in time. The bot wraps `canRun` at install time so wrong-
  zone items auto-`unlockZone(def.zoneId, true)` before the original
  gate's zone check runs. Player-facing engine instances don't install
  the bot module — the UI zone-selection contract is preserved for
  production play.
- **Module-singleton collision blocks two-engine setup.** Building two
  `buildLooperSimEngine()` instances back-to-back trips a `Duplicate
  entry id: "wander"` error from `action-runner/progress` content
  registry. `progressCategory` (and the sibling regular/basic
  categories) are module-level state inside `action-types/*.ts`;
  re-installing the module re-registers the action defs into the same
  singleton. The prototype works around this by sharing one engine
  across A\* and beam (importSave-per-search reset). Multi-engine
  scenarios (e.g., parallel batch sims) need the action-type categories
  reworked to be per-engine or a separate ticket.

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
