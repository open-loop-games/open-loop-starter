# Game Archetypes — Pattern-Composed Starting Points

Seven forkable archetypes, each a pattern-composition skeleton validated by the
research corpus. Each archetype ships as its own spec + vars schema + sim-test
harness; themes are costumes layered on top. This is where research → engine →
games closes the loop.

Per-archetype specs live in `archetypes/<name>.md`. This file is the index,
framing, and build order.

---

## The pipeline

```
research corpus   ──→   engine primitives   ──→   archetype skeletons   ──→   forked games
(analyses,              (resource, reset,         (per-archetype               (themed,
 12 patterns,            loop, challenge,          spec + vars +                tuned,
 novel clusters)         zone, inventory, …)       sim tests)                   extended)
```

The research corpus catalogued the genre's behavioural patterns across 78+
games. The engine implemented the primitives those patterns decompose into.
Archetypes are the third step: validated pattern *compositions* — the recipes
that combine primitives into coherent game shapes — and the starter makes them
forkable.

A fork picks an archetype, swaps the costume, tunes the balance vars, adds
content. The skeleton plus the engine does the rest.

---

## Skeleton + Theme

An **archetype** is a skeleton: a named pattern composition (e.g.
*Multi-layer Prestige + Challenge + Deep Modifier Chains*) with a canonical
engine-surface usage, a canonical beat map, and a canonical set of balance
knobs.

A **theme** is a costume over the skeleton: resource names, art, flavour copy,
narrative framing. "Antimatter physics," "dream lucidity," "empire collapse"
are all themes over the same Scaler skeleton.

**Exemplar games are validation, not clone targets.** Each archetype cites the
games from the corpus that exemplify its composition — as proof the skeleton
has been stress-tested in the wild. You are not asked to clone them; you are
inheriting a composition they proved viable.

---

## The first-completion arc

