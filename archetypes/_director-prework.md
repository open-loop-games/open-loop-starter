# Director — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of a design session covering the
> creep-vs-creep mod (OL-504) and the archetype its composition points to.
> The session did not implement anything. It refined the problem, settled on
> a shape, and resolved blockers.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/director.md` against `archetypes/_template.md`, using
>    the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 2. Draft a map-gen design note next to the mod (e.g.
>    `src/modules/mods/creep-vs-creep/MAP.md`) concretely specifying the
>    vault templates, rock-scatter algorithm, and symmetry enforcement.
> 3. Once both are approved, **delete this file** — it's scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

OL-504 landed all 9 subtasks (OL-505 foundation through OL-513 achievements +
BalanceWorkbench wiring). The mod is playable at
`src/modules/mods/creep-vs-creep/`. Post-gameplay observation surfaced two
problems:

1. **Spread doesn't feel slime-mold.** The current algorithm in `spread.ts`
   rewards same-faction adjacency (`weight = terrain × (1 + same-faction
   neighbours)`), which explicitly favours blob-thickening over
   tendril-reaching. Growth reads as "four paint blobs expanding", not as
   Physarum.
2. **The 2D binary grid can't express thickness.** Cells are owned or not —
   one bit per cell. Real slime mold has variable-thickness mat, thin
   filaments, thick trunks. No algorithm over binary ownership alone can
   recover that.

The fix space has to address both: algorithmic spread shape *and* a
representation richer than binary ownership.

---

## The design problem, restated

The mod as shipped is a working consumer of ~70% of the engine surface
(`SpatialGrid` + `producer` + `purchasable` + `chain.bind grants` + `slot` +
`automation` + `RNG` + `reset/retention` + `achievement category`), so its
bones are sound. (OL-504's original plan included `createLoop` for sub-tick
scheduling; OL-506 replaced it with accumulator-over-`onTick` when
`createLoop` turned out to be a constrained-replay primitive, not a
scheduler. That mismatch is one of the engine-gap candidates in §9 of the
drafting session.) What it lacks:

- Slime-mold visual character (tendrils, mat, veins, pruning).
- A round cadence where the "interesting middle" (exploration → contact →
  network forms → combat resolves) has room to play out. Current 60×60
  saturates in ~60–90s leaving ~200s of pure combat.
- A legible mapping from player goals to geography. Goals are abstract
  chain multipliers; the map reads as undifferentiated.
- A cleanly framed archetype identity. It doesn't fit any of the 7 in
  `ARCHETYPES.md`.

---

## Archetype framing

The composition is novel enough to warrant its own archetype entry.
Mapping against `ARCHETYPES.md`:

- **Not Producer / Scaler / Interlocker** — resources are a means, not the
  graph.
- **Not Looper** — no action queue, no repeated content mastery.
- **Not Explorer** — spatial but omniscient; no fog of war; map is arena,
  not territory-to-chart.
- **Not Scripter** — no code artifact.
- **Not Phase-shifter** — mechanics don't swap across rounds.

Distinguishing properties:

- Player agency is *declarative* (set goals, don't act).
- Sim runs *autonomously* across 4 factions (3 AI + player).
- Spatial arena is first-class but *omniscient* — you watch, you don't
  chart.
- Prestige is *round-scoped* with a hard terminal condition (timer + score).
- Observer-and-steerer role, not actor.

**Proposed name:** **Director**. Clean, describes the player stance, not
overloaded in the corpus. Locked.

**Status:** `candidate` (per template). Becomes `canonical` after shipping
and proving composition viable.

**Exemplar lineage to cite in § 2 of the archetype doc:**

- Footmen Frenzy / Footmen Wars (WC3 mod) — 4-corner FFA, open arena,
  rounds with upgrades, autonomous unit flow.
- Castle Fight (WC3 mod) — build-don't-control philosophy; auto-spawners
  from economy; terrain-shaped-not-lane-forced routing.
- X Hero Siege (WC3 mod) — wave pacing, power-ramp between structured
  episodes.
- Warcraft III / StarCraft II melee — underlying map-design tradition:
  main + natural + third + contested middle + chokepoints. Vocabulary
  anchor.

Cite as "validation tradition", not clone targets, consistent with the
template's framing and producer.md's Cookie Clicker/AdVenture
Capitalist/Derivative Clicker line.

**Novel-patterns cluster alignment (to verify in drafting session):** unknown
whether `novel-patterns-synthesis-v4.md` has a cluster that covers
declarative-goal + autonomous-multi-agent-sim + observe-and-steer. If not,
file as a research follow-up — may warrant a new cluster ticket (v4 has 12).

---

## Locked decisions

1. **Name:** Director.
2. **Archetype status:** candidate.
3. **Slime-mold representation (Option C):** keep binary cell ownership;
   add a per-cell per-faction flow field independent of ownership.
   - Flow reinforces along supply paths (spawn → active frontier), decays
     every tick.
   - **Flow couples to spread** (high-flow neighbours weighted higher when
     picking cells to claim).
   - **Flow couples to combat** (damage modulation — supply-cut becomes a
     tactical lever: attack a choke, downstream tendril starves, combat
     defense drops, enemy territory retracts).
   - Ownership still flips on a single claim, **not** on a flow threshold.
     The region topology below already forces supply-path dynamics via
     geometry; threshold-gating on top would be belt-and-suspenders and
     gummy in the early round.
4. **Map size:** 100×100 (up from 60×60). DOM renderer has headroom; see
   §Engine/infra findings below. Expose `mapWidth/mapHeight` as
   `DirectorArchetypeVars`.
5. **Map topology:** WC/SC melee-style region model, **not** DOTA-style
   forced lanes. Open terrain with strategic rock formations that shape
   flow without forcing corridors. Rationale: Physarum's interesting
   network-formation behaviour needs genuine routing choice. Lanes are a
   pre-drawn network; the algorithm can't surprise you with them. Open
   terrain with chokepoints gives the flow field real work to do.
6. **Terrain palette:** unchanged from current — `rock | open | spawn |
   hotspot`. **No** high-ground, **no** rough terrain, **no** fog of war.
   Keeps the system simple; nothing we need requires more.
7. **Hotspot tiering:** 13 hotspots total, up from current 4.
   - 4 × **near** hotspots (per-faction, low yield, inside main base).
   - 4 × **natural** hotspots (per-faction, medium yield, semi-exposed).
   - 4 × **contested** hotspots (shared, high yield, at radial midpoints
     between faction arms).
   - 1 × **center** hotspot (all-contested, highest yield, map centre).
8. **Symmetry:** 4-fold rotational (not mirrored-quadrant). Generate the
   NW quadrant, rotate 90° for the other three, center vault sits on the
   axis.
9. **Round length:** stays 300s. At 100×100 with tiered hotspots and
   region topology, beats have room to breathe. No artificial spread-rate
   ramp needed — geometry is the ramp.
10. **Slow-start mechanism:** round-opening spread delay of ~15s before
    any faction begins claiming cells. Gives a thematic "deep breath
    then creep" moment and a predictable viewing window for the player
    to read initial conditions. Lightweight, authorable as a single
    `roundClock >= 15s` gate on `spread.tickOnce`.

---

## Map design

Region vocabulary borrowed from RTS melee-map conventions:

- **Main** (per faction, 4 total) — corner base, partially rock-enclosed.
  Spawn cell + 1 near hotspot. Defensible.
- **Natural** (per faction, 4 total) — adjacent region with 1 natural
  hotspot. Semi-exposed to the diagonally-placed neighbour.
- **Contested / Third** (shared, 4 total) — at radial midpoints between
  adjacent-corner factions. Each contested hotspot is naturally fought
  over by 2 factions.
- **Center** (1 total) — single highest-yield hotspot at geographic
  middle. All-4-contested.
- **Chokepoints** — emerge from rock formations between regions. Not
  *mandatory* — flow can route around at higher cost. No mechanical
  "+defense in chokes" bonus; keep it simple — the terrain weight already
  does that work via spread cost.
- **No watchtowers, no high ground, no rough terrain.** Cut per decision
  #6.

### Map-gen pipeline (single generator, seeded, deterministic)

Borrowed skeleton from `/work/studio/borglike/src/game/dungeon/vaults.ts` —
specifically the ASCII-grid vault template + symbol grammar + attempt-based
placement. **Do not port wholesale**; this is not a dungeon generator.
Simpler:

```
1. Initialise 100×100 grid to 'open'.
2. Pick NW-quadrant vault placements (deterministic from seed):
   - Base vault at a fixed corner offset (≈8,8).
   - Natural vault midway along the arm toward centre (≈22,22).
   - Contested vault at the radial midpoint between this quadrant and
     its clockwise neighbour (≈50,22 or ≈22,50).
