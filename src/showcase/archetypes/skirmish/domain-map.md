# Skirmish — domain language

Chrome & Cantrip: a shadow crew and a rival outfit fight over three districts of a sprawl where the ley lines have woken. Hustlers earn scrip, ley taps draw aether, training floors turn both into four kinds of unit, and the crew that burns the other’s safehouse takes the contract.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **SideId** _(string-literal union)_ — `p` · `e`
- **ResearchEffect.kind** _(discriminated-union arm)_ — `damage` · `hp` · `income` · `training` · `turret`
- **CrewTier** _(string-literal union)_ — `none` · `fixer` · `quartermaster` · `tactician`
- **PolicyScope** _(string-literal union)_ — `econ` · `build` · `command`
- **UnitKind** _(string-literal union)_ — `razor` · `hexer` · `rigger` · `enforcer`
- **AttackKind** _(string-literal union)_ — `kinetic` · `arcane` · `code` · `heavy`
- **BodyKind** _(string-literal union)_ — `chrome` · `flesh` · `drone` · `plated` · `structure`

## Defs

`BarracksDef`, `CharterDef`, `ContractDef`, `DistrictDef`, `EconDef`, `LieutenantDef`, `ResearchDef`, `UnitDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **EconDef** → `district`
- **Persona** → `research`
- **ArmyPoint** → `unit`
- **ResearchEffect** → `unit`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`BarracksDef`, `CharterDef`, `ContractDef`, `LieutenantDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **match** — One run against one contract: from the briefing to a burned safehouse. Starting the next resets both seats, their lieutenants and the districts; nothing carries over.
- **seat** — One side of a match: the player’s crew or the rival. Both play the same policy; the rival through its persona, the player through hired lieutenants or by hand.
- **contract** — A rival outfit to beat: its persona, its income terms and its briefing. The roster holds four; the player picks the next one freely.
- **persona** — A parameter bundle the one shared policy reads: production mix, how hard it counters, payback horizon, research order, when it assaults and when it pulls back.
- **hustler** — A worker producer: one scrip a second, at a geometric price. The economy grows by hiring them until one no longer pays back inside the horizon.
- **ley tap** — A producer of aether, the second input hexers, riggers and enforcers are trained from.
- **turf** — Income from districts held outright: one producer whose count is the districts a seat holds.
- **training floor** — A converter that turns scrip and aether into one unit kind, while its switch is on and the bunks have room.
- **bunks** — The supply cap: one bag holding every unit a seat has, at home and in the districts. Coffin squats raise it.
- **district** — One of three places between the safehouses. Control drifts toward the side present in it; a side that holds it outright earns turf and may assault from it.
- **squad** — A seat’s units standing in one district, by kind. Units at home are the reserve and hold the gates.
- **assault** — An order on a held, uncontested district: its squad fires on the rival safehouse while the safehouse turret fires back.
- **focus** — Where a squad’s fire goes: on one kind if it stands in the district, else spread by count.
- **pairing** — The attack kind × body kind table every hit is read through: razors cut flesh, hexers fry drones, riggers brick chrome, and each reverse cell resists.
- **astral scout** — A paid reveal: every district and the rival safehouse are seen for a while, then fog returns with each sighting kept at its age.
- **lieutenant** — A hire inside a match, in order and for scrip: the fixer plays the economy, the quartermaster builds and researches, the tactician commands. Both seats hire them; the player’s unlock an automation tier each, with a switch.
