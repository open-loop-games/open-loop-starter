# Looper — progression mechanics

> Audience: solver and balance work on the looper archetype. This document is
> the game's actual evolution rules — what the engine simulates, what state
> persists vs resets, what the player's queue actually controls.
>
> Cite this document; don't re-derive from code each session. Appendix to
> `IDENTITY.md` (archetype concept + identity layer); sibling to
> `archetypes/BALANCING-looper.md` (search-strategy notes, lands separately).

## What the looper port is

The looper port is a direct lift of idle-loops vanilla (via the
`idle-loops-ng` TypeScript modernization), cut down to the first arc only:
**Beginnersville + Forest Path zones**, ~9 actions, 4 progress vars, 4
regular vars, 9 stats. Soulstones, dungeons, multi-part progress bars,
multi-zone narrative arcs, the Practical/Combat/Dark skill axes, the +50
later actions — all out of scope. Action numbers (manaCost, weights,
rewardRatio, progressAmount) are cited 1:1 from `idle-loops-ng` per the
file-header comments in `data/actions.ts`; the port's job is fidelity, not
re-balance.

Closed-form receipts for every subsystem (level XP curve, adjusted-ticks,
talent multiplier, regular-var pool sizing, gold↔mana exchange) live at
`open-loop-research/methodology/techniques/closed-form-progression/per-archetype/looper.md` — 18 rows with
source-line citations across the vanilla / dmchurch / omsi / lloyd /
squirrel variants. This document inlines operationally load-bearing
formulas; for the algebra classifications and the cross-variant comparison
table, cite out.

## Per-tick mechanics

### Mana is time

The active loop drains mana per engine tick at `round(gameLoop.tickRate × dt)`
mana per tick (`modules/loop.ts:263-266`). The active queue item progresses
toward `adjusted` ticks at the same rate, `gainPerTick = tickRate × dt`
(`modules/action-runner.ts:351`). **Mana drained equals action progress
made**, frame for frame. A 250-tick action consumes exactly 250 mana to
complete.

Loop end fires when `mana ≤ 0` OR the queue is exhausted
(`modules/loop.ts:215`).

### Adjusted-ticks per action

`adjusted = ceil(manaCost × costMult)` where
`costMult = Σ weight / (1 + statLevel / 100)` over the action's weighted
stats (`modules/action-formulas.ts:39-51`). Weights sum to 1.0 by
convention; at zero stat levels `costMult = 1` and **`adjusted = manaCost`
exactly**. Cost reduction kicks in as stat levels accumulate, but stat
levels reset each loop reset (§ State partition), so within-loop cost
compression is bounded by how much weighted XP the action has already
banked this loop. Cross-loop compression comes through talents, which
multiply XP gain on subsequent loops.

### XP accrual

Per tick, each weighted stat accrues
`weight × expMult × (manaCost / adjusted)` of raw stat-level XP
(`modules/action-formulas.ts:65-80`). At zero stats, `manaCost / adjusted =
1`, so per-tick stat XP per stat = `weight × expMult × 1`. Both the
stat-level SkillCategory and the talent SkillCategory have their `gainChain`
bound with the talent multiplier in `modules/stats.ts:connect`, so the
boosted amount lands on stat-level and `boosted × talentAccrualRatio`
(0.01 canonical) lands on talent. Vanilla idle-loops's positive-feedback
shape holds:

```
raw_stat_xp_per_tick = weight × expMult × (manaCost / adjusted)
stat_level_gain      = raw × talentMult(talent_level)
talent_gain          = raw × talentMult × 0.01
```

The looper port's `talentMult = 1 + sqrt(level) / 5` (`modules/stats.ts:58-60`)
is a port-specific parameterization (vanilla omsi uses `1 + level^0.4 / 3`,
squirrel uses `1 + sqrt(level)/2` — all live in the same §2.3 polynomial
family per the research receipts).

### Action completion firing

When an action's progress crosses `adjusted`, the per-type effects fire
exactly once:

- **`progress` type** (Wander, Meet People, Explore Forest, Old Shortcut):
  grants `progressAmount × pvDef.expMult` XP to the named progress var.
  Wander grants +200 to `wander`. Explore Forest grants +100 to `forest`.
- **`regular` type** (Smash Pots, Pick Locks, Wild Mana, Gather Herbs):
  runs `finishRegular` against the named regular var — see § Regular-var
  reward mechanics below.