3. Paint vaults, then reflect/rotate NW through 4-fold rotational
   symmetry to fill NE/SW/SE quadrants. Balance is automatic.
4. Place the center vault on the map axis (≈50,50).
5. Procedural rock scatter across remaining open cells, NW-quadrant-only,
   then mirror. Two styles composited:
     a. Small clusters (3–5 connected rock cells) — scattered at random
        points with min spacing.
     b. Thin lines (5–10 cells along a noisy vector) — used sparingly
        to hint at region separation without forming corridors.
6. Validate connectivity: flood-fill from each spawn, assert every
   hotspot is reachable. Retry with next seed if not (should be rare
   at 10–15% rock density).
7. Commit.
```

**Rock density target:** ~10–15% of non-vault cells. Enough to shape flow
and create strategic features, low enough that "tendrils route around rocks"
dominates over "tendrils must squeeze through gaps."

### Vault templates to author

Four kinds. Keep minimal — the user's "don't go overboard" constraint.

**Symbol grammar (simplified from borglike):**
```
.   open
#   rock (impassable)
S   spawn
h   near-hotspot  (faction-owned at gen time)
n   natural-hotspot (neutral)
c   contested-hotspot (neutral)
C   center-hotspot (neutral)
```

**1. Base vault** (~10×10). Rock partial-ring ~60% closed. S inside, h
adjacent. Rotated 4×. Example:

```
##########
#........#
#........#
#..S.....#
#........#
#..h.....#
#........#
#.........
#..........
#..........
```

**2. Natural vault** (~6×6). Single `n`, rock scatter on the base-facing
side. Rotated 4×.

**3. Contested vault** (~7×7). Single `c`, rock pillars scattered around
— not enclosed. Open battlefield terrain.

**4. Center vault** (~7×7). Single `C` with a broken rock-pillar ring.
Single placement on the symmetry axis.

Vault footprints total ~790 cells out of 10,000 = ~8% of the map
(4 × 100 base + 4 × 36 natural + 4 × 49 contested + 1 × 49 center).
Inside those footprints most cells are still `open` — the
hand-authored features (spawns, hotspots, rock walls) are a small
fraction. The remaining ~92% of the map is procedural rock scatter
over default-open terrain.

---

## Beat map (two-scale)

### Within-round (5 beats × 300s)

| # | Beat | Target sim-time | Trigger | Why it matters |
|---|------|-----------------|---------|----------------|
| W1 | Creep begins | 15s | round clock gate lifts | Slow-start moment; first tendrils extend from bases |
| W2 | Main secured | 0–30s after W1 | faction owns its near hotspot + fills main | Economy online; base solidifies |
| W3 | Natural taken or contested | 30–90s | any faction claims its natural OR first frontier contact at natural | First economic divergence |
| W4 | First regional contact | 90–180s | any two factions have adjacent owned cells outside their own naturals | Combat begins; flow field finds stable paths |
| W5 | Mid-map struggle & resolution | 180–300s | contested/center hotspots flip | Territorial score crystallises |

### Meta-arc (7 beats across ~24 rounds / 120 min)

| # | Beat | Round window | Trigger | Player-visible signal |
|---|------|--------------|---------|------------------------|
| M1 | First loss | 1 | round 1 ends with player not #1 territory | Baseline. Losing is fine. |
| M2 | First upgrade bought | 2–3 | any meta-upgrade level 1 owned | First felt multiplier |
| M3 | First round won | 4–6 | player is #1 territory at round end | Emotional hook lands |
| M4 | Slot-2 unlock | 6–8 | `slot-capacity` meta-upgrade level 1 | Goal-stacking becomes a real decision |
| M5 | Full-board domination | 10–14 | player controls ≥75% territory at round end | Aspirational reference frame |
| M6 | Slot-3/4 unlock + strategy identity | 16–20 | `slot-capacity` level 2–3 | Player develops a preferred upgrade focus (yield / spread / attack / defense) |
| M7 | Slot-5 unlock / toolkit complete | 22–24 | `slot-capacity` level 4 (5 total slots) | 1–2h arc closes. Natural pause point |

**Arc closure beat:** M7.

---

## Engine surface / infra findings

### `runMatrix` already supports seeded-batch (Open #5 resolved)

`open-loop-engine/src/harness/run-matrix.ts` runs `cells × seeds` as a
Cartesian product with per-cell `aggregateCell()` over raw `HeadlessResult[]`.
This is exactly the robustness-probe shape Director needs:

```ts
runMatrix({
  cells: [
    { name: 'personalities-ABCD', setup: buildAnalyzers, tick, ticks },
    { name: 'personalities-DABC', setup: buildAnalyzers, tick, ticks },
    // …4! = 24 permutations of AI personality → faction assignment
  ],
  seeds: [...50seeds],
});
// → result.cells[i].aggregate.metrics['territory-final.mean']
// → result.cells[i].aggregate.metrics['territory-final.stddev']
// → assert player-faction win rate across all cells ∈ [35%, 55%]
```

Not blocked. `producer.md §7` already uses `runMatrix` in its test stubs —
follow that idiom.

If we need percentile histograms richer than mean/stddev, that's an
analyzer-side enhancement, not a harness ticket. File as a follow-up if it
becomes blocking.

### DomGrid.vue reactive shape (Open #6 resolved)

`src/ui/components/spatial/DomGrid.vue` uses event-driven shallow-ref
version counters (`cellChanged` / `fovUpdated` / `maskChanged` → version
bump → single `computed` rebuilds flat entry array). Not per-cell dirty
sets. Pattern:

- O(N) JS rebuild of entries per event-bucket tick.
- O(changed) DOM writes — Vue keyed-patch diffs against cached vnodes.

Comment states "3600 cells × 1 Hz mutation bursts fit." 10,000 cells × 1 Hz
is 2.8× that. Probably fine — not certain. **Soft perf risk** at 100×100
*plus* flow-field visual updates.

**Mitigations if it bites:**

1. Batch flow visual updates on the cell tick (1 Hz), not a faster
   cadence. Flow changes slowly enough this is fine visually.
2. Split flow into a separate `flowVersion` shallow-ref; have `cellClass`
   read it directly. Flow-only ticks don't trigger entry-array rebuild.
   Small patch at the DomGrid boundary, not a rewrite.
3. Canvas rewrite — orthogonal future ticket, not this archetype.

**Known DomGrid gap:** `SpatialGrid.restore()` does not emit events by
design. Round-reset needs a `v-if` key bump on the DomGrid. Already handled
conceptually; noting for the drafting session.

---

## Balance probe idiom

Producer/Scaler use cost-curve probes ("does cost^N cross threshold X at
time T"). **Director uses outcome-distribution probes** ("does the
distribution of round outcomes stay in a tuned band"). Flips the Workbench
idiom from single-run to seeded-batch.

Probe types specific to this archetype:

- **Round-feel probes (within-round):**
  - Hotspot yield ±20% → M3 (first win) shifts ≤ ±1 round.
  - Spread base rate ±20% → W4 (first regional contact) stays in 90–180s.
  - **Flow-field decay rate ±50%** — *primary feel knob*. Round-end
    territory variance stays in tuned band. Under-decay = blobs;
    over-decay = twitchy filaments.
  - AI personality swap (any non-player faction) → player-faction win rate
    shifts ≤ ±10pp over 50-seed batch.

- **Meta-arc probes:**
  - Meta-upgrade cost scaling ±15% → M4 (slot-2 unlock) shifts ≤ ±2 rounds.
  - Meta-currency per cell ±25% → M7 (arc closure) lands at 100–140 min
    of sim time.
  - Slot-capacity cost curve — M7 reachable with no skipped rounds by a
    median-skill director.

Meets template's "minimum 4 probes covering cost scaling, production rate,
modifier chain depth, archetype-specific axis" — flow-field decay is the
archetype-specific axis.

---

## Open questions for the drafting session

Prework did not resolve these. Each needs a call before or during the
archetypes/director.md draft:

1. **LIBRARY.md pattern name for "spatial arena".** Is there existing
   vocabulary? If no, either (a) reuse Discovery Systems but note the
   omniscient-not-fog deviation inline, or (b) file a research ticket to
   add one. Template §2 validator requires every cited pattern resolve in
   LIBRARY.md.

2. **Novel-patterns cluster alignment.** Check
   `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   for a "declarative-goal + autonomous-sim + observe-and-steer" cluster.
   Cite it if present; file follow-up ticket if absent.