Every archetype proves one **first-completion arc**: a single full traversal of
the skeleton (first producer → first upgrade → first prestige, or the
archetype's equivalent), ported faithfully from one canonical exemplar. The arc
is defined by *content* — the slice of the canonical game it reproduces — not by
a target clock. How long that traversal takes is **measured from the built
system, never prescribed**: you port the canon math faithfully, then observe how
the arc paces. Inventing a duration target and bending the source numbers to hit
it distorts the very math the port exists to preserve (see § Dev-loop
integration — measure-and-record).

This is the *showcase* arc. A fork that wants a longer game extends after the
skeleton lands. The first arc is what the shared archetype proves; the long tail
is what the fork proves.

---

## Dev-loop integration

Each archetype spec is a **harness-testable game shape**, not just a content
sketch. The harness is the agent's feedback loop — how it confirms its own work
runs — so it stays. What's retired is the inverted authoring it used to imply.

- **Beat map** — 5–8 ordered milestones across the arc (first producer, first
  prestige, …). Beats are *labels* for where the arc turns; their **sim-time
  windows are measured from a harness run and recorded, never authored as
  targets**. A beat with no recorded window yet is honest — it just hasn't been
  measured.
- **Balance probes** — Workbench perturbations (cost scaling ±20%, tick rate
  ±10%, …) that observe how each beat moves under stress.
- **Sim assertions** — headless `runHeadless` / `runMatrix` tests, checked in,
  that lock the *measured* beat windows (with tolerance) as regression guards.

**Measure-and-record, never set-as-target.** Port the canon math faithfully
first; then run the harness to see where the beats land and record those
windows. The sim test guards the observed behavior from regressing — it is not a
target you tune the source numbers toward. Bending costs/rates to hit an
invented window distorts the canonical math the port exists to preserve (the
mistake the old "write the sim test first, tune until it passes" loop baked in).
Forks inherit the beat labels and probes when they theme a skeleton, and
re-measure after they retune.

Wires through `src/ui/panels/BalanceWorkbench.vue` and
`open-loop-engine/harness`.

---

## Vars layering

Archetype code has two homes, one level apart:

- **`src/archetypes/<name>/`** — archetype-level. Shared TypeScript types and
  default-vars constants. One copy, imported by every game of this archetype.
  This is the contract layer.
- **`src/modules/mods/<game>/vars/`** — game-level. A fork's own copy of the
  defaults, deep-merged at load. This is the tuning surface.

Each game owns three vars files, deep-merged at load in this order:

```
src/modules/mods/<game>/vars/
  archetype.ts   # defaults from the archetype template — scaffold copy-in
  theme.ts       # names, flavour, UI copy — no mechanical impact
  balance.ts     # cost/rate/threshold overrides — mechanical
```

Tests override directly:

```ts
runSim({ ...loadVars(), balance: { ...balance, costScaling: 1.15 } })
```

A fork that diverges *structurally* replaces `archetype.ts` and forfeits the
shared tuning template — acceptable trade. A fork that re-themes edits only
`theme.ts` and is mechanically identical to its parent archetype.

The `archetype.ts` schema is generated from the per-archetype doc's vars
section via `pnpm codegen:archetype-vars <name>` (pending); the doc is the
source of truth, codegen keeps the types honest.

---

## Base modules

Shared by every archetype:

| Module | Role |
|--------|------|
| settings | Theme, notation, autosave |
| ui-registry | Slot-based panel/screen registration |

That's it. All content — resources, producers, actions, progression, UI layout
— is per-archetype. (The current starter has gathering/economy/progression as
always-on base modules; migrating them out is Phase 0 work.)

---

## The 8 archetypes

Each archetype has its own doc in `archetypes/<name>.md` following the shared
10-section template (`archetypes/_template.md`). Six were enumerated top-down
from pattern composition; two (Phase-shifter, Director) are candidates —
Phase-shifter derived from novel-patterns cluster evidence, Director surfaced
bottom-up from a shipped mod (OL-504) whose composition didn't fit any of the
first seven.

### 1. Producer — `archetypes/producer.md`

Pure A+C Activity + Cost Scaling + Achievement multipliers. Big numbers go
brrr. Buy things that make things that make things.

- *Exemplars:* Cookie Clicker, Egg Inc, AdVenture Capitalist
- *Primary stress:* modifier chain depth, cost-formula inversion at scale,
  "does the engine feel clean at 30% surface use?"

### 2. Looper — `archetypes/looper.md`

Loop/Cycle + Mastery + Zone + Action Queue. Repetition with retention. Each
run you get a little better at the same content; the loop IS the game.

- *Exemplars:* Idle Loops, Progress Knight, Groundhog Life
- *Primary stress:* loop reset correctness, action queue strategies,
  recommendation-system convergence

### 3. Scaler — `archetypes/scaler.md`

Multi-layer nested Prestige + Challenge + deep Modifier Chains. Layered
compression — what took an hour now takes seconds; each prestige reveals a new
game on top of the old one.

- *Exemplars:* Antimatter Dimensions, Synergism, NGU Idle
- *Primary stress:* multi-layer reset coordination, modifier chain ordering,
  Formula at extreme scales

### 4. Interlocker — `archetypes/interlocker.md`

Wide multi-resource graph + Conversion chains + Synergy. Wide, not deep. Many
resources interlock; you're managing a system, not chasing a number.

- *Exemplars:* Kittens Game, Evolve
- *Primary stress:* multi-resource cost requirements, conversion chain synergy,
  crafting-recipe primitive gaps

### 5. Explorer — `archetypes/explorer.md`

Spatial Zone-as-gameplay + Discovery + Inventory. The map IS the game. Fog of
war, territory to chart, equipment earned through traversal.

- *Exemplars:* Level13, Cavernous II, Trimps (spatial-traversal slice)
- *Primary stress:* zone-scoped content queries, worker identity + position
  composition, item-identity vs. fungible-resource boundary

### 6. Scripter — `archetypes/scripter.md`

Programmable action queue + Automation gradient. The artifact is code — the
player writes programs that the engine executes. Honours novel-patterns
cluster #1 ("Programming-as-Gameplay," 7 games, ~10% of corpus).

- *Exemplars:* Bitburner, Nucaranlaeg, Points Progression
- *Primary stress:* action-queue programmability, sandboxed execution,
  automation-tier unlock gradient

### 7. Phase-shifter *(candidate)* — `archetypes/phase-shifter.md`

Narrative-driven Phase Transitions + mechanic swap. Each phase the game
changes what the player does — story unlocks reveal new mechanics, old ones
sunset. Honours novel-patterns cluster #12 ("Phase Transitions," 20+ games).

- *Exemplars:* A Dark Room, Universal Paperclips, Candy Box 2
- *Status:* candidate — may collapse to a modifier layer over other
  archetypes. Build it to find out.
- *Primary stress:* mechanic lifecycle (install / disable / replace),
  narrative trigger wiring, content-swap UX

### 8. Director *(candidate)* — `archetypes/director.md` *(prework at `archetypes/_director-prework.md`)*

Declarative goals + autonomous multi-agent simulation + spatial arena +
round-scoped prestige. Player is observer-and-steerer, not actor: set goals,
the sim runs across 4 factions (3 AI + player), round resolves on a timer.
Surfaced bottom-up from the creep-vs-creep mod (OL-504, done) whose
composition didn't fit any of the first 7 archetypes.

- *Exemplar lineage:* WC3 mods (Footmen Frenzy, Castle Fight, X Hero Siege)
  + WC/SC melee map-design tradition (main / natural / third / contested
  middle / chokepoints)
- *Status:* candidate — elevates to canonical after Director doc lands and
  creep-vs-creep (or successor) proves composition viable
- *Primary stress:* outcome-distribution probes (seeded-batch `runMatrix`
  across AI personality permutations), flow-field primitive graduation,
  ~70% engine-surface usage (widest of any archetype)
- *Next step:* next session resolves the open questions in
  `_director-prework.md` and drafts `archetypes/director.md`; delete the
  prework file on approval.

---

## Build sequence

Each archetype ships independently. Order optimised for engine-feedback yield
and re-use of existing content.

| # | Archetype | Why this order |
|---|-----------|----------------|
| 1 | Looper | Vanilla mod promotes directly — shortest path to a real playable arc, validates the dev-loop harness against real content. |
| 2 | Producer | Simplest new build. Validates "engine feels clean at 30% surface use." |
| 3 | Scaler | Highest engine-feedback yield. Hardest composition problem; surfaces the most API friction. |
| 4 | Interlocker | Widest resource graph. Surfaces multi-resource cost + crafting-recipe gaps. |
| 5 | Explorer | First spatial archetype. Stress-tests worker + position composition, zone-scoped queries. |
| 6 | Scripter | Different engine surface — programmable queue, sandboxed execution. |
| 7 | Phase-shifter | Deferred until the other 6 prove whether phase transitions collapse to a modifier or justify their own skeleton. |
| 8 | Director | Prework already done as `_director-prework.md` against a shipped mod (creep-vs-creep). Drafting blocked on two research open questions; see prework file for triage shape. |

Gaps are expected and good — each archetype's implementation generates concrete
engine tickets for the next. Drift audits (`/audit` from the starter) keep the
engine and archetypes in sync.

---

## What changed from the prior archetype list

The previous 4 archetypes globbed combinations the novel-patterns synthesis
shows are distinct:

- **Tiny Civilization split into Interlocker + Explorer.** Resource-web
  management and spatial exploration are different player experiences; keeping
  them together hid the split.
- **Scripter promoted out of Looper.** Programming-as-Gameplay (cluster #1) is
  structurally different — the artifact is code, not skill retention.
- **Phase-shifter added as candidate.** Previously dismissed ("narrative is a
  layer, not its own archetype"). The Phase Transitions cluster (#12, 20+
  games) argues the structural pattern is real; we'll prototype it standalone
  before collapsing.
- **Director added as candidate (bottom-up discovery).** A shipped mod
  (creep-vs-creep, OL-504) produced a composition — declarative goals +
  autonomous multi-agent sim + spatial arena + round-scoped prestige — that
  didn't fit any of the first 7. Most archetypes here are top-down from
  pattern composition; Director is the first bottom-up entry. Prework at
  `archetypes/_director-prework.md` captures the design decisions locked so
  far and the open questions remaining.

Still explicitly **not** archetypes:

- **Challenges** — orthogonal modifier. Every archetype can add a challenge
  layer; Scaler makes it central.
- **Pure narrative idle** — narrative as presentation is a theme, not a
  skeleton. Phase-shifter covers the case where narrative *drives mechanical
  structure*.

---

## Extension: Benchmark Harness

A mod entry that isn't a game — it synthesises late-game state for a chosen
archetype (hundreds of purchasables, deep modifier chains, 200+ orders of
magnitude), runs the engine's headless harness, renders a results dashboard.

Uses the same engine boot path and save system that real games use, so
discovered perf cliffs are real cliffs. Parameters: which archetype shape to
inflate, scale knobs, harness mode. Builds after at least one archetype has
real shapes to synthesise from.

---

## Cross-references

- **Research corpus:** `/work/studio/open-loop-research/LIBRARY.md` — pattern
  vocabulary, tier model, engine mapping
- **Novel patterns synthesis:** `/work/studio/open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
  — combination clusters from 87 games
- **Composition cookbook:** `/work/studio/open-loop-research/practical/composition-cookbook/`
  — predecessor aspirational list; superseded by this doc
- **Engine API:** `/work/studio/open-loop-engine/docs/api/INDEX.md`
- **Layout research:** `/work/studio/open-loop-research/practical/ui-ux/layout-spray-2026-04.md`
- **Per-archetype template:** `archetypes/_template.md` *(Phase 0, pending)*
- **Per-archetype specs:** `archetypes/<name>.md` *(Phase 1–3, pending)*
