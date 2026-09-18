# Skirmish — Identity

## Identity line

> **Real-time strategy** — a design claim from the genre: **N factions**, each
> funding an army from a compounding economy, contesting one continuous field in
> real time; build order, composition and engagement are the decision surface
> because rivals make theirs at the same time, and policies drive the seats.

Registered in `../_identity.md` (Skirmish row). Grounding: **neither** — the tag
region is RTS by definition, the corpus holds no sourced exemplar for the shape,
and no row is cited. The economy is the substrate every archetype shares (a stock,
a rate, a spend); the opponents are what is load-bearing rather than decorative,
and they come from the adjacent game-AI corpus
(`open-loop-research/patterns/adjacent/ai-rosters.md` — a keyed collection of
behavioural variants, drawn from at match creation).

**N factions, not a duel** — this is the line against Tug, whose identity is
bilateral zero-sum over one shared lane _by construction_. Three armies can meet;
two can be left to bleed each other while a third expands; threat is directional
and unevenly distributed, so _who to fight_ sits alongside how much to build.
Free-for-all is the base case, teams a friend/foe relation over the same
substrate. The current cut seats two (`Side = 'a' | 'b'`) — that is a first
implementation, not the archetype, and § Growth ports carries the widening.

**No spatial row is in this line, deliberately.** `positional-effect` wants
outcomes that turn on arrangement and `player-siting` wants acquiring and siting
as two decisions; skirmish has neither. Units acquire and close. The field is where attrition _resolves_ rather
than a surface anyone authors — it is load-bearing in the spine (it sets how many
units are in contact at once) without being a pattern the player composes.
Claiming either sibling here would be the easy mis-file.

## What this archetype is

Each faction funds an army that contests one shared field. Income splits between
compounding the economy and building units; units are free-moving agents
(continuous `(x,y)`), not lane-rail followers, and they acquire and engage on
their own once committed. A faction loses when its base breaks.

The first-class player is a _policy_: the shipping AI drives every seat, so the
archetype is fully exercisable — and balanceable — headless before a human ever
touches it. A player seat is that policy swapped for input. The pixi/webgl field
renders the sim as a pure read-only projection.

## Rate-function spine / bucket

**Bucket: the exponential family — guns-versus-butter allocation.** The RTS
economic decision is a split, not a curve. A faction reinvests a fraction `φ` of
income into the economy, which compounds, and spends `1 − φ` on army, which is
consumed. For a _fixed_ `φ` the whole trajectory closes
(`incremental-math/…/rate-functions/exponential`):

    E(t) = E₀ · e^(φ · r · t)                        economy, compounding
    A(t) = ((1 − φ)/φ) · E₀ · (e^(φ · r · t) − 1)    army mass committed by t

Two consequences the archetype is built on. Army mass is _proportional to the
economy's own growth_, so a higher `φ` buys strictly more army later at the cost
of everything earlier — the tradeoff is a timing curve, not a magnitude. And
because the exponent carries `φ`, two factions separated by a small split
difference diverge exponentially: an early advantage compounds unless it is
spent. That is the RTS opening in closed form, and it is what the beat map is
measured against.

**Where the closed form stops — three named places, in order of how much they
cost:**

1. **The optimum for `φ` is a best-response fixed point, not an expression.**
   The right split depends on rivals' splits, so this is _strategy-space
   integration_ (`…/rate-functions/bifurcations#strategy-space-integration`):
   per-fixed-strategy ROI closes per the algebra, `σ* = BR(σ*)` does not.
   Skirmish inherits the bucket's own caveat — the closed-orbit results it
   illustrates are zero-sum ones, and at N ≥ 3 factions even that shelter is
   gone.
2. **The attrition exchange is coupled-state deterministic**
   (`…/bifurcations#coupled-state-deterministic`, which names multi-faction
   warfare outright). Armies mutually consume each other; a conserved quantity
   exists — Lanchester's square law in the fully-engaged limit, since targeting
   is aimed (`modules/tactical-sim.ts`, `nearestEnemy`) — but the
   time-parametrization does not. Worse, units arrive as a _stream_ rather than
   a mass, so the engaged fraction is itself dynamic and the square law is a
   bound rather than the model.
