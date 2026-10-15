# Packer — domain language

Three ships' hull lattices, each plated out section by section, where every module's firepower comes from the modules around it. Salvage from the fitted board buys modules, plating and refits; the board's firepower downs the carriers that hold the breach line, and each ship's last carrier opens the next ship.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PieceId** _(string-literal union)_ — `pulse` · `capacitor` · `targeting` · `beacon` · `rail` · `coolant` · `director` · `lance` · `tractor`
- **PieceRole** _(string-literal union)_ — `beacon` · `tractor` · `weapon` · `booster` · `amplifier`
- **RelationId** _(string-literal union)_ — `none` · `orthogonal` · `corners` · `knight` · `ray`
- **ConditionId** _(string-literal union)_ — `ion-storm` · `jamming` · `coolant-leak` · `shear` · `close-quarters`
- **ShipId** _(string-literal union)_ — `frigate` · `lancer` · `flagship`

## Defs

`ActDef`, `CarrierDef`, `ConditionDef`, `PieceDef`, `RefitDef`, `SectionDef`, `ShipDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **CarrierDef** → `ship`, `condition`
- **SectionDef** → `ship`
- **RefitDef** → `ship`
- **ShipDef** → `section`, `refit`, `act`
- **BoardStage** → `ship`, `section`, `refit`, `condition`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`PieceDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **relation** — The cells a module's effect reaches over the lattice: edge-adjacent, corner-adjacent, a knight's move, or a ray down the line a Fire Director faces. A weapon's relation is none; it only receives.
- **link** — A booster's term on a weapon it reaches. Links sum into one family; a Coolant Manifold amplifies the links of the boosters beside it.
- **stamp** — An Arc Beacon's term on a weapon a knight's move away. Stamps sum into their own family, which multiplies the link family.
- **bay** — Modules fabricated and not fitted: a type’s fabricated count minus its modules on the board. Fitting draws from it; lifting or stowing returns to it.
- **yield** — A Salvage Tractor's term on an edge-adjacent weapon. Yields sum into their own family, which multiplies the weapon's salvage and leaves its firepower.
- **section** — A block of hull cells plated in authored order. The corvette core is section 0 and always open; plating the next section opens its cells to fitting.
- **refit** — A one-time purchase that multiplies every weapon through the firepower chain, leaving the layout unchanged.
- **ship** — One of three hulls the story is played on, each with its own lattice, sections, refits and carriers. Recommissioning into the next ship clears the yard and the board.
- **act** — One of a ship's two halves: the beats it schedules and the gap ladder they sit on. A ship's second act plates the extended hull.
- **sector** — A stretch of the breach line, held by one carrier. While it holds, its conditions rewrite the board; when it falls, the next sector opens and its conditions take over.
- **condition** — What a sector brings: one relation rewritten while it holds, such as an ion storm darkening corner links. The next sector's conditions are announced ahead.
- **carrier** — The enemy holding a sector. An engagement fires the board at its hull for one window; it falls or withdraws. A carrier past a ship’s last authored one is raised with a harder hull.
- **honour** — What a fallen carrier pays: a permanent multiplier on every weapon, kept across every ship.
- **calibration** — A repeatable refit once the breach line opens: every weapon hits harder, each level priced above the last. The salvage sink when a carrier holds and nothing else is left to buy.
- **grant** — The salvage a ship after the first is commissioned with: enough to buy its opening fit. It counts toward the ship's gates.
- **packing** — A stage's best arrangement: what it fires and the modules it fields. The packing probe measures each stage's on the shipping evaluator, and the spine solves every price from them.
- **stage** — The board between two events: its ship, open cells, types unlocked, refits held, honours and conditions. The spine's income is constant within a stage, at the rate of the stage's best packing.
