# Tug — domain language

You and the opponent feed the same lane: units auto-walk, resolve combat on contact, and the front line drifts toward whoever is losing.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PersonaKey** _(string-literal union)_ — `mass` · `greed` · `counter` · `tech`
- **UnitPicker** _(string-literal union)_ — `counter` · `cheapest` · `top-tier`
- **UnitArchetypeTag** _(string-literal union)_ — `light` · `fast` · `siege` · `air` · `capital` · `special`
- **AbilityEffect.kind** _(discriminated-union arm)_ — `artillery` · `reinforcement`

## Definitions

`AbilityDef`, `FortressDef`, `IncomeUpgradeDef`, `UnitDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **Persona** → `unit`
- **UnitDef** → `ability`
- **TugData** → `unit`, `incomeUpgrade`, `ability`, `fortress`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **shared lane** — Both sides spend income to produce units into ONE lane; units auto-walk toward the enemy base and resolve combat without commands when streams meet.
- **counter matrix** — UnitArchetypeTag drives the counter-type matrix; the decision space is composition + send-timing + counter-reading, not APM.
