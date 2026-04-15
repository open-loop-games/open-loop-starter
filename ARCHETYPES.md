# Game Archetypes — Total Conversion Mods

The starter ships 4 genuinely different games as total-conversion mods. Each
defines its own resources, content, and UI layout from scratch. They share only
infrastructure (settings, ui-registry, save management) and the `src/lib/`
presentational layer.

**Dual purpose:**

1. **Showcase** — demonstrate the engine's shape and expressiveness. Each
   archetype is a grab-and-go starting point for a real game in that genre.
2. **Stress test** — exercise the engine against the research corpus. Each
   archetype targets a different slice of the engine surface and is designed
   to find edges in expressiveness, performance, and composition.

This is the test and culmination of the research→engine pipeline.

---

## Architecture: mods as total conversions

**Current state (to be refactored):** gathering/economy/progression are
always-on base modules. Every mod shares wood/stone/gold. Mods layer on top.

**Target state:** base modules shrink to infrastructure only. Each mod owns
its entire content definition — resources, producers, actions, progression,
and UI layout.

### Base modules (shared by all 4 games)

| Module | Role |
|--------|------|
| settings | Theme, notation, autosave preferences |
| ui-registry | Slot-based panel/screen registration |

That's it. Everything else is game-specific content defined by the mod.

---

## The 4 archetypes

### 1. Cookie Factory (Idle Producer)

**The archetype:** Cookie Clicker / Egg Inc / AdVenture Capitalist

**Core feel:** Big numbers go brrr. Buy things that make numbers go up. Buy
upgrades that make things make numbers go up faster.

**Engine systems exercised:**

- `createResource` — single primary currency
- `createProducerCategory` — the whole producer hierarchy (cursors → portals)
- `createScalingPurchasable` — exponential cost scaling, the real pacing lever
- `createModifierChain` — deep stacking: upgrades x achievements x milestones
- `createPurchasableCategory` — one-shot upgrades that multiply producers
- `createAchievementCategory` — milestone multipliers, not just cosmetic
- `calculateMaxAffordable()` — bulk buying via Formula inversion under load
- Big number formatting at scale (1e308+ via break_eternity)

**What it stress-tests:**

- Cost formula inversion with very large numbers
- Modifier chain depth (10+ stacked multipliers)
- Producer tick performance at scale (many producers, many levels)
- The "no loop, no actions, no skills" path — does the engine feel clean
  when you use only 30% of it?

**Content sketch:**

- 1 resource (cookies/widgets)
- 6–8 producers at escalating cost tiers
- 10–12 upgrades (producer multipliers, click multipliers)
- Achievements that grant passive bonuses
- No prestige — keep it pure. Prestige is the next archetype's job.

**Research patterns:** Activity Systems (A+C hybrid), Purchase Mechanics,
Cost Scaling, Modifier Chains, Achievement Systems.

---

### 2. Idle Loops (Loop Runner)

**The archetype:** Idle Loops / Progress Knight / Groundhog Life

**Core feel:** Repetition with mastery. Each run you get a little better at the
same content. The loop IS the game.

**Engine systems exercised:**

- `createLoop` + `createRetentionPolicy` — the headline system
- `createSkillCategory` — accumulator mode, permanent bonuses
- `createActionCategory` + `createActionRunner` + queue strategies
- `createZoneSystem` — progressive content access
- `createLoopLog` + `createBestOf` + `createRecommendationSystem`
- `createTemporaryEffectSystem` — per-run buffs
- `createAutomationTiers` — progressive automation unlock

**What it stress-tests:**

- Loop reset correctness (does everything reset that should? does retention
  survive?)
- Recommendation system (does strategy advice converge?)
- Action queue strategies under automation
- The full loop-incremental stack end-to-end

**Content sketch:**

- 3–4 skills (woodcutting, mining, combat, trading)
- 5–6 zones with progressive unlock
- 6–8 actions across zones
- Mana-drain loop cycle with skill retention
- Recommendation system wired to loop-log
- Automation tiers gated by achievements

**Research patterns:** Activity Systems (B — continuous), Loop/Cycle Systems,
Mastery Systems, Automation, Time Systems (loop-constrained).

**Migration note:** This is the current vanilla mod promoted to a standalone
game. Expand content, wire up the recommendation system, polish — don't
rebuild.

---

### 3. Antimatter Dimensions (Prestige Scaler)

**The archetype:** Antimatter Dimensions / NGU Idle / Synergism

**Core feel:** Layered compression. What took an hour now takes seconds. Each
prestige layer reveals a new game on top of the old one.

**Engine systems exercised:**

- `createReset` + `createConversion` — multi-layer: at least 2 prestige tiers
- `trackResetTime` — time-since-reset as a progression signal
- `createPurchasableCategory` — upgrade trees per layer
- `createChallengeCategory` — restriction modifiers with permanent rewards
- `createModifierChain` — deepest stacking: base x prestige1 x prestige2 x challenge
- `createAchievementCategory` — cross-layer milestones
- `Formula` integration/inversion — cost curves spanning 100+ orders of magnitude
- `processOfflineTime` — idle scaling across resets

