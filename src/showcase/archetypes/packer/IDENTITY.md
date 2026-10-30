# Packer — archetype identity

> Buffs applied across a grid by a spatial relation: `positional-effect` reading a
> neighbour set over a lattice, `player-siting` choosing where each piece goes, and
> `multiplier-stack` taking what pieces give and receive. `scaled-opposition` sizes the
> target an arrangement is tested against, so a solved layout is solved again, and
> `prestige` starts the board over with what it earned kept. Arrangement is the score;
> the player is arranger.

Genres: `backpack-battler` and `incremental`, whose documents in the studio's research
library list the games in them. Calculator Evolution, NGU Industries and Ballionaire show
the research composition ships, as a set; none is a lift target. NGU Industries is the
`scaled-opposition` member and Calculator Evolution the `prestige` member among them.

## What this archetype is

*Hardpoint.* You are the fitter of a ship holding a breach line against a drone swarm.
The guns fire on their own; your job is the hull, a lattice in the ship's shape plated
out section by section. Destroyed drones become salvage, and salvage becomes modules,
plating and refits. Three ships come in turn: the frigate *Hardpoint*, the lancer
*Longreach* and the flagship *Sovereign*, each with a base hull and an extension.

Every module's worth comes from where it sits. Cannons, Railguns and the keel-only
Spinal Lance fire and take every buff that reaches their cell. A Capacitor boosts the
weapons on its edges, a Targeting Array those at its corners, an Arc Beacon stamps the
weapons a knight's move away, and a Fire Director boosts the four cells down the line
it faces; the player turns it. A Coolant Manifold amplifies the boosters beside it, and
a Salvage Tractor raises the salvage of the weapons beside it without adding firepower,
so a board is fitted either to earn or to fight.

Once the cruiser keel is plated, the breach line opens. Each sector is held by a carrier
and brings conditions that rewrite a relation while it holds: an ion storm darkens
corner links, magnetic shear shortens a director's line, close quarters runs a boxed-in
booster cold. The next sector's conditions are announced ahead. An engagement fires the
board at the carrier's hull for thirty seconds: it falls, paying an honour that
multiplies every weapon for good, or it withdraws and the player re-fits. The next plate
waits for the carrier. When a ship's last carrier falls, the player recommissions: the
yard and the board clear, honours and schematics stay, and a grant buys the new ship's
opening fit. The Dreadnought ends the story; play goes on, against raised carriers and
calibration.

## The defining component

**The hull board's firing solution.** Hold a module over a socket and the board answers
before you commit: every cell the fit would change shows its delta, losses included, and
a replacement shows the net. So the question the line asks, where this piece is worth
most, is answered on the lattice itself, under the sector's conditions.

## Rate-function spine

**Bucket: composition** ([rate functions § composition](https://open-loop-games.github.io/incremental-math/rate-functions/composition/)) over
**exponential-family geometric ladders** (`…/exponential.mdx`). The board is full from
about a minute into each hull, so salvage has nowhere to go but the next plate, refit or
schematic: income is piecewise constant by board stage, the rate the stage's best
packing earns, and the arc is the sum of its stages.

```
price ladder   m = 2^(1/5)                       doubles every 5 copies of a type
link boost     b = 1 / 2                         a booster touching 2 weapons is worth a cannon
weapon         dps · (1 + Σ links) · (1 + Σ stamps) · refits · honours
salvage        firepower · (1 + Σ yields)
stage rate     R_j = packing_j · 1.5^refits · 1.25^honours
adoption       ln(R_j / R_in) · spend / (R_j − R_in)   the stage's new modules, bought from income
a beat         plate or refit: saved = price · schematic: ship's salvage = gate
a carrier      hull = 0.85 · 30 s · combat packing_j · 1.5^refits · 1.25^honours
```

Each beat's price or gate is solved from the stage walk so it lands on its act's gap
ladder, from 40 → 150 s on the frigate to 240 → 300 s on the flagship's extension; a
carrier falls one window after its stage adopts. A new type's first copy costs its worth
in weapons for 30 s.

**Where the closed form stops: the packing.** What each stage's best arrangement earns
and fires, and the modules it fields, are measured, not derived: `balance/packing-probe.ts`
searches each stage on the shipping evaluator and holds the boards the spine's claims
were measured on. `balance/arc-probe.ts` plays the walk under a reference fitter that
builds those boards.

## The arc

| Beat | Recorded |
|---|---|
| The cruiser keel plated: the breach line opens | 19:59–20:07 |
| The Brood Carrier destroyed | 26:13–26:23 |
| *Longreach* commissioned | 37:59–38:44 |
| The Maw destroyed | 53:59–54:47 |
| *Sovereign* commissioned | 1:27:08–1:27:56 |
| The Breach Mother destroyed | 2:03:47–2:05:10 |
| The Dreadnought destroyed (spine: 2:32:49) | 2:29:44–2:31:14 |

Ranges are the arc probe at tick sizes 0.5 s to 2 s.

<!-- eject:strip-start -->
`manifest.ts` holds every beat.
<!-- eject:strip-end -->

## Growth ports

- **Footprints.** Modules wider than one cell, rotated to fit: the line's second
  configuration axis, which this build leaves at one cell.
- **A cost to moving.** Two of the three exemplars charge for a rearrangement
  (Calculator Evolution resets accumulated value, Ballionaire spends a counted removal);
  here lifting and swapping are free.

## Engine fit

| Component | Engine primitive |
|---|---|
| the hull lattice and the fixed relations | `createSpatialGrid` with `neighbors(x, y, offsets)`: `ORTHOGONAL_OFFSETS`, corner and knight offsets |
| the Fire Director's line | walked by hand along its facing (`modules/board.ts`; `TODO(expansion)`) |
| the fabricator, the hull sections, the refits, calibration | `createPurchasableCategory` with `createCostRequirement` over `Formula.exponential` |
| section order and the carrier gate | `createGateRequirement` on the previous section; `createBooleanRequirement` on the carrier's fall |
| salvage from the fitted board | `createProducerCategory`, one per weapon type, `baseRate` the fitted salvage |
| refits, honours, calibration | terms on one `createModifierChain` bound into each weapon producer |
| the recommission | `createCycle` resetting the yard's and the board's persistent contexts, with `salvage.cumulative` named so each ship's gates count from zero |
| the layout and its preview | hand-rolled `OccupancyView` evaluator (`modules/layout.ts`; `TODO(expansion)` receipts) |
| the bay | a purchasable's count minus the modules fitted (`modules/board.ts` `stock`; `TODO(expansion)`) |

## Balance model

`data/spine.ts` is the spine; `balance/packer-projection.ts` prints its stage walk,
`balance/packing-probe.ts` measures the packing it reads, and `balance/arc-probe.ts`
plays it. `BALANCING.md` says how to work on the numbers.