- **`basic` type** (Buy Mana): runs the `completionEffects` array in order
  (`spend-gold all`, `exchange-gold-to-mana`, etc.); applied via
  `applyCompletionEffects` with a pre-batch gold snapshot so
  `exchange-gold-to-mana` always reads pre-spend gold regardless of effect
  order.

### Regular-var reward mechanics

`finishRegular(id, rewardRatio, rewardFunc)` (`modules/zones.ts:206-229`) is
where the mana-banking economy lives. Three branches, gated by the
`valuablesFirst` toggle (persistent, default `true`):

```
if (unchecked > 0 && (!valuablesFirst || goodTemp ≤ 0)):
  checked++
  if checked % rewardRatio == 0:
    good++
    rewardEffects fire (+100 mana for Smash Pots, etc.)
else if goodTemp > 0:
  goodTemp--
  rewardEffects fire
else:
  (no-op — mana was already drained over the action's ticks)
```

With `valuablesFirst = true`:

- If `goodTemp > 0`: burn a banked good. `rewardEffects` fire (+100 mana
  for Smash Pots). `checked` is NOT incremented. This is the steady-state
  mana income channel.
- Else if `unchecked > 0`: check one unchecked item. `checked++`. If the
  new `checked` lands on a `rewardRatio` boundary, `good++` and
  `rewardEffects` fire. **This is the only path that grows `good`.**
- Else: the action completes but does nothing useful (mana was still
  drained over its ticks).

`rewardRatio` is 10 for all four regular actions in the first-arc port. The
expected mana per check across many completions is
`rewardEffectMana / rewardRatio` (Smash Pots: +10/check avg before
goodTemp banking; Wild Mana: +25/check avg before banking).

## State partition: persists vs resets

### Persists (cross-loop state vector)

The retention policy at `modules/loop.ts:174-189` declares what survives
the reset. Solver's outer-search state space is exactly this:

- **Talent XP per stat** — 9 stats, each with persistent talent XP. Level
  curve: `level = floor((sqrt(8·xp/100 + 1) − 1) / 2)`. Cumulative XP to
  reach level L is `50·L·(L+1)`. Talent SkillCategory is omitted from
  `thingsToReset`.
- **Progress-var XP** — 4 vars (`wander`, `met`, `forest`, `shortcut`).
  Same curve. Wander completion grants 200 XP to `wander`; Explore Forest
  grants 100 XP to `forest`.
- **Loop count** — persistent on the engine's Loop primitive.
- **Per regular-var `checked` and `good`** — the cumulative "items I have
  examined" and "items I have found valuable" counters. **These are
  persistent.** They are not in `restartZones`'s reset list
  (`modules/zones.ts:256-262`).
- **Loadout slots** — saved action queues. Not part of the search state
  space but part of the retention layer.

### Resets each loop

- **Mana** → `balance/initialMana` (250 canonical). `resetMana()` at
  `modules/mana.ts:101-104`.
- **Stat-level XP per stat** → 0. The stat-level SkillCategory is in
  `thingsToReset` (`modules/loop.ts:227`); the recursive Resettable walker
  zaps each `xp` Persistent.
- **Per regular-var `goodTemp`** → reset to current `good` value
  (`modules/zones.ts:258`). This is the per-loop budget of known-goods
  available to burn.
- **Per regular-var `lootFrom`** → 0.
- **Per-action `progress` and `timesCompleted`** — both per-action
  Persistent refs are reset via the action-type categories'
  `thingsToReset` entries (`modules/loop.ts:227`).
- **Zone selection** → `beginnersville` (`modules/zones.ts:261`).
- **Active queue cursor** — reset to 0, edit queue promoted to active via
  `restartActionQueue`.

### Derived: regular-var pool sizes

`pots.total`, `locks.total`, `wild-mana.total`, `herbs.total` are not
stored directly. They are recomputed by `resizeRegularVar`
(`modules/zones.ts:274-282`) when a contributing progress-var levels up.
Each progress-var declares a `scales` array; the level-up callback
recomputes every affected regular var's total as a sum of
`contributing_pv_level × perLevel`.

The first-arc scales table (`data/progress-vars.ts`):

- Wander → `pots: 5/level`, `locks: 1/level`.
- Forest → `wild-mana: 5/level`, `herbs: 5/level`.
- Shortcut → `herbs: 2/level`.

The level-up event re-sets `total` to the new sum. **`checked` is
unchanged.** Newly-added items become unchecked (`unchecked = total -
checked`). Existing in-flight smash sequences are not interrupted — the
pool simply gets bigger.