3. **`DirectorArchetypeVars` shape.** Sketch so far:
   ```ts
   export interface DirectorArchetypeVars {
     mapWidth: number;            // 100
     mapHeight: number;           // 100
     factionCount: 4;
     roundLengthSec: number;      // 300
     laneOpenDelaySec: number;    // 15
     nearHotspotsPerFaction: number;     // 1
     naturalHotspotsPerFaction: number;  // 1
     contestedHotspots: number;           // 4
     centerHotspots: 0 | 1;                // 1
     flowFieldEnabled: boolean;           // true
   }
   ```
   Validate against the template's "ArchetypeVars = structural fork
   decisions only; balance goes in BalanceVars" rule.

4. **`DirectorBalanceVars` — full enumeration needed.** Everything in
   `creep-vs-creep/content.ts` (`BASE_HP`, `BASE_ATTACK`, `BASE_DEFENSE`,
   `HOTSPOT_REGEN_PER_SEC`, `GOAL_MULT`, `META_CURRENCY_PER_CELL`, etc.)
   plus new flow-field parameters (`flowDecayPerSec`,
   `flowReinforcementRate`, `flowToSpreadWeight`,
   `flowToDefenseModifier`). Pull from current content.ts and extend.

5. **§3 engine surface enumeration.** Full list of primitives from
   `open-loop-engine/docs/api/INDEX.md` — probably ~15 primitives
   (SpatialGrid, createResource, createProducer, createPurchasable,
   createPurchasableCategory, createSlot, createModifier, createChain,
   createAchievement, createAchievementCategory, createRetentionPolicy,
   createReset, createRNG/random, persistent, runHeadless, runMatrix).
   Note this is exceptionally wide ("~70% of engine surface" per OL-504
   summary) and call out as an archetype primary-stress axis.