3. **Cadence jitter is stochastic load-bearing** where it is switched on
   (`AutomationOptions.cadenceJitter`). The distribution over seeds carries the
   design intent — a persona matchup that wins 60% is a different design object
   from one that wins 100% — so the mean is not the answer.

**What measures the remainder:** distribution statistics over seeded bilateral
runs, in the shape tug already proves out — a win-rate surface over the split
axis, and a match-duration distribution rather than a match-duration number.
Partial coverage: the opening projects, the war is measured.

**Where `φ` lives.** `data/economy.ts` carries `ρ`, `c` and `E₀` with the closed
form as prose; `modules/economy.ts` owns the mechanism (workers, income,
reinvestment) and `modules/automation.ts` owns the policy, because the split is a
_seat's strategy_ rather than a global constant — two seats hold different values
at once, which is why `economyShare` sits on `AutomationOptions` and not in the
tuning registry. The shipping matchup is rush (`φ = 0`) against greedy
(`φ = 0.5`).

**One discrete artifact the closed form cannot see.** A worker costs more than a
unit, so investment is a _lump_ against a continuous income stream: a policy that
commits its remainder to army every decision slot never banks the worker price,
and `φ` silently realizes as 0 regardless of what a persona asked for. The
policy therefore reserves the worker price while under target. The continuous
model has no term for this — it is why the projection this spine owes is a bound
rather than a prediction, and it is recorded at `data/economy.ts` § Coupling.

## The loop — beat map

Match-scoped: **fund → build → commit → engage → break**. Six ordered
player-experience phases; the **measured** windows and predicates belong in
`balance/beats.ts`, never authored — that file is owed with the economy bone.

1. **first-income-decision** — the split becomes real: income can go to economy
   or to army and cannot go to both.
2. **first-army-committed** — the opening ends; units leave the base with the
   economy at whatever `φ` bought.
3. **first-contact** — armies meet. The first read on whether the split was
   right, and the archetype's defining moment.
4. **first-engagement-decided** — one army breaks. Attrition asymmetry becomes
   legible as a _consequence of the opening_ rather than as noise.
5. **recovery-or-collapse** — the losing faction either rebuilds off a compounded
   economy or cannot. This is where `φ` pays or doesn't, and it is the beat the
   spine most directly predicts.
6. **base-broken** — the match resolves.

The phase order is **fixed identity**: an economy phase that does not precede
commitment, or a commitment with no recovery window behind it, has forked into a
sibling. Beats 3–5 are the ones that only exist because rivals are live; a
single-seat game reaches beat 2 and stops.

## Layered architecture (the load-bearing design)

Spring-shaped separation — sim resolves, render draws, AI decides; each its own
perf budget:

| Layer                                                                                      | Budget                    | Source                                                        | Status                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Economy + match + events + harness                                                         | fixed-step ~10–20Hz       | engine + tug seeds                                            | ✅ match spine (`match.ts`)                                                                                   |
| **Tactical sim** — 2D entities, brute-force targeting, unit-vs-unit combat, per-side spawn | fixed-step, deterministic | new                                                           | ✅ `tactical-sim.ts` (continuous 2D units, one type; broad-phase is the scale seam)                           |
| Bot policy — per-side, cadenced, in-match-guarded, bilateral                               | sub-Hz decision cadence   | tug automation pattern                                        | ✅ `automation.ts` (`decide` = spawn while affordable)                                                        |
| Automation progression — the player seat's unlock gate                                     | per-seat, reactive        | `AutomationTiers`                                             | ✅ `automation-tiers.ts` (`manual → assisted`; opponent seats pass no tier and are gated by install-presence) |
| Render — pixi/webgl, own RAF + interpolation, read-only                                    | 60fps                     | pixi (heavier than SVG-on-reactivity; chosen for unit counts) | ✅ `PlayField.vue` (pixi field, Kenney sprites, per-unit position easing)                                     |

Continuous positions live **here at the consumer layer**, never in the engine —
engine core stays a plain-data headless economic substrate.

## Growth ports

A fork grows the archetype _up_ through these. The first two are the identity
line's own unbuilt half, and they feed named spine terms.

- **The split channel** — a reinvestment sink so `φ` exists: income can buy
  economy instead of army. Feeds `E(t)` / `A(t)` directly; without it the
  economy is flat and every faction is pinned at `φ = 0`.
