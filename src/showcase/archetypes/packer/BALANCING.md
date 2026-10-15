# Packer — balancing

A placement economy: income is the salvage of the fitted board, and the board is bounded
by the hull's open cells. Salvage buys modules on per-type geometric ladders, hull
sections that open more cells, and refits that multiply every weapon; the board's
firepower downs carriers, whose honours multiply every weapon after them. Three ships
run in sequence, each from a cleared yard. The bucket and its closed form are in
`IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`, the act ladders in
`data/hull.ts` (`SHIPS[].acts`), and the packing table in `data/packing.ts`. To retune,
change an anchor or a ladder and let the stage walk solve every price, gate and carrier
hull again; after a change to any strength, rerun the packing probe and paste its table
first.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `pieces/priceRatio` | 2^(1/5) ≈ 1.149 | Every fabricator ladder's per-copy ratio. Higher makes a second copy of a type cost more against a different type, so a board mixes types sooner. |
| `pieces/pulse/dps` | 1 | A Pulse Cannon's damage a second. Only the board's output moves; prices stay where the spine put them. |
| `pieces/rail/dps` | 8 | A Railgun's damage a second. |
| `pieces/lance/dps` | 32 | A Spinal Lance's damage a second; it mounts only on keel cells. |
| `pieces/capacitor/boost` | 0.5 | What a Capacitor adds to each edge-adjacent weapon's link family. |
| `pieces/targeting/boost` | 0.5 | What a Targeting Array adds to each corner-adjacent weapon's link family. |
| `pieces/beacon/gain` | 0.5 | What an Arc Beacon's stamp adds to a weapon's stamp family. |
| `pieces/coolant/gain` | 0.65 | What a Coolant Manifold adds to each adjacent booster's link amplification. Below the solved gain, manifolds add less than one weapon's share to the board they arrive into. |
| `pieces/director/boost` | 0.5 | What a Fire Director adds to each weapon down its line. |
| `pieces/director/reach` | 4 | How many hull cells a Fire Director's line reaches. Past four, directors reach every weapon down a long hull and crowd the other boosters off the larger ships. |
| `pieces/tractor/gain` | 0.5 | What a Salvage Tractor adds to an adjacent weapon's yield family: salvage, not firepower. |
| `refits/mult` | 1.5 | Each refit's multiplier on the firepower chain. |

**Not perturbable, on purpose:**
- Prices, gates, first-copy prices, carrier hulls and the commissioning grants are solved
  by the stage walk when `data/spine.ts` loads, from the packing table. A strength
  perturbed through a key moves the board but not the walk; to move the walk, change an
  anchor, rerun the packing probe, and paste its table.
- The hulls' silhouettes and sections (`SHIPS[].map` in `data/hull.ts`) are content. The
  spine counts cells from the maps, so a reshaped hull reprices every section, and the
  packing probe flags each stored board that no longer fits as `SHAPE`.
- The honour (`HONOUR_MULT`), the window (`CARRIER_WINDOW_S`), the hull's margin
  (`CARRIER_FORGIVENESS`) and calibration are anchors, not keys: each enters the walk.

## Couplings

- **The packing table is the spine's only measured input.** `STAGE_PACKING` holds each
  stage's best rate, its combat firepower when it closes on a carrier, and the modules it
  fields; every price and hull is solved from it. `PACKING_BOARDS` holds the board each
  claim was measured on, keyed by search spec, so a claim can be checked exactly. Both are
  measured at the default strengths: a strength changed in `data/spine.ts` leaves them
  stale, with nothing to say so but the packing probe's `DRIFT` flags.
- **Underclaiming is safe; overclaiming is not.** A plate's price is what the stage saves
  at its claimed rate, so a claim the board cannot reach prices the plate beyond what it
  saves on time. A claim below the true best only lets a better player run ahead.
- **A carrier's hull is the combat board's fire, not the saving board's.** A stage that
  closes on a carrier is priced for both boards: the walk buys the combat board's copies
  as well. Tractors earn without firing, so a saving board fights poorly.
- **The carrier gate holds the next plate.** A section the schedule puts after a carrier
  needs that carrier fallen (`carrierBefore`). Without it, a board short of a carrier
  plates on and wins the fight a section later, off the schedule.
- **Honours carry across ships, refits do not.** Every rate after a carrier's fall carries
  ×1.25 more, on every later ship; the walk counts both in `stageMult`.
- **A recommission clears the yard, so its ladders restart.** The grant
  (`COMMISSION_PURSE`) is the opening stage's spend at the new ship's first prices. It
  is paid after the reset, so it counts toward the new ship's gates as Ship I's purse
  does: the recommission names `salvage.cumulative` in its reset.
- **Conditions change what a stage's best board is.** A stage's packing is measured
  under its sector's conditions, and a carrier's fall changes them; the stage after a
  fall re-fits as well as saves.
- **Adoption spends the savings first.** A stage opens by buying the modules its packing
  adds, from salvage saved toward the next plate before income. So an unlock in the middle
  of a saving run delays the plate after it, and the walk prices that plate from what is
  left.
- **Schematics follow the ship's salvage, plates follow savings.** A schematic decrypts
  once the ship's salvage passes its gate, and stays decrypted on every later ship.
- **Buff families sum inside and multiply across.** Links sum, stamps sum, yields sum, and
  the families multiply. A Coolant Manifold's worth is two hops out: it amplifies the links
  of the boosters beside it.
- **Calibration is outside the walk.** Its first level costs 60 s of the ship's first
  fight's income; the reference fitter buys it only when a carrier holds and nothing is
  left to plate or refit. It is the salvage sink after a ship's last carrier and after the
  story.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts`: the
  derived strengths, the grants, the stage walk with each stage's ramp and what closes
  it, and the landmarks against the arc's two-to-three-hour target. Instant.
- `pnpm exec vite-node src/showcase/archetypes/packer/balance/packing-probe.ts [ship]`:
  each claimed board re-scored, a search seeded with it, and a paste-ready table. About
  10 s for all ships. `--deep` searches longer and adds a cold search, about six minutes for all
  ships; `--coolant` solves the Coolant Manifold's gain. A re-solve is `--deep` until no
  `BETTER` flag remains, then a paste, then the arc probe.
- `pnpm exec vite-node src/showcase/archetypes/packer/balance/arc-probe.ts [dt]`: one cold
  start to the Dreadnought's fall under the reference fitter (`balance/_fitter.ts`), with
  every beat and carrier against the walk, the flow channel of each gap, and each ship's
  board as it was relieved. About 4 s; `TRACE=1` adds a line a minute.
- `pnpm test src/showcase/archetypes/packer`: the behavioral suites beside the modules.

The healthy arc lands every beat within about three minutes of its walk time and the
Dreadnought within 2%, at tick sizes 0.5 s to 2 s, with no withdrawals.

## Known thin

- **The packing is a search, not an optimum.** The stored boards only ever improve, so
  the claims are reproducible, but a stage whose cold search falls short of its stored
  best has not shown the best is found: on the current table a cold deep search lands on
  the stored board for most stages and falls up to 6% short on the rest.
- **The reference fitter builds the claimed boards.** It measures the spine, not a
  player: greedy play alone reaches about two thirds of a stage's packing once directors
  and conditions arrive.
- **The flagship's last plates sit near the boredom line.** Its extension ladder ends at
  300 s, and the last two plates' gaps run 280–290 s.
- **Raised carriers are not measured.** Past a ship's last authored carrier, each raised
  carrier doubles the last one's hull with conditions drawn by hash; the reference fitter
  recommissions at once, so the trade between staying for honours and moving on is open.
