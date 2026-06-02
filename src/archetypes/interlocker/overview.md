# Interlocker (Kittens Game first-arc port)

**Identity:** Wide multi-resource graph + multi-input/output Conversion Chains + building-to-building Synergy — the wide-not-deep resource-management incremental.

**Canonical exemplar:** Kittens Game (current checkout), pre-paragon early arc — through `architecture` science + first megalith craft. Plain readable JavaScript at `open-loop-research/reference-code/kittensgame/js/`.

## Arc-1 scope

- **11 resources:** catnip · wood · minerals · iron · science · kittens · beam · slab · plate · scaffold · megalith. Capped resources flow through per-resource max-chains; science and kittens are uncapped (kittens soft-capped at the village layer via huts).
- **11 buildings:** field · pasture · hut · library · mine · quarry · smelter · workshop · barn · warehouse · lumberMill. Three start-visible (field, hut, library); rest unlock through science cascade.
- **4 jobs:** woodcutter · farmer · scholar · miner. Each is a `persistent<number>` count enforced at the assignment write-site against `kittens.value`.
- **6 sciences:** calendar · agriculture · mining · metal · construction · architecture. Linear-spine cascade through the canonical Kittens dependency graph.
- **6 crafts:** wood (catnip→wood) · beam (wood→beam) · slab (minerals→slab) · plate (iron→plate) · scaffold (beam→scaffold) · megalith (beam+slab+plate→megalith). Megalith is the **canonical multi-input recipe** and the centerpiece moment of the demo.
- **4 seasons:** spring · summer · autumn · winter. A day/season/year clock (100 days/season, 4 seasons/year; 2 real seconds/day per canon's 10 ticks/day) scales catnip *production* per canon `getWeatherMod`: spring ×1.5, summer/autumn ×1.0, winter ×0.25 — the −75% winter that drives the catnip-pressure swing the archetype is about. Applied at the production read site (village onTick) + display (`useResources`), not on the rate chain (insertion-order composition can't keep a multiplier after the runtime-bound additive producers). Weather (warm/cold), festivals, and challenge modifiers are out of arc-1 scope.

## Arc-1 substitutions (verbatim discipline + judgment calls)

- **Scaffold added as the 11th resource.** Umbrella OL-1056 listed 10 resources but referenced scaffold as both a craft output AND an input to quarry. Scaffold added so the craft-output graph closes and quarry's substitute price has a valid resource handle.
- **Quarry prices substituted.** Canonical quarry requires `steel`, which requires `coal` — both out of arc-1 scope. Substitute uses `slab + iron + scaffold` to preserve quarry's late-arc "mineral-rate booster" role.
- **Pasture unlock keyed to `agriculture`.** Canonical Kittens unlocks pasture via `animal` science — out of arc-1's 6-science set. Substitute keys pasture on `agriculture` (the immediate predecessor in the arc-1 spine).
- **Architecture compedium dropped.** Canonical architecture cost is `science: 42000 + compedium: 10`. Compedium requires `manuscript` + `parchment` (culture chain — out of arc-1 scope). Arc-1 gates architecture on science cost alone.

## Phasing (per OL-1056 umbrella)

- **Phase 1 (this commit, single Opus, main):** Scaffold + locked data contracts. Only `modules/tuning.ts` is fully implemented; the other five module bodies are stubs that throw on access. Numbers immutable from this point.
- **Phase 2 (3 parallel Opus worktrees, branched from Phase 1 tip, OL-1057/1058/1059):**
  - A: resources — bag + per-type Resource + per-type max/rate chains.
  - B: buildings — purchasable category + smelter onTick continuous consumption.
  - C: village — kittens + jobs + catnip consumption + starvation.
- **Phase 3 (single Opus, main):** Workshop + crafts integration; sciences + visibility-cascade glue.
- **Phase 4 (single worktree):** UI — resource readouts, building list with multi-resource cost previews, job assignment widget, craft buttons, science tree.
- **Phase 5 (single worktree):** Balance via measure-and-record — run the harness, observe where beats land, record those windows as regression locks (`BALANCING-interlocker.md`). NOT tuning the (immutable) canon numbers toward target beat timings; see ARCHETYPES.md § Dev-loop.

## N=1 candidate-primitive receipts

- **`createResourceBag` adoption pattern.** First archetype consumer. `TODO(expansion)` drops at the bag install site (Phase 2A).
- **Continuous-conversion (`createContinuousConversion`).** Smelter onTick + kitten catnip onTick. `TODO(expansion)` drops at both sites (Phase 2B + 2C).

Engine-side graduation waits on N=2 corpus pressure; arc-1 ships honest receipts only.

## Cross-references

- Umbrella: `open-loop-starter#2` (gitea; the original OL-1056 Vikunja umbrella migrated)
- Sibling pattern: `src/archetypes/defender/`
- Methodology + balance kit: `archetypes/BALANCING.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
- Candidate primitives: `open-loop-engine/docs/candidate-primitives.md`
- Layout shell: `src/lib/shells/ThreePanelShell.vue` (resources · tabbed content · calendar + log)