### One subtlety: level-up timing relative to queue cursor

In steady-state mid-arc queues, smash-pots runs BEFORE wander (so the
goodTemp budget gets burned for mana surplus first, then wander does
forward progress). By the time Wander completes and the `pots.total`
level-up fires, the queue cursor is past the smash-pots slot. The newly
added unchecked items don't get smashed this loop — they're tomorrow's
backlog. **The `pots.total` level-up rarely opens up fresh in-loop
income; it sets up next-loop economy.** Treat this as a property of the
canonical queue order, not a mechanic the engine should be coaxed to
exercise differently.

## First-arc walkthrough (loops 1–5)

State arithmetic under the looper port's exact numbers. All values are
exact, not estimated.

### Loop 0 (initial state, before any play)

Mana 250. All progress-var XP = 0. All talent XP = 0. All stat-level XP =
0. `pots.total = 0` (no wander level yet). All regular-var `checked` and
`good` = 0. Queue is whatever the player authored — call it whatever for
loop 1.

### Loop 1 — first wander

Queue: `[Wander × ∞]`. (Any count ≥ 1 works; only 1 will fit.)

`adjusted(Wander)` at zero stats: `costMult = 0.2 + 0.2 + 0.2 + 0.3 + 0.1 =
1.0`; `adjusted = ceil(250 × 1) = 250` ticks. One Wander completion
consumes 250 ticks = 250 mana. **Mana drains to 0 exactly as the Wander
completes.** Loop ends.

State after loop 1:

- `wander.xp = 200` → `wander_level = 1` (needs 100; has 200).
- Level-up event fires: `pots.total = 5`, `locks.total = 1`.
- Stat-level XP this loop (per weight × adjustedExp × ticks = weight ×
  1 × 250):
  Per +50, Con +50, Cha +50, Spd +75, Luck +25. All below level-1
  threshold of 100. **Resets to 0 next loop.**
- Talent XP delta (raw × talentMult × 0.01 = raw × 1 × 0.01):
  Per +0.5, Con +0.5, Cha +0.5, Spd +0.75, Luck +0.25. Far below level-1
  threshold of 100.
- Sim time elapsed: 12.5 sec (250 mana / 20 mana/sec).

### Loop 2 — second wander

Queue: same. Same arithmetic — 1 Wander completion.

State after loop 2:

- `wander.xp = 400` → `wander_level = 2` (needs 300).
- Level-up event fires: `pots.total = 10`, `locks.total = 2`.
- `pots.checked = 0`, `unchecked = 10`. `good = 0`, `goodTemp = 0`.
- Talent XP cumulative: Per 1.0, Con 1.0, Cha 1.0, Spd 1.5, Luck 0.5. All
  talent levels still 0.
- Sim time elapsed total: 25 sec.

### Loop 3 — first mutation candidate

The unchecked pool now has items worth chipping at. But the first reward
(`good` increment) only fires when `checked` crosses a multiple of
`rewardRatio = 10`. Two queue options to compare:

**Option A — keep wandering: `[Wander × ∞]`.**

1 Wander completes. `wander.xp = 600` → `wander_level = 3`. Level-up
fires: `pots.total = 15`, `locks.total = 3`. Pool still 0 checked / 15
unchecked. No income this loop. Stat XP and talent XP accrue as before.

**Option B — start smashing: `[Smash Pots × ∞, Wander × 1]`.**

Smash Pots cost 50 each at zero stats (`weights {Str:0.2, Per:0.2,
Spd:0.6}`, costMult 1.0 ⇒ adjusted = 50). 5 Smashes consume 5 × 50 = 250
mana. Each Smash: `goodTemp = 0`, falls to unchecked-branch — `checked++`.
After 5 Smashes: `checked = 5`. None hit a %10 boundary, **no `good`
banked, no `rewardEffects` fire**. Mana = 0; Wander never starts.

State after loop 3 (Option B):

- `wander.xp = 400` (unchanged), `wander_level = 2`.
- `pots.checked = 5`, `unchecked = 5`, `good = 0`.
- Stat XP this loop: weights {Str:0.2, Per:0.2, Spd:0.6}, 5 completions ×
  50 ticks each = 250 ticks total. Per +50, Str +50, Spd +150. Still all
  stat levels reset to 0 next loop.

**Verdict:** Option A is strictly better in loop 3. Smashes-before-wander
in early loops is wasted because there's nothing in `goodTemp` to burn and
the %10 boundary is unreachable. Wander-first stays correct until the
first `good` banks.

