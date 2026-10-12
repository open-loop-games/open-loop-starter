# Tug — archetype identity

> **The shared lane — two economies feeding one contested path — which no pattern
> names, over `scaled-opposition` + `positional-effect` + `loss-on-failure` +
> `ending`, with `meta-progression` carrying a career across matches**, and the
> opponent's economy as a live zero-sum pressure source. You author pressure
> against another agent authoring pressure in the same shared space; what you earn
> outlasts the match.

**Spine-formed.** The SciFi Armada content (units, personas, counter-matrix) is
declared invention — numbers are perturbation surface settled against the spine
by engine-as-oracle sensitivity sweeps, never lifted from a single exemplar. The
lane-push / tug-of-war genre validates the shape ships in the wild — cited as a
set, never lifted. Identity line source: `../_identity.md` (Tug entry); the line's
player experience, exemplar calls and lineage are `../_docs/tug.md`. **Core · open
core** — one exemplar (Warfare 1917) is sourced and the patterns above are the ones
it carries; the lane itself has no pattern and no decline read yet.

**This build does not yet show what makes the line core.** The career across
matches ships dormant (§ Growth ports), and without it the build is a one-lane
Skirmish. Waking it is a spine amendment, not a toggle.

## What this archetype is

You and the opponent feed the same lane. You spend income on unit production;
the units auto-walk toward the opponent's base; theirs auto-walk toward yours;
when the two streams meet somewhere in the middle they resolve combat without
commands, and the survivors keep walking. The front-line drifts toward whichever
side is losing DPS races, and the match ends when one base's HP reaches zero.
The player's decisions are composition (what unit types to buy), timing (send
now or bank for a larger wave), counter-reading (opponent massed light armor —
pivot to splash), and upgrade allocation (income upgrades delay presence now but
pay off later). Moment-to-moment APM is low **by design**; strategic depth lives
in the composition decision space and in reading the opponent's output, since
every unit they send is visible evidence of their intentions.

A first 1–2 hours unfolds across 2–4 matches (each 15–30 minutes). Match 1 is
onboarding; match 2 is where counter-picking shows up; match 3 is where timing
discipline emerges. The signature pleasure is the moment after a bad early
composition when a well-timed pivot reverses the front line in one send; the
corresponding pain is the moment your opponent recognizes your tank-heavy push
and drops splash before your tanks arrive.

## Rate-function spine / bucket

**Bucket: adversarial zero-sum lane over an `escalating-price` economy — no
single closed form.** Each side's economy is a familiar spine (geometric
income-upgrade ladders feeding unit production), but it runs _inside a match against a
live opposing economy_, so the archetype's pacing is not a fire-time curve — it
is a **distribution** over stochastic match outcomes. That is the honest
consequence of being adversarial: as with any wide interacting graph, the whole
has no projectable closed form, which is why balance here is **measure-and-record
via distribution statistics** (§ Balance model), not projected from a spine.

Two structural properties make it _this_ archetype rather than a solo producer:

- **The opponent economy is a live pressure source that ships as game code.**
  The AI (`modules/opponent-bot.ts`, side-parameterized) is a real module, not a
  harness fixture — its auto-send _is_ the adversarial mechanic the player reads
  and counters. The player, by contrast, is a **human** (manual send, low APM by
  design); there is no player auto-send policy to ship. In headless sim the
  shipping AI plays _both_ sides (bilateral-symmetric) precisely because there is
  no human — a deliberate sim fiction, harness-side by the automation-as-game-code
  convention's carve-out.
