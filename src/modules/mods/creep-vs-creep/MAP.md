# creep-vs-creep — map generation design

**Paired with:** `open-loop-starter/archetypes/director.md` (the archetype spec).

**Scope:** the map-generation pipeline the mod uses to produce each round's arena. Concrete enough that implementation is mechanical: vault templates, rock-scatter algorithm, seed protocol, symmetry discipline.

**Status:** design spec. The current `map.ts` ships a 60×60 mirrored-cross-walls layout (shipped with OL-504). This doc specifies the 100×100 + 13-hotspot + region-model + flow-field-ready arena the mod refactors into. Migration ticket filed as an OL-545 follow-up.

---

## 1. Grid and symmetry

- **Size:** 100 × 100 cells. `DirectorArchetypeVars.mapWidth` / `mapHeight`.
- **Total cells:** 10 000.
- **Symmetry:** 4-fold rotational about the map centre (not mirror). `DirectorArchetypeVars.symmetry === 'rotational-4fold'`. Generate the NW quadrant, rotate 90° three times for NE / SE / SW. Place the centre vault on the axis of rotation.
- **Coordinate convention:** row-major `(x, y)` with origin at top-left. `index = y * width + x`. Matches `src/modules/mods/creep-vs-creep/grid.ts` and `SpatialGrid` convention.
- **Rotation formula (NW → NE → SE → SW):** for a cell at `(x, y)` in the NW quadrant with `0 ≤ x < 50` and `0 ≤ y < 50`:
  - NE: `(width - 1 - y, x)`
  - SE: `(width - 1 - x, height - 1 - y)`
  - SW: `(y, height - 1 - x)`

---

## 2. Terrain palette

Fixed (`DirectorTerrainKind`): `rock | open | spawn | hotspot`. No high-ground, no rough terrain, no fog of war — Director cuts them per archetype spec.

- `rock` — impassable. Shapes spread and combat by forcing routing through chokes.
- `open` — passable, default everywhere. Flow-field propagates freely.
- `spawn` — passable. One per faction. Faction-owned at gen time.
- `hotspot` — passable. 13 total (see § 4). Reservoir + capacity live in `CellState.hotspotId` / `reservoir`.

---

## 3. Region model

Region vocabulary borrowed from Warcraft III / StarCraft II melee-map design. Regions are emergent from vault placement + rock scatter; the generator does not explicitly tag cells with region ids (the player reads regions visually from the rendered map).

- **Main** (4 total, one per faction) — corner base. Spawn cell + 1 near-hotspot inside a partial rock ring. Defensible.
- **Natural** (4 total) — per-faction next-door region with 1 natural-hotspot. Semi-exposed to the diagonally adjacent faction.
- **Contested** (4 total) — at radial midpoints between adjacent-corner factions. Shared; naturally fought over by 2 factions.
- **Center** (1 total) — single highest-yield hotspot at the map's geographic centre. All-4-contested.
- **Chokepoints** — emerge from rock formations between regions. Not mandatory — flow can route around at higher cost. No mechanical "+defense in chokes" bonus; terrain weight via `BalanceVars.spreadTerrainMul` already does that work.

---

## 4. Hotspot tiering

13 hotspots total. Per-tier yield multipliers (`BalanceVars.*HotspotYieldMul`):

| Tier | Count | Role | Yield mul | Ownership at gen | Region |
|------|-------|------|-----------|------------------|--------|
| near | 4 | per-faction, low yield, inside main | `0.5` | faction-owned | Main |
| natural | 4 | per-faction, medium yield, semi-exposed | `1.0` | neutral | Natural |
| contested | 4 | shared, high yield | `1.5` | neutral | Contested |
| center | 1 | map centre, highest yield | `2.0` | neutral | Center |

Hotspot ids are stable across rounds (`hs-near-nw`, `hs-natural-nw`, `hs-contested-n`, `hs-center`, etc.). Reservoir + HP reset each round via the retention policy.

**Radial layout (1-indexed quadrants N=0, E=1, S=2, W=3):**

- Near hotspots: inside the Main vault, ~(8, 8) in NW pre-rotation, then rotate.
- Natural hotspots: midway along the arm toward centre, ~(22, 22) in NW pre-rotation.
- Contested hotspots: radial midpoints between adjacent-corner factions:
  - `hs-contested-n` at ~(width/2, 22) on the N axis (shared by NW + NE factions)
  - `hs-contested-e` at ~(width - 22, height/2) on the E axis (shared by NE + SE)
  - `hs-contested-s` at ~(width/2, height - 22) on the S axis (shared by SE + SW)
  - `hs-contested-w` at ~(22, height/2) on the W axis (shared by SW + NW)
