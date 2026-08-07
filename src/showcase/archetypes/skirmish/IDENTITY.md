# Skirmish — Identity

> **Status: all four architecture layers walk.** Match spine, continuous
> tactical sim, bilateral AI, and the pixi render field are live end-to-end —
> bot vs bot renders on screen. What remains is depth (economy spine, unit
> roster + counters, personas, balance lanes), not the skeleton. Sections
> marked _(TBD)_ get filled as those bones land.

## Identity line

Continuous tactical RTS — a **two-sided real-time combat archetype**: symmetric
factions, per-unit HP and target acquisition on a continuous 2D field, driven
first by **built-in AI on both sides** (bot vs bot), with player control as a
stretch. _(Formal pattern-language line pending — register in `_identity.md`.)_

## What this archetype is

Two economies fund two armies that contest one field. Units are free-moving
agents (continuous `(x,y)`), not lane-rail followers. The first-class player is
a *policy*: the shipping AI plays both sides, so the archetype is fully
exercisable — and balanceable — headless before a human ever touches it. The
pixi/webgl field renders the sim as a pure read-only projection.

## Rate-function spine / bucket _(TBD)_

Economy spine unresolved. Open fork: a **two-tier** model — a coarse economic
spine for balance sweeps (tug-style, cheap at sub-second ticks) vs. the fine
tactical sim for play. Decide early; it determines whether the bot reads the
same state in both.

## The loop / beat map _(TBD)_

Match-scoped: fund → build → engage → attrition → base fall. Beats measured off
the bot-vs-bot harness once the tactical sim walks, never authored.

## Layered architecture (the load-bearing design)

Spring-shaped separation — sim resolves, render draws, AI decides; each its own
perf budget:

| Layer | Budget | Source | Status |
|---|---|---|---|
| Economy + match + events + harness | fixed-step ~10–20Hz | engine + tug seeds | ✅ match spine (`match.ts`) |
| **Tactical sim** — 2D entities, brute-force targeting, unit-vs-unit combat, per-side spawn | fixed-step, deterministic | new | ✅ `tactical-sim.ts` (continuous 2D units, one type; broad-phase is the scale seam) |
| Bot policy — per-side, cadenced, in-match-guarded, bilateral | sub-Hz decision cadence | tug automation pattern | ✅ `automation.ts` (`decide` = spawn while affordable) |
| Render — pixi/webgl, own RAF + interpolation, read-only | 60fps | pixi (defender is SVG; this is heavier) | ✅ `PlayField.vue` (pixi field, Kenney sprites, per-unit position easing) |

Continuous positions live **here at the consumer layer**, never in the engine —
engine core stays a plain-data headless economic substrate.

## Growth ports

- Scale: brute-force targeting at tens of units → uniform-grid / spatial-hash
  broad-phase when counts demand it (and only then a candidate-primitive, if a
  second consumer converges).
- `SpatialInfluenceLayer` for bot reasoning (threat/frontier maps).
- Render interpolation: units currently ease toward sim truth (exponential
  smoothing, lag-on-stop). True fixed-timestep snapshot interpolation (prev +
  curr per sim tick, render at alpha) is the upgrade if motion needs to be
  frame-exact; the ease is smooth enough at 20Hz for now.
- Render is a **pixi** field, where defender's is SVG-on-reactivity — a second
  render tech in the scaffold, not a shared one. "Render = read-only projection
  of sim state" is the shared discipline (the Spring-shaped cut), not the tech;
  a pixi-field-with-interpolation recipe is N=1, so unregistered.
- Player-playable stretch: the player side swaps its AI policy for input;
  bilateral `AutomationTiers` gating already supports "policy on both sides."

## Engine fit (pattern → primitive)

Match/reset/economy/harness = direct engine primitives (`createReset`,
`createResource`, modifier chains, `runMatrixUntil`/`runSensitivity`,
`tunable`). Tactical spatial layer = **consumer-side, no engine primitive**
(deliberate — spatial-rendering-boundary-spec keeps continuous coords in the
render/consumer layer). Candidate-primitive receipts land in
`candidate-primitives.md` only if a second spatial
consumer converges — not from this archetype alone.

## Balance model

Not yet built — skirmish has no `balance/` directory, which is the concrete form
of the `_(TBD)_` spine above. What it owes, once the economy is declared: the
closed form as prose beside the constants in `data/*.ts` § Balance and again as a
runnable projection; probes driving the shipping bilateral AI headless and
printing what they measure. The driver is already the right shape — shipping
automation (`modules/automation.ts`, tier-gated), never a bespoke bot.

Its behavioral suites already sit where the canon puts them —
`modules/{automation,match,tactical-sim}.test.ts`, beside the modules they spec,
over `sim/harness.ts`. Skirmish is the reference for that axis and for the
`AutomationTiers`-gated driver; see `.claude/rules/archetype-authoring.md`
§ Conformance.

## Hack-from references

Growth ports read the sibling archetypes **in place**: tug for the adversarial
spine (`modules/match.ts`, `data/units.ts`, `data/counter-matrix.ts`,
`data/personality.ts`, `balance/bot.ts`) and defender for movement + the render
seam (`modules/map.ts`, `ui/panels/MapCanvas.vue`). A bone consumes a reference by
*porting* it — adapting to skirmish — and the port is what's committed, never the
raw copy.

There is no staged copy of them here. A `_seeds/` tree used to hold verbatim
duplicates for hacking; it was dropped because every file in it was byte-identical
to the live sibling it came from, so it preserved nothing and cost a tsconfig
exclude, an eslint blind spot, and a second place for the same code to rot. Read
the siblings. `antigravity-creep-pvp` contributed one idea (influence-field
logistics with supply-cutoff decay), not code.
