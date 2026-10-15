# Packer — domain language

A frigate's hull lattice, plated out section by section, where every module's firepower comes from the modules around it. Salvage from the fitted board buys modules, plating and refits.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PieceId** _(string-literal union)_ — `pulse` · `capacitor` · `targeting` · `beacon` · `rail` · `coolant`
- **PieceRole** _(string-literal union)_ — `beacon` · `weapon` · `booster` · `amplifier`
- **RelationId** _(string-literal union)_ — `none` · `orthogonal` · `corners` · `knight`
- **BeatId** _(string-literal union)_ — `unlock:targeting` · `section:1` · `section:2` · `refit:fire-control` · `unlock:beacon` · `section:3` · `unlock:rail` · `section:4` · `unlock:coolant` · `refit:overcharge` · `section:5` · `section:6`

## Defs

`PieceDef`, `RefitDef`, `SectionDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **BoardStage** → `section`, `refit`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`PieceDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **relation** — The neighbour set a module's effect reaches over the lattice: edge-adjacent, corner-adjacent, or a knight's move. A weapon's relation is none; it only receives.
- **link** — A booster's term on a weapon it reaches. Links sum into one family; a Coolant Manifold amplifies the links of the boosters beside it.
- **stamp** — An Arc Beacon's term on a weapon a knight's move away. Stamps sum into their own family, which multiplies the link family.
- **bay** — Modules fabricated and not fitted: a type’s fabricated count minus its modules on the board. Fitting draws from it; lifting or stowing returns to it.
- **section** — A block of hull cells plated in authored order. The corvette core is section 0 and always open; plating the next section opens its cells to fitting.
- **refit** — A one-time purchase that multiplies every weapon through the firepower chain, leaving the layout unchanged.
- **packing** — A stage's best arrangement: what it fires and the modules it fields. The packing probe measures each stage's on the shipping evaluator, and the spine solves every price from them.
- **stage** — The board between two beats: its open cells, the types unlocked and the refits held. The spine's income is constant within a stage, at the rate of the stage's best packing.
