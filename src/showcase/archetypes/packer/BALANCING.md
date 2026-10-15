# Packer — balancing

A placement economy: income is the firepower of the fitted board, and the board is
bounded by the hull's open cells. Salvage buys modules on per-type geometric ladders, hull
sections that open more cells, and refits that multiply every weapon. The bucket and its
closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts` and the packing table
beside them. To retune, change an anchor or the gap ladder and let the stage walk solve
every price and gate again; after a change to any strength, rerun the packing probe and
paste its table first.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `pieces/priceRatio` | 2^(1/5) ≈ 1.149 | Every fabricator ladder's per-copy ratio. Higher makes a second copy of a type cost more against a different type, so the fitter mixes types sooner. |
| `pieces/pulse/dps` | 1 | A Pulse Cannon's damage a second. Only the board's output moves; prices stay where the spine put them. |
| `pieces/rail/dps` | 8 | A Railgun's damage a second. The rail beat's step is this over the cannon's. |
| `pieces/capacitor/boost` | 0.5 | What a Capacitor adds to each edge-adjacent weapon's link family. |
| `pieces/targeting/boost` | 0.5 | What a Targeting Array adds to each corner-adjacent weapon's link family. |
| `pieces/beacon/gain` | 0.5 | What an Arc Beacon's stamp adds to a weapon's stamp family. |
| `pieces/coolant/gain` | 0.8 | What a Coolant Manifold adds to each adjacent booster's link amplification. Below about 0.75, manifolds add less than one weapon's share to the board they arrive into. |
| `refits/mult` | 1.5 | Each refit's multiplier on the firepower chain. |

**Not perturbable, on purpose:**
- Prices, gates and first-copy prices are solved by the stage walk when `data/spine.ts`
  loads, from the packing table. A strength perturbed through a key moves the board but
  not the walk; to move the walk, change an anchor, rerun the packing probe, and paste its
  table.
- The hull's silhouette and its sections (`HULL_MAP` in `data/hull.ts`) are content. The
  spine counts cells from the map, so a reshaped hull reprices every section.

## Couplings

- **The packing table is the spine's only measured input.** `STAGE_PACKING` holds each
  stage's best rate and the modules it fields, and every price is solved from it. It is
  measured at the default strengths, so a strength changed in `data/spine.ts` leaves the
  table stale with nothing to say so but the packing probe's `DRIFT` flags.
- **Income is bounded by cells, not by money.** The board is full from about a minute in.
  After that, income rises only when a section opens cells, a schematic offers a better
  type, a refit lands, or a swap packs better. A plate's price is what the stage saves
  before its beat, so a stage whose packing rate is overclaimed makes its plate cost more
  than the board can save on time.
- **Adoption spends the savings first.** A stage opens by buying the modules its packing
  adds, from salvage saved toward the next plate before income. So an unlock in the
  middle of a saving run delays the plate after it, and the walk prices that plate from
  what is left.
- **Schematics follow lifetime salvage, plates follow savings.** A schematic decrypts on a
  `cumulative-gte` gate, so a board that earns ahead decrypts ahead; a plate waits on what
  is saved, so spending on modules delays it.
- **A refit is shown one first gap before its beat** (`refitGate`), and the next section is
  always shown. Their order holds only while the refit's price is reached first; a walk
  that prices the section below the refit lets the fitter plate first.
- **Buff families sum inside and multiply across.** Links (Capacitor, Targeting Array)
  sum, stamps (Arc Beacon) sum, and the two families multiply. Making stamps multiply one
  by one would reward one weapon ringed by beacons.
- **The Coolant Manifold's worth is two hops out.** It amplifies the links of the boosters
  beside it, so it pays only on a board dense with boosters and rails. Its gain is solved on
  the coolant stage's board; a change to the link boost or rail dps moves the solve.
- **The bay is derived.** A type's bay stock is its fabricated count minus the modules of
  that type fitted, so stowing or lifting never touches the purchasable, and a module once
  fabricated is never bought again. The walk prices only copies beyond the most owned.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts`: the
  derived strengths, the first copies, the opening and the stage walk, with each stage's
  ramp and each beat's price or gate. `RAMP > GAP` marks a stage whose adoption outlasts
  its gap. Instant.
- `pnpm exec vite-node src/showcase/archetypes/packer/balance/packing-probe.ts`: each
  stage's best packing on the shipping evaluator beside its claim, a paste-ready table, and
  the Coolant Manifold's gain solved by bisection. About 8 s.
- `pnpm exec vite-node src/showcase/archetypes/packer/balance/arc-probe.ts [dt]`: one
  cold start to a fully fitted hull under the reference fitter (`balance/_fitter.ts`),
  with every beat against the walk, the flow channel of each gap, the finished board
  against the full-hull packing, and the board. About 10 s at 1 s; `TRACE=1` adds a line
  every 30 s.
- `pnpm test src/showcase/archetypes/packer`: the behavioral suites beside the modules
  (the evaluator, fitting and the bay, salvage from the board, the fabricator, the hull
  and the refits).

A pass that changes a strength runs the packing probe, pastes the table, then runs the
projection and the arc probe. The healthy arc lands each beat within 10% of its walk time
up to the second section (the opening's lag), within 4% from there to the rails, and
within 3% after. The arc is
tick-robust: 0.25 s to 2 s moves the full hull by under 1%. The probe's wall time is the
fitter's per-tick layout evaluation, so a coarser tick is no faster.

## Known thin

- **The late gaps are saving.** From the rails on, each gap opens with an adoption ramp of
  under 30 s and then saves for 100–150 s on a board that does not change. The walk
  places those beats on schedule; what the player does inside them is the deepening's
  question.
- **The packing is a search, not an optimum.** The packing probe's local search is seeded
  and repeatable, but the top of the landscape is flat: the fitter's full hull fields 6
  rails and 9 beacons against the claim's 11 and 7, at 562 against 569 dps. The walk
  prices adoption from the claimed counts, so it buys more than the fitter does.
- **The opening runs about 5 s slow.** The fitter fits the corvette at 43 s against 38 s,
  and the early beats keep that lag; the Coolant Manifold's schematic lands 19 s late.
- **The arc ends at about 17 minutes,** with no layer past the full hull.