- **The counter matrix is data, not a chain** — an N×N damage-type multiplier
  table the per-tick combat resolver reads as a 2D lookup. Its _sharpness_
  (`strongCounter`) is the signature balance knob, and the archetype's centerpiece
  metric is the sensitivity of counter-pivots-per-match to it (methodology #3).

## The arc — beat map

Six ordered player-experience phases across a ~75min cumulative arc (2–4
matches at the 30-min limit); the **measured** windows + predicates live in
`balance/beats.ts`, never authored:

1. **first-unit-purchased** — the shop → send loop becomes concrete in under a
   minute.
2. **first-auto-resolve-combat** — validates "set composition, watch it play
   out"; the archetype's defining moment.
3. **first-counter-pivot** — the counter-matrix depth enters; the auto-battler
   becomes a strategy game.
4. **first-match-completion** — arc half-way; the match loop closes cleanly.
5. **second-match-composition-pivot** — learning transfers across matches
   (needs the multi-match driver; see § Balance model).
6. **counter-mastery-demonstrated** — at least two counter matchups internalized.

The phase order and each phase's intent are **fixed identity** — a fork changing
the adversarial spine or the counter-matrix centerpiece has forked into a
sibling. The ~75min cumulative budget covers the headless beat span at the 30-min
match limit.

## Growth ports (validated-but-deferred)

- **Cross-match meta-progression** — the line's defining layer, not an optional
  direction: `modules/prestige.ts` + `metaProgressionEnabled` gate ship dormant
  (production skeleton: off). The between-match window is where a persistent
  power/roster layer grows in, and it lands with its spine term.
- **Opponent-persona rotation** — persona is bound at module install today; the
  `balance/_match-driver.ts` between-match seam is the documented insertion point for a
  player-facing "rotate opponents per match" toggle or a tuner sweeping persona
  pairs (`TODO(expansion)` there).
- **Spendable abilities** — `data/abilities.ts` sketches an active-ability layer
  over the passive send loop.
- **Player-side automation** — tug has no player-facing automation today;
  `modules/opponent-bot.ts` is an AI opponent, which is gated by install-presence
  rather than a tier. An auto-sender or auto-upgrade layer is the shape that would
  earn an `AutomationTiers` ladder, per `.claude/rules/archetype-authoring.md`
  § Conformance.
- **Live PvP** — the overview's endgame: against a second human the counter
  space becomes combinatorial. The shipping AI is the single-player stand-in.

## Engine fit (pattern → primitive)

| Pattern                      | Engine primitive                                  | Note                                                |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| income (substrate)           | per-side income `Resource` + rate chain           | both sides accrue symmetrically at `baseIncomeRate` |
| `escalating-price` upgrades  | geometric refinery ladders (`tunable()` costs)    | the fixed-strategy ROI surface (methodology #5)     |
| unit production + send       | per-side unit shop + sequencer + cooldowns        | send dispatches a unit into the shared lane         |
| the shared lane (no pattern) | single shared `lane` module, all-pairs combat     | fortress treated as just-another opposing unit      |
| `type-effectiveness`         | N×N data table read by the combat resolver        | `strongCounter` sharpness = signature knob          |
| Adversarial pressure         | `modules/opponent-bot.ts` (side-parameterized AI) | ships as game code; auto-send IS the mechanic       |
| Match orchestration          | `modules/match.ts` (start/end/reset, events)      | `matchEnded` fires pre-reset — capture then         |
| Perturbation                 | module `TuningRegistry` (`tunable()`)             | unit costs, refinery, fortress HP, matrix sharpness |

## Balance model

Measure-and-record — the signature is a distribution response curve, not a
fire-time. `BALANCING.md` beside this file is the working guide: the knobs, what
couples to what, and how to read each probe. In brief:

- **The spine, as prose + math** — the `// ─── Balance ───` sections in
  `data/*.ts` name each unit cost, matrix cell and refinery value with its
  coupling.
- **The probes** — `balance/arc-probe.ts` drives the real engine and the
  **shipping AI** through `balance/_engine.ts`'s bilateral sim-engine builder: fire-time
  checks, the counter-strong sensitivity signature, an income-upgrade ROI
  snapshot, match-duration statistics, and a framework-correctness dominance
  gate that verifies instrumentation rather than tuning anything.
  `balance/retune-probe.ts` sweeps the persona matrix for a viable-strategy data
  slice. Both lean on `balance/_match-driver.ts` for cumulative multi-match beats.
- **The behavioral suites** — `sim/match-scope.test.ts` covers match-scope reset
  and `sim/tug.sim.test.ts` the behavioral shape. `sim/data-invariants.test.ts`
  holds counter-matrix shape, and `sim/instrumentation.test.ts` verifies the
  measurement path with every expectation derived from the data — no magnitudes,
  per `open-loop-engine/docs/consumer-guide-balance.md` § Why this isn't a test
  suite.

## Cross-references

- Exemplars and lineage (shape validation, not lift targets): `../_docs/tug.md`
- Working on the numbers: `BALANCING.md` (beside this file)
- Balance methodology: `open-loop-engine/docs/consumer-guide-balance.md`;
  archetype-specific authoring in `.claude/rules/archetype-authoring.md`
- Back-flow entries this archetype is a receipt for:
  `candidate-primitives.md` § `createMatchDriverModule({ matchKey })` and
  `candidate-recipes.md` § Bilateral sim-bot
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