**Continue with Option A for loops 4 and 5.**

### Loop 4 — chipping the backlog

Entering loop 4: `wander_level = 3`, `pots.total = 15`, `pots.checked = 0`,
`good = 0`. Now smashes are worth queueing because the pool is big enough
for the %10 boundary to be reachable within a couple of loops.

Queue: `[Smash Pots × ∞]`. 5 Smashes consume all 250 mana. `pots.checked:
0 → 5`. Still no %10 boundary crossed (needs cumulative 10). No income.

State after loop 4: `wander_level 3`, `pots.checked = 5`, `unchecked = 10`,
`good = 0`. Talent XP creeping up (Spd accumulating fastest from Smash's
0.6 weight × 5 completions × 50 ticks × 0.01 = 1.5 talent XP this loop on
Spd alone).

### Loop 5 — first mana income event

Queue: `[Smash Pots × ∞]`. State entering: `checked = 5`, `unchecked = 10`.

- Smash #1: checked → 6. Cost 50. Mana 250 → 200.
- Smash #2: checked → 7. Mana 150.
- Smash #3: checked → 8. Mana 100.
- Smash #4: checked → 9. Mana 50.
- **Smash #5**: checked → 10. `10 % 10 == 0`, so `good++` (now 1) AND
  `rewardEffects` fire: `addMana(+100)`. Cost 50, mana 0, +100 = **+50 net
  surplus**. Mana now 50.

Wait — `addMana` extends the pool. The mana state in detail:

- Before Smash #5: mana = 50, drain rate continues.
- During Smash #5 (50 ticks): mana drains 50 → 0.
- At Smash #5 completion (tick 50): `finishRegular` fires, rewardEffects
  `addMana(100)`, mana 0 → 100.
- After Smash #5: mana = 100. Continue smashing.

- Smash #6: cost 50, mana 100 → 50. checked → 11.
- Smash #7: cost 50, mana 50 → 0. checked → 12.
- Mana = 0, loop ends.

State after loop 5: `wander_level 3`, `pots.total 15`, `pots.checked = 12`,
`unchecked = 3`, `good = 1`. **`goodTemp` will reset to 1 at the start of
loop 6.** Cumulative sim time: 62.5 sim-sec across 5 loops.

This is the first inflection point in the trajectory. From loop 6 onward,
queue order should flip to **smash-first** because there's now a known-good
to burn at +50 net mana per goodTemp consumed.

## Pair patterns

Named per-action relationships the queue is structured around. These are
the mechanics worth knowing by name; the solver/player both navigate by
exploiting them.

### Wander → +5 pots/level → backlog growth

Each wander-level increment adds 5 to `pots.total` (and +1 to
`locks.total`). The +5 are unchecked items at level-up time; `checked`
unchanged. Wander completions to go from level L to L+1: `ceil((L+1)/2)`
at 200 XP/completion (cumulative XP for level L is `50·L·(L+1)`). The
rate at which wander levels up is bounded by how many Wander completions
the queue fits per loop — one per pure-Wander loop at zero buffs; more
once stat-level cost reduction kicks in mid-loop.

The corollary: in a baseline 250 pool, at most 5 Smashes fit per loop.
Steady-state queues need either more smash-slots per loop (only possible
via mana surplus from goodTemp burns or Buy Mana) or stat-level cost
reduction (only possible mid-loop once Smash's weighted stats have
accumulated XP within the same loop).

### Smash Pots → checked → %10 boundary → good banking

Each Smash completion (when burning unchecked) costs 50 mana, increments
`checked` by 1, and on every `checked % 10 == 0` fires `addMana(+100)` and
`good++`. Per-completion expected mana over many completions: -50 + 10 =
**-40 mana average**. The +100 fires hit unevenly — at every 10th check
— and the timing matters because each hit happens *within a loop*,
extending that loop's effective mana budget.

The first %10 cross happens in loop 5 (under the all-Wander early
trajectory above). Each subsequent %10 cross banks one more `good`.

### good → goodTemp budget → next-loop mana income

`good` persists across loops. `goodTemp` resets to `good` at the start of
each loop. Under `valuablesFirst = true`, the next Smash completion in
this loop burns one `goodTemp` (decrements it by 1) and fires
`rewardEffects` (+100 mana) **without incrementing `checked`**.

The steady-state income mechanic. **+100 mana for 50 mana spent, net +50
mana per goodTemp burn.** Per-loop sizing: queue Smash at `good + 1` or
`good + 2`, so the slot burns every goodTemp this loop AND chips one or
two unchecked items.

