# Tug — domain language

You and the opponent feed the same lane: units auto-walk, resolve combat on contact, and the front line drifts toward whoever is losing.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PersonaKey** _(string-literal union)_ — `mass` · `greed` · `counter` · `tech`
- **UnitPicker** _(string-literal union)_ — `counter` · `cheapest` · `highest-cost`
- **UnitArchetypeTag** _(string-literal union)_ — `light` · `fast` · `siege` · `air` · `capital` · `special`
- **AbilityEffect.kind** _(discriminated-union arm)_ — `artillery` · `reinforcement`

## Defs

`AbilityDef`, `FortressDef`, `IncomeUpgradeDef`, `UnitDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **Persona** → `unit`
- **UnitDef** → `ability`
- **TugData** → `unit`, `incomeUpgrade`, `ability`, `fortress`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **shared lane** — Both sides spend income to produce units into ONE lane; units auto-walk toward the enemy base and resolve combat without commands when streams meet.
- **counter matrix** — UnitArchetypeTag drives the counter-type matrix; the decision space is composition + send-timing + counter-reading, not APM.
