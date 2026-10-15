# Packer — archetype identity

> Buffs applied across a grid by a spatial relation: `positional-effect` reading a
> neighbour set over a lattice, `player-siting` choosing where each piece goes, and
> `multiplier-stack` taking what pieces give and receive. Arrangement is the score; the
> player is arranger.

Identity line source: `../_identity.md` (Packer entry); the line's player experience and
exemplar calls are `../_docs/packer.md`. **Core · covered.** Calculator Evolution, NGU
Industries and Ballionaire show the research composition ships, as a set; none is a lift
target.

## What this archetype is

*Hardpoint.* You are the fitter aboard a frigate holding a breach line against a drone
swarm. The guns fire on their own; your job is the hull, a lattice in the ship's shape
plated out section by section, from a 3×3 corvette core to a 29-cell frigate. Destroyed
drones become salvage, and salvage becomes modules and plating.

Every module's worth comes from where it sits. Pulse Cannons and Railguns fire and take
every buff that reaches their cell. A Capacitor boosts the weapons sharing its edges, a
Targeting Array the weapons at its corners, so the two fill each other's gaps. An Arc
Beacon stamps the weapons a knight's move away, and a Coolant Manifold amplifies the
boost its neighbouring boosters give out. Fabricating a module puts it in the bay;
fitting it is a second decision, and lifting, stowing and swapping are free. The relation
axis runs from edge adjacency through corners to an authored template; every module
takes one cell.

## The defining component

**The hull board's firing solution.** Hold a module over a socket and the board answers
before you commit: every cell the fit would change shows its dps delta, losses included,
and a replacement shows the net. So the question the line asks, where this piece is worth
most, is answered on the lattice itself.

## Rate-function spine

**Bucket: composition** (`incremental-math/…/rate-functions/composition.mdx`) over
**exponential-family geometric ladders** (`…/exponential.mdx`). The board is full from
about a minute in, so salvage has nowhere to go but the next plate, refit or schematic:
income is piecewise constant by board stage, the rate the stage's best packing fires at,
and the arc is the sum of its stages.

```
price ladder   m = 2^(1/5)                       doubles every 5 copies of a type
link boost     b = 1 / 2                         a booster touching 2 weapons is worth a cannon
weapon         dps · (1 + Σ links) · (1 + Σ stamps) · refits
stage rate     R_j = packing_j · 1.5^refits      one stage per beat: cells, types, refits
adoption       ln(R_j / R_in) · spend / (R_j − R_in)   the stage's new modules, bought from income
a beat         plate or refit: saved = price · schematic: lifetime salvage = gate
```

The opening is the same adoption in closed form: one cannon to a fitted corvette at
11/s in about 38 s. Each beat's price or gate is solved from the stage walk so it lands on
a gap ladder of 40 → 150 s over twelve beats; a new type's first copy costs its worth in
weapons for 30 s.

**Where the closed form stops: the packing.** What each stage's best arrangement fires,
and the modules it fields, are measured, not derived: `balance/packing-probe.ts` searches
each stage on the shipping evaluator and prints the table the spine holds. It also solves
the Coolant Manifold's gain, the smallest at which manifolds earn one weapon's share of
the rail board they arrive into. `balance/arc-probe.ts` plays the walk under a reference
fitter.

## The arc

| Beat | Recorded |
|---|---|
| The corvette core fully fitted | 41–46s |
| Midship spars plated | 132–136s |
| The Fire-Control Uplink refit | 237–242s |
| The Arc Beacon schematic | 302–306s |
| The Railgun schematic | 460–466s |
| The Coolant Manifold schematic | 664–672s |
| Wing hardpoints plated | 888–896s |
| The hull fully fitted (spine: 1073s) | 1036–1044s |

Ranges are the arc probe at tick sizes 0.25 s to 2 s. `manifest.ts` holds every beat.
The arc ends at a fully fitted hull; the game runs on after it, and nothing resets.

## Growth ports

- **Footprints.** Modules wider than one cell, rotated to fit: the line's second
  configuration axis, which this build leaves at one cell.
- **A long-term layer.** All three exemplars carry one past the board: Calculator
  Evolution's prestige, NGU Industries' runless escalation and softcap, Ballionaire's
  banked draft pool.

## Engine fit

| Component | Engine primitive |
|---|---|
| the hull lattice and each relation's reach | `createSpatialGrid` with `neighbors(x, y, offsets)`: `ORTHOGONAL_OFFSETS`, corner and knight offsets |
| the fabricator, the hull sections, the refits | `createPurchasableCategory` with `createCostRequirement` over `Formula.exponential` |
| schematic gates, section order | `createGateRequirement`: `cumulative-gte` on salvage, `active` on the previous section |
| salvage from the fitted board | `createProducerCategory`, one per weapon type, `baseRate` the fitted firepower |
| the refits | `grants` onto a `createModifierChain` bound into each weapon producer |
| the layout and its preview | hand-rolled `OccupancyView` evaluator (`modules/layout.ts`; `TODO(expansion)` receipts) |
| the bay | a purchasable's count minus the modules fitted (`modules/board.ts` `stock`; `TODO(expansion)`) |

## Balance model

`data/spine.ts` is the spine; `balance/packer-projection.ts` prints its stage walk,
`balance/packing-probe.ts` measures the packing it reads, and `balance/arc-probe.ts` plays
it. `BALANCING.md` says how to work on the numbers.