Worked example: 55 total pots, 5 of which are `good` (banked from prior
loops), wander leveled up last loop adding +5 to the unchecked backlog.
Queue `[Smash Pots × 6, ...]`:

- Smash #1–5: burn goodTemp one at a time. `goodTemp` walks 5 → 4 → 3 →
  2 → 1 → 0. Each fires `rewardEffects` (+100 mana). `checked` is
  unchanged. Mana net across the five burns: −5×50 + 5×100 = +250.
- Smash #6: goodTemp = 0, falls to unchecked branch. `checked++`. Costs
  50 mana, no reward unless `checked` lands on a %10 boundary.
- Loop continues into the next queue slot with mana surplus carried
  forward into forward-progress actions.

The +1 unchecked chip per loop is "chip away at backlog while allowing
forward progress." Across many loops, those single backlog checks
eventually cross a fresh %10 boundary, banking `good++` without the
queue having to commit more mana to Smash slots. The `+1/2` framing
names this sizing convention: smash slot = `good + 1` or `good + 2`.

The pattern relies on three invariants:

1. `valuablesFirst = true` (default) — goodTemp burns before unchecked.
2. Smashes queued *first* in the loop, so goodTemp burns extend the mana
   pool before anything else drains it.
3. goodTemp burns don't increment `checked`. The %10 boundary is driven
   only by unchecked-branch increments, so banked goods aren't
   "consumed" toward the next boundary — they're free mana.

### Steady-state queue shape

Once `good > 0`, the canonical queue flips:

```
[Smash Pots × K]    ← burn goodTemp (+50 net each), then chip backlog
[Wander × W]        ← forward progress; grows pool for next loop
[other actions]     ← additional forward progress when state allows
```

`K` is sized to consume the goodTemp budget plus some backlog. `W` is
usually 1 in early arc (one Wander = 250 mana = whole baseline pool);
grows once stat-level cost reduction kicks in within a loop.

### Wander ≥ 3 → Pick Locks, Buy Mana unlock

Pick Locks (cost 400, +10 gold per good check; pool = wander × 1) and Buy
Mana (cost 100, exchanges all gold to mana at 50× rate). Both unlock at
`wander_level ≥ 3` (reached after 3 Wander completions, ~loop 3 of an
all-Wander early arc).

Pick Locks's 400 cost doesn't fit in a 250 pool until either banked mana
extends the loop OR stat-level cost reduction drops the adjusted ticks
enough. The first viable loop for Pick Locks is whichever one has both
the prereq (wander ≥ 3) and enough goodTemp burns ahead of it in the
queue to extend the pool past 400.

Pick Locks builds gold across loops. `locks.good` persists. Each
locks.good is a backlog-chipped lock that banked +10 gold; subsequent
loops' goodTemp burns yield +10 gold each (and `rewardEffects` fire).

### Buy Mana — gold to mana bridge

Cost 100, completion effects: spend all gold, addMana(gold × 50). The
exchange happens against a pre-batch gold snapshot so order-of-effects
inside `completionEffects` doesn't matter. The pattern is to bank gold
earlier in the same loop via Pick Locks (or carry-forward from prior
loops via `locks.good`), then run Buy Mana late in the loop to convert.
Per banked locks.good burned through Buy Mana: +10 gold × 50 = +500
mana, against the 100 mana Buy Mana itself costs.

### Wander ≥ 5 → Explore Forest, Wild Mana unlock

Explore Forest (cost 400, +100 forest XP, weights `{Per:0.4, Con:0.2,
Spd:0.2, Luck:0.2}`) and Wild Mana (cost 150, +250 mana per good check;
pool = forest × 5, weights `{Con:0.2, Int:0.6, Soul:0.2}`). Both unlock
at `wander_level ≥ 5`.

`wander_level = 5` requires 8 Wander completions (cumulative `wander.xp ≥
1500`, each Wander grants 200). Under all-Wander loops, that's 8 loops.

