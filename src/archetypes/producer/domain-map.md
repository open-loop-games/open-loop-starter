# Producer — domain language

Click a thing, a number goes up, spend it on something that grows the number — pacing against a curve, the curve is the content.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **UpgradeDef.kind** _(discriminated-union arm)_ — `multiplier` · `cross-building-click-bonus`

## Definitions

`AchievementDef`, `CrossBuildingClickBonusUpgradeDef`, `MultiplierUpgradeDef`, `ProducerDef`, `UpgradeDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **ProducerOverrides** → `producer`, `upgrade`, `achievement`
- **MultiplierUpgradeDef** → `producer`
- **ProducerGameState** → `producer`
- **ProducerData** → `producer`, `upgrade`, `achievement`
- **UpgradeDef** → `producer`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`CrossBuildingClickBonusUpgradeDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **modifier stacking** — The reward is the headline multiplier compounding base × upgrades × achievements × milestones — there is no story, the curve is the content.
- **upgrade kinds** — UpgradeDef.kind ∈ {multiplier, cross-building-click-bonus} — the discriminator over the upgrade union.
