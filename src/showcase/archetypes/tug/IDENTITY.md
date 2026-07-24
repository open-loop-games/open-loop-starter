# Tug — archetype identity

> **Adversarial Auto-Send Lane Push** — Resource Accumulation + Auto-Production
> spine over a Routing-Traversal shared lane, with the opponent's economy as a
> live zero-sum pressure source. You author pressure against another agent
> authoring pressure in the same shared space.

**Forward-ish composition** (see `../README.md` § Two honest ways to source
numbers): the SciFi Armada content (units, personas, counter-matrix) is
**declared invention** — numbers are perturbation surface balanced against the
spine by engine-as-oracle sensitivity sweeps (methodology #3), not lifted from a
single exemplar. The lane-push / tug-of-war genre validates the shape ships in
the wild — cited as a set, never lifted. Identity line source:
`archetypes/_identity.md` (Tug row).

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

**Bucket: adversarial zero-sum lane over a Cost-Scaling economy — no single
closed form.** Each side's economy is a familiar spine (geometric income-upgrade
ladders feeding Auto-Production units), but it runs *inside a match against a
live opposing economy*, so the archetype's pacing is not a fire-time curve — it
is a **distribution** over stochastic match outcomes. That is the honest
consequence of being adversarial: like a wide-graph clone, the system as a whole
has no projectable closed form, which is why balance here is **measure-and-record
via distribution statistics** (§ Balance model), not projected from a spine.

Two structural properties make it *this* archetype rather than a solo producer:

- **The opponent economy is a live pressure source that ships as game code.**
  The AI (`modules/opponent-bot.ts`, side-parameterized) is a real module, not a
  harness fixture — its auto-send *is* the adversarial mechanic the player reads
  and counters. The player, by contrast, is a **human** (manual send, low APM by
  design); there is no player auto-send policy to ship. In headless sim the
  shipping AI plays *both* sides (bilateral-symmetric) precisely because there is
  no human — a deliberate sim fiction, harness-side by the automation-as-game-code
  convention's carve-out.
- **The counter matrix is data, not a chain** — an N×N damage-type multiplier
  table the per-tick combat resolver reads as a 2D lookup. Its *sharpness*
  (`strongCounter`) is the signature balance knob, and the archetype's centerpiece
  metric is the sensitivity of counter-pivots-per-match to it (methodology #3).

## The loop — beat map

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

- **Cross-match meta-progression + prestige** — `modules/prestige.ts` +
  `metaProgressionEnabled` gate ship dormant (production skeleton: off). The
  between-match window is where a persistent power/roster layer grows in.
- **Opponent-persona rotation** — persona is bound at module install today; the
  `match-driver.ts` between-match seam is the documented insertion point for a
  player-facing "rotate opponents per match" toggle or a tuner sweeping persona
  pairs (`TODO(expansion)` there).
- **Spendable abilities** — `data/abilities.ts` sketches an active-ability layer
  over the passive send loop.
- **Live PvP** — the overview's endgame: against a second human the counter
  space becomes combinatorial. The shipping AI is the single-player stand-in.

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Resource Accumulation | per-side income `Resource` + rate chain | both sides accrue symmetrically at `baseIncomeRate` |
| Cost-Scaling income upgrades | geometric refinery ladders (`tunable()` costs) | the fixed-strategy ROI surface (methodology #5) |
| Auto-Production | per-side unit shop + sequencer + cooldowns | send dispatches a unit into the shared lane |
| Routing-Traversal lane | single shared `lane` module, all-pairs combat | fortress treated as just-another opposing unit |
| Counter matrix | N×N data table read by the combat resolver | `strongCounter` sharpness = signature knob |
| Adversarial pressure | `modules/opponent-bot.ts` (side-parameterized AI) | ships as game code; auto-send IS the mechanic |
| Match orchestration | `modules/match.ts` (start/end/reset, events) | `matchEnded` fires pre-reset — capture then |
| Perturbation | module `TuningRegistry` (`tunable()`) | unit costs, refinery, fortress HP, matrix sharpness |

## Balance model — three lanes

Measure-and-record (adversarial; the signature is a distribution response curve,
not a fire-time). See `../README.md` § Balance:

```
data/*.ts ─ Balance ─   →   balance/*.ts (vite-node)                →   sim/*.test.ts
Cost-Scaling + matrix lens   arc + sensitivity + retune probes           measured-window + framework lock
"what the economy says"      "what shipping code + AI does"              "what must stay true"
```

1. **Lens** — the `// ─── Balance ───` sections in `data/*.ts` name each unit
   cost / matrix cell / refinery value and its coupling.
2. **Probe** — `balance/arc-probe.ts` runs the six probes (beat locks,
   the methodology-#3 counter-strong sensitivity signature, income-upgrade ROI,
   match-duration p50, and a framework-correctness archetype-dominance gate)
   against the real engine + **shipping AI** via `bot.ts`'s bilateral sim-engine
   builder + `tug-outcome` analyzer; `balance/retune-probe.ts` sweeps the 4×4
   persona matrix for a viable-strategy data slice. Both lean on
   `match-driver.ts` (sim-only multi-match orchestration) for cumulative beats.
3. **Lock** — `sim/balance.probe.test.ts` pins the measured beat windows;
   `sim/match-scope.test.ts` locks match-scope reset behavior; `sim/tug.sim.test.ts`
   holds the behavioral shape. Framework-correctness (instrumentation intact)
   rides probe 6, not a magnitude lock.

## Cross-references

- Genre exemplars (shape validation, not lift targets): the lane-push /
  tug-of-war lineage — Age of War and the Warcraft III tug-of-war custom-map
  family
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-tug.md`
- Candidate primitive: `candidate-primitives.md`
  § bilateral-symmetric sim-bot pattern (parked at N=1)
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