6. **Predicted engine gaps (§9).** Known candidates:
   - Flow-field primitive — if useful elsewhere (influence maps for other
     archetypes), worth graduating. Check the corpus for precedent.
   - `createLoop` vs accumulator-over-onTick — OL-506's `spread.ts`
     comment notes the mismatch. Worth an engine-side ticket separate
     from this archetype.
   - `runMatrix` percentile/histogram aggregates — if mean/stddev is
     insufficient for outcome-distribution assertions.

7. **§10 themes.** Candidate list:
   - **Creep vs Creep** (default) — 4 slime molds over a petri dish;
     hotspots are nutrient pools.
   - **Medieval Barons** — 4 baronies; tendrils are influence/banner
     spread; hotspots are villages.
   - **Corporate Takeover** — 4 megacorps into neutral markets; hotspots
     are contested cities.
   - **Ecological Succession** — 4 pioneer species colonising burned
     land; hotspots are water sources; tendrils = root networks.
   - **Tactical AI Arena** — 4 neural nets self-organising; veins = data
     flow.

   Pick 3–5 per template validator. All must touch only `ThemeVars`, zero
   mechanical impact.

8. **Follow-up tickets to file from this work:**
   - Director archetype implementation (subtasks: map-gen, flow field,
     balance tuning, sim assertions).
   - Research: "spatial arena" pattern vocabulary check.
   - Engine: flow-field primitive graduation (deferred until second
     consumer).
   - Engine: `runMatrix` histogram aggregates (deferred until needed).
   - Starter: DomGrid flow-version split (deferred until perf bites).