- Center: (width/2, height/2) = (50, 50).

---

## 5. Vault templates

Four kinds. Keep minimal — the generator is not a dungeon generator, just a symmetric arena painter. Symbol grammar borrowed from `/work/studio/borglike/src/game/dungeon/vaults.ts` (pattern only; do not port code).

**Symbol grammar:**

```
.   open
#   rock (impassable)
S   spawn
h   near-hotspot (faction-owned at gen time)
n   natural-hotspot (neutral)
c   contested-hotspot (neutral)
C   center-hotspot (neutral)
```

### 5.1 Base vault (10 × 10, 4 instances)

Partial rock ring (~60% closed). Spawn at `(3, 3)` inside the ring; near-hotspot at `(3, 5)`. Rotated 4× around map centre.

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

NW placement: top-left corner at `(0, 0)`.

### 5.2 Natural vault (6 × 6, 4 instances)

Single `n` centred; sparse rock scatter on the base-facing side (the side facing the faction's Main vault — i.e. toward the NW corner in the NW-quadrant natural vault).

```
......
......
..n...
......
.#....
......
```

NW placement: top-left corner at ~(19, 19).

### 5.3 Contested vault (7 × 7, 4 instances)

Single `c` centred. Rock pillars scattered around — not enclosed. Open battlefield terrain.

```
.......
.#...#.
.......
...c...
.......
.#...#.
.......
```

NW-axis placement (N contested, shared NW ↔ NE): top-left corner at ~(width/2 - 3, 19).

Contested vaults sit on the symmetry *axes* (N, E, S, W midpoints), not inside the NW quadrant proper. Generator places all four explicitly rather than generating one and rotating.

### 5.4 Center vault (7 × 7, 1 instance)

Single `C` centred with a broken rock-pillar ring. Placed once on the symmetry axis; no rotation.

```
.#...#.
#.....#
...C...
.......
...C...
#.....#
.#...#.
```

(The duplicate `C` rows above is a typo in the template below — only the top one is authoritative; the center vault has a single `C` at the grid centre.)

Centre placement: top-left corner at `(width/2 - 3, height/2 - 3)` = `(47, 47)` on a 100-wide map.

---

## 6. Rock-scatter algorithm

After vaults are painted, the generator fills open terrain with procedural rock to shape flow without forcing corridors.

**Density target:** ~10–15% of non-vault cells. Enough to shape flow and create strategic features; low enough that *"tendrils route around rocks"* dominates over *"tendrils squeeze through gaps"*.

**Two composited styles (both NW-quadrant-only, then rotated for symmetry):**

### 6.1 Small clusters

- Count: ~8 clusters per quadrant.
- Size: 3–5 connected rock cells per cluster.
- Placement: random point within the NW quadrant bounds excluding any vault footprint. Pick a point; grow via weighted 4-connected expansion (each neighbour has a 0.5 chance of becoming rock until cluster size cap).
- Min spacing: ≥ 4 cells between cluster centres.

### 6.2 Thin lines

- Count: ~3 lines per quadrant.
- Length: 5–10 cells along a noisy vector.
- Placement: random start cell, random direction (one of 8 cardinal/diagonal), each next cell has a 0.7 chance of continuing straight + 0.15 chance each of ±45° drift.
- Used sparingly to hint at region separation without forming mandatory corridors.

### 6.3 Validation pass

After both styles land:

1. Flood-fill from each of the 4 spawn cells.
2. Assert every hotspot id is reachable from every spawn.
3. If any unreachable: discard this scatter, retry with the next seed (should be rare at ≤ 15% density + vault footprints pre-carved as open).

---

## 7. Generation pipeline

Single generator, seeded, deterministic:

```ts
function generateDirectorMap(vars: DirectorVars, seed: number): MapBlueprint {
  const rng = createSeededRNG(seed);
  const { mapWidth: w, mapHeight: h, symmetry } = vars.archetype;

  // 1. Initialise grid — all 'open'.
  const cells = initialiseOpenGrid(w, h);

  // 2. Paint NW-quadrant vaults.
  paintBaseVault(cells, 0, 0);                              // NW Main
  paintNaturalVault(cells, 19, 19);                         // NW Natural

  // 3. Rotate NW quadrant through 4-fold symmetry to fill NE / SE / SW.
  rotateQuadrants(cells, w, h, symmetry);

  // 4. Paint axis-aligned contested vaults (four of them, on N/E/S/W).
  paintContestedVaults(cells, w, h);

  // 5. Paint centre vault on the axis of rotation.
  paintCenterVault(cells, w / 2 - 3, h / 2 - 3);

  // 6. NW-quadrant procedural rock scatter, then rotate.
  scatterRocks(cells, 0, 0, w / 2, h / 2, rng, vars.balance.rockDensity);
  rotateQuadrants(cells, w, h, symmetry);

  // 7. Connectivity validation. Retry-with-next-seed on failure.
  if (!validateConnectivity(cells)) {
    return generateDirectorMap(vars, seed + 1);
  }

  return finaliseBlueprint(cells, w, h);
}
```

**Complexity:** O(w × h) dominant cost; negligible for 10 000 cells.

**Determinism guarantee:** given the same `seed` and `vars`, `generateDirectorMap` returns bitwise-identical output across runs, platforms, and engine versions. The generator uses only the injected RNG; no `Math.random`, no `Date.now`.

---

## 8. Seed protocol

- **Per-save seed:** `BalanceVars.mapSeed`. When `'random'`, the engine picks a `uint32` at save creation and stores it persistently; when a numeric seed is passed, use verbatim. Both routes yield a reproducible save across reloads.
- **Per-round variation:** map is the same every round within a save. Per-round variation comes from faction-order shuffling in the existing `generateSymmetricMap` signature (keep that affordance), *not* from re-generating the arena. If a fork wants per-round maps, override `mapSeed` to `'random'` + regenerate per round in `round.ts`.
- **Workbench determinism:** `runMatrix` seed set is independent of `mapSeed`. The Workbench's `seeds: Array.from({ length: 50 }, (_, i) => i)` pool drives RNG for AI decisions, reservoir regen jitter, and flow-field noise — not map layout. Map layout per matrix cell is pinned by `mapSeed` in the cell's vars override.

---

## 9. Cell footprint accounting

- Vaults: 4 × 100 (base) + 4 × 36 (natural) + 4 × 49 (contested) + 1 × 49 (center) = **789 cells, ~8% of the map.**
- Inside vault footprints: most cells remain `open`; hand-authored features (spawns, hotspots, rock walls) are a small fraction.
- Remaining ~92% of the map is procedural rock scatter over default-open terrain.

---

## 10. Migration from current map.ts

Current (OL-504 baseline):

- 60 × 60 grid (`MAP_WIDTH = MAP_HEIGHT = 60`).
- Cross-shaped rock walls dividing into 4 quadrants.
- 4 spawns at corner insets.
- 4 hotspots, one per quadrant midpoint (`hs-nw` / `hs-ne` / `hs-sw` / `hs-se`).
- Mirrored (not rotational) symmetry.

Target (this doc):

- 100 × 100 grid.
- Region-model topology with vaults + procedural rock scatter.
- 13 hotspots in 4 tiers.
- 4-fold rotational symmetry.
- Same 4 spawns, placed inside base vaults rather than free-standing.

**Migration steps (separate ticket — files a subtask of the Director-implementation follow-up filed after OL-545 closes):**

1. Widen `MAP_WIDTH` / `MAP_HEIGHT` to 100 + surface as `DirectorArchetypeVars`.
2. Replace `generateSymmetricMap` internals with the pipeline in § 7.
3. Expand `HotspotDef` list from 4 to 13 + tier yield multipliers (pulled from `DirectorBalanceVars`).
4. Update `grid.ts` seeding to consume the new blueprint (hotspot ids and positions change).
5. Update `round.ts` retention policy to preserve new meta-currency + slot-capacity fields (unchanged in shape; confirm).
6. Update goal types to include the new hotspot ids (`claim:hotspot-near-nw`, `claim:hotspot-contested-n`, etc.).
7. Add DomGrid `v-if` key bump on round reset (the known `SpatialGrid.restore()` no-event gotcha from § 10 of the archetype doc).
8. Verify `SpatialGridSnapshot` HP round-trips cleanly at 10 000 cells (`DecimalSource` → string → `Decimal`) — structural regression test.

---

## 11. References

- Archetype spec: `open-loop-starter/archetypes/director.md`
- Shared types + defaults: `open-loop-starter/src/archetypes/director/`
- Current mod implementation: `src/modules/mods/creep-vs-creep/`
- Vault-template pattern reference (pattern only; do not port): `/work/studio/borglike/src/game/dungeon/vaults.ts`
- DomGrid renderer: `/work/studio/open-loop-starter/src/ui/components/spatial/DomGrid.vue`
- SpatialGrid engine API: `/work/studio/open-loop-engine/docs/api/INDEX.md` § `createSpatialGrid`