**What it stress-tests:**

- Multi-layer reset coordination (does layer 2 reset correctly preserve
  layer 1 meta-currency?)
- Conversion formulas at extreme scales
- Modifier chain ordering (additive within layer, multiplicative across)
- Challenge enter/exit lifecycle with nested resets
- The full prestige + challenge stack — the genre's hardest composition problem

**Content sketch:**

- Layer 0: Antimatter (primary currency) + 4 dimensions (producers)
- Layer 1: Infinity Points (convert antimatter → IP on reset) + IP upgrades
- Layer 2: Eternity Points (convert IP → EP on reset) + EP upgrades
- 3 challenges at the IP layer (restriction + permanent reward)
- The minimal AD slice that exercises every prestige primitive

**Research patterns:** Prestige Systems (multi-tier nested), Challenge Systems,
Cost Scaling (extreme), Modifier Chains (deep stacking), Achievement Systems
(cross-layer).

---

### 4. Tiny Civilization (Exploration Crafter)

**The archetype:** Kittens Game / Evolve / A Dark Room / Trimps

**Core feel:** Wide, not deep. Many resources interlock. You're managing a
system, not chasing a number.

**Engine systems exercised:**

- `createResource` — 8–10 distinct resources with caps and conversion chains
- `createZoneSystem` — real spatial meaning (biomes, not just unlock gates)
- `createInventory` + `createSlot` — equipment, crafted items
- `createActionCategory` — multi-domain: gathering, crafting, building, exploring
- `createWorker` — addressable units executing action queues; see Workers as RTS primitive below
- `createProducerCategory` — population-driven (workers assigned to buildings)
- `createPurchasableCategory` — buildings with capacity effects
- `createModifierChain` — wide: many small bonuses from different sources
- `ResourceBag` + `bulkTransfer` — multi-resource costs
- Conditions/Effects system (`C`, `E` builders for complex unlock logic)

**What it stress-tests:**

- Wide resource graphs (many resources, many conversion paths)
- Zone-scoped content visibility (only show actions available in current zone)
- Inventory capacity and item identity (non-fungible entities)
- Multi-resource cost requirements (building costs 50 wood + 20 stone + 5 iron)
- The engine's ability to express a fundamentally different game shape — not
  "producers make numbers" but "interconnected systems you manage"

**Content sketch:**

- Resources: food, wood, stone, iron, gold, herbs, leather, tools
- Zones: camp, forest, hills, mines, marsh (progressive discovery)
- Buildings: hut (pop cap), workshop (craft speed), storage (resource cap),
  farm (food production)
- Crafting: tools (from iron + wood), leather (from hides), medicine (from herbs)
- Population: workers assignable to buildings
- Simple tech tree via purchasable unlocks

**Research patterns:** Activity Systems (multi-type), Discovery Systems,
Inventory Systems, Progression Systems (branching), Synergy Systems.

#### Workers as an RTS primitive

`createWorker` (engine/systems) is a pure identity container over a Sequencer +
TimedProgress + task lookup. It owns no behavior — the struct is four inputs
(`id`, `sequencer`, `tracker`, `getTask`) plus two computeds
(`currentTaskId`, `currentTask`) and a `dispose`. Its job is *naming*, not
execution. Cavernous II's `Clone` is the direct precedent.

Once workers are addressable, the multi-worker pattern is trivially RTS-shaped.
A worker is `worker-0`, `villager-3`, `scout-1`; the player commands it by
manipulating its sequencer. RTS verbs map directly:

| RTS verb          | Sequencer call                             |
|-------------------|--------------------------------------------|
| Right-click order | `worker.sequencer.enqueue(task)`           |
| Shift-queue       | repeated `enqueue` (list mode for persist) |
| Stop              | `cancel()` + `clear()`                     |
| Reorder build     | `reorder(from, to)`                        |
| Pause unit        | `pause()`                                  |

**Spawning:** a population module calls `createWorker` N times. Each worker
owns its own sequencer (per-unit order book) and its own tracker (per-unit
progress). A shared `getTask` lookup means all workers draw from the same
content catalog.

**Shared pools via fill strategies.** One shared "idle work" queue can feed
multiple workers by having each worker's `fillStrategy` pull from the same
source. Idle workers independently grab the next job when their sequencer
runs dry — classic RTS auto-assignment (gather, build, repair) with zero
engine-level coordination logic.

**What Worker explicitly does not give you:** positioning, collision,
movement, line-of-sight, fog-of-war, selection state. Those are game-side. A
full TC "villager" is `Worker + Position + AssignedBuilding + Visuals`,
composed at the mod level. The engine owns scheduling identity; the game
owns everything else.

**Build path for TC:** start with a fixed pool (`worker-0..2`) and per-worker
panels before dynamic spawning. The N-worker wiring is also the first real
stress test of OL-384's "consumer-wired tracker dance is fine" claim — if it
feels like copy-paste at N=3, graduate a helper before the TC population
loop multiplies it.