---

## Next session's concrete tasks

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`.
2. Resolve open questions #1 and #2 (LIBRARY.md + novel-patterns checks)
   by reading those source files.
3. Draft `archetypes/director.md` against the template, using producer.md
   as format reference.
4. Draft `src/modules/mods/creep-vs-creep/MAP.md` (or equivalent) specifying
   vault templates, rock-scatter algorithm, and seed protocol. Concrete
   enough that implementation is mechanical.
5. Surface any gaps that require research-side or engine-side tickets.
6. Once director.md and MAP.md are reviewed and approved, **delete this
   file**.

---

## References

- Current mod: `src/modules/mods/creep-vs-creep/`
- OL-504 and its 9 subtasks (OL-505 through OL-513) — all done.
- Archetype template: `archetypes/_template.md`
- Archetype format reference: `archetypes/producer.md`
- Borglike vault reference (pattern, not code to port):
  `/work/studio/borglike/src/game/dungeon/vaults.ts`
- Research library: `/work/studio/open-loop-research/LIBRARY.md`
- Novel-patterns synthesis:
  `/work/studio/open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- Engine API index: `/work/studio/open-loop-engine/docs/api/INDEX.md`
- Engine harness: `open-loop-engine/src/harness/run-matrix.ts`,
  `run-sensitivity.ts`, `src/core/headless.ts`.
- DomGrid renderer: `src/ui/components/spatial/DomGrid.vue`
