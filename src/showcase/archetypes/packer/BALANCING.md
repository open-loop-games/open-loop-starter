# Packer — balancing

A placement economy: income is the firepower of the fitted board, and the board is
bounded by the hull's open cells. Salvage buys modules on per-type geometric ladders, hull
sections that open more cells, and refits that multiply every weapon. The bucket and its
closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: every price, gate and strength is derived from it.

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
| `pieces/coolant/gain` | 0.4 | What a Coolant Manifold adds to each adjacent booster's link amplification. |
| `refits/mult` | 1.5 | Each refit's multiplier on the firepower chain. |

**Not perturbable, on purpose:**
- Prices and gates are read off the spine's scheduled income and cumulative salvage when
  `data/spine.ts` loads. A strength perturbed through a key moves the board but not the
  schedule; to move the schedule, change an anchor and rerun the projection.
- The hull's silhouette and its sections (`HULL_MAP` in `data/hull.ts`) are content. The
  spine counts cells from the map, so a reshaped hull reprices every section.

## Couplings

- **Strengths and prices share one anchor.** `LINK_BREAK_EVEN` sets the link boost, the
  beacon stamp, the coolant gain and the Capacitor's price together. Raising a boost
  through its key without moving the anchor makes boosters cheap for what they give.
- **Income is bounded by cells, not by money.** The board is full from about a minute in.
  After that, income grows only when a section opens cells, a schematic offers a better
  type, a refit lands, or a swap or rearrangement packs better. A price that is cheap
  against income buys nothing extra; it only moves a beat earlier.
- **The schedule assumes the reference packing.** `FINAL_RATE` is weapons × base dps ×
  `REF_WEAPON_MULT` × refits at `REF_WEAPON_SHARE`. Every main-arc price is read off a
  curve that ends there, so a packing claim that overshoots lowers nothing visibly but
  prices the last sections against income the board never makes.
- **Unlocks follow lifetime salvage, sections follow price.** Schematics decrypt on
  `cumulative-gte` gates, so a board that earns ahead of schedule decrypts ahead of it,
  and the rail beat's ×8 step lands early.
- **Buff families sum inside and multiply across.** Links (Capacitor, Targeting Array)
  sum, stamps (Arc Beacon) sum, and the two families multiply. Making stamps multiply one
  by one would reward one weapon ringed by beacons.
- **The bay is derived.** A type's bay stock is its fabricated count minus the modules of
  that type fitted, so stowing or lifting never touches the purchasable.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts`: the
  derived strengths, the opening, and the beat schedule with each beat's price or gate.
  Instant.
- `pnpm exec vite-node src/showcase/archetypes/packer/balance/arc-probe.ts [dt]`: one
  cold start to a fully fitted hull under the reference fitter (`balance/_fitter.ts`),
  with every beat against its schedule, the flow channel of each gap, the finished
  packing against the spine's claims, and the board. About 7 s at 1 s; `TRACE=1` adds a
  line every 30 s.
- `pnpm test src/showcase/archetypes/packer`: the behavioral suites beside the modules
  (the evaluator, fitting and the bay, salvage from the board, the fabricator, the hull
  and the refits).

The arc is tick-robust: 0.25 s to 2 s moves the full hull by under 1%. The probe's wall
time is the fitter's per-tick layout evaluation, so a coarser tick is no faster.

## Known thin

- **The schedule is not a rate function of the board.** Beats sit on a fixed gap ladder
  and prices are read back off it, while the board's income steps at sections, unlocks
  and swaps. Measured: the hull is fully fitted at 738 s against 1049 s scheduled, and at
  420 s the board makes 390/s against 31/s on the curve, because the rail schematic
  decrypts 87 s early and steps income ×8.
- **The last third has no decisions.** From about 450 s the rails are in and the board is
  static; the fitter saves five minutes for the last two sections. Section 5 (100k) costs
  more than section 6 (81k).
- **The Coolant Manifold is never fitted.** The reference fitter owns none at the end, so
  the two-hop amplifier stays out of the reference packing.
- **The packing claims overshoot.** Weapon share 0.25 claimed, 0.21 measured; the full
  hull makes 972/s against 1305/s claimed.
- **The arc ends at about 12 minutes,** with no layer past the full hull.