Once unlocked: REACH_FOREST_1 (the solver's first representative goal)
requires 1 Explore Forest completion. Explore Forest's 400 mana cost
doesn't fit in a baseline 250 pool, so the loop running it must have
banked mana (≥ 150 surplus) — typically via accumulated goodTemp burns on
pots and/or a Buy Mana hit at end of loop.

### Wild Mana — second-tier income channel

Cost 150, +250 mana per good check. Net per check (unchecked branch):
-150 + 25 = -125 mana average. Net per goodTemp burn: -150 + 250 = **+100
mana per burn**. Higher per-burn yield than pots (+50), but the pool size
scales with forest level instead of wander level, so reaching the first
%10 boundary on Wild Mana takes proportionally more forest leveling.

### Action-prereq cliff structure

The first-arc prereq chain:

```
Wander                       — always.
Pick Locks, Buy Mana         — wander ≥ 3.
Meet People                  — wander ≥ 10.
Explore Forest, Wild Mana    — wander ≥ 5.
Old Shortcut                 — wander ≥ 5  AND forest ≥ 1.
Gather Herbs                 — wander ≥ 5  AND Per_talent ≥ 1  AND loops ≥ 3.
```

Each prereq is checked at queue dispatch (`isActionVisible` in
action-runner). Failed-prereq actions are silently skipped at queue
walk time (`queue.canRun` returns `'never'`) — the cursor advances past
them without firing the action.

### Queue mutation taxonomy

Most queue mutations from loop to loop are small and local:

- **ADD** — insert a new action when a prereq just landed (e.g., add
  Pick Locks once wander crossed 3).
- **REMOVE** — delete an action that's no longer paying off (rare in
  practice — actions accumulate as the arc progresses).
- **CHANGE** — adjust the repeat-count of an existing slot
  (`Smash × 5` → `Smash × 7` when banked good supports more burns).
- **SPLIT** — divide a long slot across other actions (e.g.,
  `Wander × 10` becomes `Wander × 5, Smash × 3, Wander × 5` when an
  intervening mana-banking opportunity opens up).

The majority of the game is queue tweaks driven by observed state
changes from the last loop's completion. Players don't make strategy
swaps; they nudge.

## Regime transitions

Named for orientation. Loop counts and arc lengths are not estimated —
the simulator tells you when each transition lands for a given queue
trajectory.

- **Bootstrap** — wander-only / wander-first. No income channel; each
  loop is one Wander completion at the zero-buff cost.
- **Mana economy lights up** — first `good` banks. Queue flips to
  smash-first. Each banked good adds one goodTemp burn worth of mana
  surplus to subsequent loops.
- **Unlock cascade** — wander crosses 3 (Pick Locks, Buy Mana) and then
  5 (Explore Forest, Wild Mana, Old Shortcut). The queue grows;
  mutations become smaller and more local.

The first-arc port terminates here. The second arc (deep forest
progression, the eventual third town, dungeons, soulstones, multi-part
progress bars, the wider Idle Loops content) is out of scope.

## Citations

- **Closed-form receipts** (level XP curve, adjusted-ticks, talent
  multiplier, regular-var pool sizing, gold-mana exchange, cross-variant
  comparison): `open-loop-research/methodology/techniques/closed-form-progression/per-archetype/looper.md`.
- **Community gameplay analysis** (game overview, action-queue mechanics,
  mana-as-time discussion, soulstone prestige): `open-loop-research/analyses/complete/idle-loops-analysis.md`.
- **Reference implementation** (vanilla idle-loops source, multi-variant
  comparisons): `open-loop-research/reference-code/idle-loops-dmchurch/`,
  `…/idle-loops-omsi/`, `…/idle-loops-lloyd/`, `…/idle-loops-squirrel/`.
- **Predictor** (community-canonical headless idle-loops simulator, ~2.4k
  LOC — existence proof for headless simulation, not a search loop):
  `open-loop-research/reference-code/idle-loops-dmchurch/predictor.js`.
- **Looper port code:**
  - `src/showcase/archetypes/looper/data/actions.ts` — action defs, vanilla
    citations per row.
  - `src/showcase/archetypes/looper/data/progress-vars.ts` — progress-var defs +
    `scales` table.
  - `src/showcase/archetypes/looper/modules/loop.ts` — retention policy, mana
    drain, restart sequence.
  - `src/showcase/archetypes/looper/modules/mana.ts` — mana resource +
    `initialMana` tunable.
  - `src/showcase/archetypes/looper/modules/action-runner.ts` — per-tick
    dispatcher, completion effects.
  - `src/showcase/archetypes/looper/modules/action-formulas.ts` — adjusted-ticks +
    XP formulas.
  - `src/showcase/archetypes/looper/modules/stats.ts` — stat / talent
    SkillCategory wiring + curves.
  - `src/showcase/archetypes/looper/modules/zones.ts` — progress-var XP grant,
    regular-var `finishRegular`, level-up reactions.