- **N factions** — `Side = 'a' | 'b'` widens to a faction set with a friend/foe
  relation, making free-for-all the base case and teams a relation over it.
  Feeds the coupled-state term: at N ≥ 3 the exchange loses even the zero-sum
  shelter, which is where the archetype's balance question gets its teeth.
- **Unit roster + counters** — 3-unit rock-paper-scissors roster (trooper,
  archer, cavalry) with counter matrix (tug's `data/counter-matrix.ts` pattern);
  verified in `balance/roster-probe.ts`.
- Scale: brute-force targeting at tens of units → uniform-grid / spatial-hash
  broad-phase when counts demand it (and only then a candidate-primitive, if a
  second consumer converges).
- `SpatialInfluenceLayer` for bot reasoning (threat/frontier maps).
- Render interpolation: units currently ease toward sim truth (exponential
  smoothing, lag-on-stop). True fixed-timestep snapshot interpolation (prev +
  curr per sim tick, render at alpha) is the upgrade if motion needs to be
  frame-exact; the ease is smooth enough at 20Hz for now.
- Render is a **pixi** field rather than SVG-on-reactivity — a second
  render tech in the scaffold, not a shared one. "Render = read-only projection
  of sim state" is the shared discipline (the Spring-shaped cut), not the tech;
  a pixi-field-with-interpolation recipe is N=1, so unregistered.
- Player-playable stretch: a seat swaps its AI policy for input; the per-seat
  `AutomationTiers` gate already supports "policy on every seat."

## Engine fit (pattern → primitive)

Match/reset/economy/harness = direct engine primitives (`createReset`,
`createResource`, modifier chains, `runMatrixUntil`/`runSensitivity`,
`tunable`). Tactical spatial layer = **consumer-side, no engine primitive**
(deliberate — spatial-rendering-boundary-spec keeps continuous coords in the
render/consumer layer). Candidate-primitive receipts land in
`candidate-primitives.md` only if a second spatial
consumer converges — not from this archetype alone.

## Balance model

Measure-and-record over an intransitive payoff matrix — there is no correct `φ`,
only a best response. `BALANCING.md` beside this file is the working guide: the
knobs, what couples to what, how to read each probe. In brief:

- **The spine, as prose + math** — `data/economy.ts` § Balance carries `E(t)`,
  `Aˢ(t)` and the `c > unitCost` coupling; `data/tactical.ts` § Balance carries
  the attrition constants the closed form does not reach.
- **`balance/skirmish-projection.ts`** runs the closed form with no engine and
  reports army as an **upper bound** rather than a prediction — the reserve and
  the purchase cadence both make the real army smaller. It also prints the
  economic crossover against pure rush, which is what says whether the economy
  can matter inside a match at all.
- **`balance/split-probe.ts`** is the signature probe: the payoff matrix over
  `φ` on both seats. It checks its own diagonal for mirror symmetry first,
  because an asymmetric sim produces balance findings that are really bugs.
- **`balance/arc-probe.ts`** drives the shipping automation through the default
  matchup and reports each beat against its measured window.

The driver was already the right shape — shipping automation
(`modules/automation.ts`, tier-gated), never a bespoke bot — so the probes drive
real game code rather than a re-implementation of it.

Its behavioral suites already sit where the canon puts them —
`modules/{automation,match,tactical-sim}.test.ts`, beside the modules they spec,
over `sim/harness.ts`. Skirmish is the reference for that axis and for the
`AutomationTiers`-gated driver; see `.claude/rules/archetype-authoring.md`
§ Conformance.

## Hack-from references

Growth ports read the sibling archetypes **in place**: tug for the adversarial
spine (`modules/match.ts`, `data/units.ts`, `data/counter-matrix.ts`,
`data/personality.ts`, `balance/_engine.ts`). Movement and the render seam are
skirmish's own — `modules/tactical-sim.ts` and `ui/PlayField.vue`.

A bone consumes a reference by _porting_ it — adapting to skirmish — and the port
is what's committed, never the raw copy. Read the siblings where they live; no
staged copy belongs here, since a duplicate preserves nothing and gives the same
code a second place to rot.
