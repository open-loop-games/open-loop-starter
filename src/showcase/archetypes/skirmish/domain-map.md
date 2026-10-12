# Skirmish — domain language

N factions each fund an army from a compounding economy and contest one continuous field in real time; nothing survives from one match to the next.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **UnitTypeId** _(string-literal union)_ — `trooper` · `archer` · `cavalry`
- **UnitArchetypeTag** _(string-literal union)_ — `cavalry` · `infantry` · `ranged`
- **PersonaKey** _(string-literal union)_ — `rush` · `investor` · `skirmish` · `boom` · `combined`

## Defs

`EconomyBalance`, `FactionDef`, `PersonaDef`, `UnitTypeDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **TargetingWeights** → `economy`
- **PersonaDef** → `economy`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`UnitTypeDef`, `FactionDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **split** — The fraction φ of income a faction reinvests in its economy, which compounds; the rest, 1 − φ, buys army, which is consumed. The economic decision is a split, not a curve.
- **persona** — A keyed behavioural variant an AI opponent is drawn from at match creation (PersonaDef): its split and its targeting weights. A persona matchup is a design object of its own.
- **counter matrix** — UnitArchetypeTag × UnitArchetypeTag damage multipliers. Composition against a rival reads through it, so who to build depends on what the rivals build.