---

## What was cut (and why)

The research cookbook listed 7 archetypes. 3 collapse:

- **"Basic Idle" vs "Incremental Clicker"** — same archetype at different
  complexity. Cookie Factory covers both; toggle producers on/off if you
  want pure clicking.
- **"Narrative Idle"** — narrative is a layer on any archetype, not its own
  mechanical skeleton. A Dark Room is mechanically an exploration crafter with
  narrative presentation.
- **"Time Loop"** — mechanically identical to Loop Runner. The "time" framing
  is thematic, not structural.

**Challenges** are an orthogonal modifier, not an archetype. Antimatter
Dimensions includes them because multi-layer prestige is where challenges
matter most. Any archetype could add a challenge layer.

---

## Predicted engine gaps

Each archetype is designed to surface friction. These are the gaps we expect
to find:

| Gap | Archetype | Severity | Notes |
|-----|-----------|----------|-------|
| Multi-resource costs | Tiny Civilization | High | `createScalingPurchasable` takes a single `resource`. Buildings costing wood+stone+iron need `CostRequirement` composition or a new API. |
| Zone-scoped content queries | Tiny Civilization, Idle Loops | Medium | "Show only actions in current zone" is manual filtering today. |
| Multi-layer reset coordination | Antimatter Dimensions | High | `createReset` zeros refs, but orchestrating layer 2→1→0 cascading resets isn't built-in. |
| Population/workforce allocation | Tiny Civilization | Low | `createWorker` provides addressable scheduling identity; "assign N workers to building" is game-side composition of Worker + building reference. Revisit if the composition is verbose in practice. |
| Crafting recipes | Tiny Civilization | Medium | Multi-input conversion has no direct primitive. `createConversion` is 1:1. |
| Bulk buy UX | Cookie Factory | Low | `calculateMaxAffordable` exists; "buy 1/10/25/max" is game-side UI. |
| Formula at extreme scale | Antimatter Dimensions | Unknown | break_eternity tetration paths may have edge cases. That's what stress testing is for. |

Gaps are expected and good — the point is to find them, file engine tickets,
and fix them. Each archetype's implementation generates concrete engine
feedback for the next.

---

## Extension: Benchmark Harness mod

A 5th mod entry — not a game, but a performance harness that runs inside the
mod picker alongside the 4 playable archetypes.

**Concept:** The mod's `install()` doesn't set up a playable game. It
synthesizes late-game state for a chosen archetype (hundreds of purchasables,
modifier chains 20+ deep, numbers spanning 200+ orders of magnitude), then
runs the engine's headless harness (`runHeadless` / `runMatrix` /
`runSensitivity`) against it. The UI slot renders a results dashboard instead
of a game layout.

**Why a mod, not a separate tool:** It uses the same engine boot path, save
system, and module composition that real games use. If the harness discovers
a perf cliff, it's a real cliff — not a synthetic artifact of a different
test rig.

**Parameters** (configurable from the mod picker or a dashboard panel):

- Which archetype shape to inflate (Cookie Factory's wide producers,
  AD's deep prestige layers, Tiny Civ's wide resource graph)
- Scale knobs: purchasable count, modifier chain depth, resource magnitude
- Harness mode: single run, matrix (N seeds x M configs), sensitivity
  (baseline vs variant)

**Output:** Tick budget (ms/tick at target scale), save/load round-trip
time, offline processing duration, memory profile. The performance budget
for the engine.

**When to build:** After at least one game archetype is implemented and
has real shapes to inflate. Don't design the harness against imagined
state — wait for concrete content modules to synthesize from.

---

## Build sequence

Each step is independently shippable.

1. **Refactor base modules** — move gathering/economy/progression out of
   always-on base. Base becomes settings + ui-registry only. Each existing
   mod inlines its content.
2. **Cookie Factory** — simplest new archetype. Exercises producers and
   purchasables in isolation. Validates that the engine feels clean when
   you skip 70% of the systems.
3. **Idle Loops** — promote vanilla to a standalone game. Expand content,
   wire recommendation system, polish. Most mature archetype.
4. **Antimatter Dimensions** — multi-layer prestige. The hardest composition
   problem. Will generate the most engine API feedback.
5. **Tiny Civilization** — widest engine surface. Different game shape
   entirely. Will surface the most "missing primitive" gaps.

---

## Cross-references

- **Research corpus:** `/work/studio/open-loop-research/LIBRARY.md` — pattern
  vocabulary, tier model, engine mapping
- **Composition cookbook:** `/work/studio/open-loop-research/practical/composition-cookbook/`
  — the 7-archetype list these 4 consolidate from
- **Engine API:** `/work/studio/open-loop-engine/docs/api/*.api.md`
- **Layout research:** `/work/studio/open-loop-research/patterns/ui-ux/layout-spray-2026-04.md`
  — 42-game spray that validated the 5-shell set
