# Scaler — domain language

Producer shape plus stacked prestige layers: each ascension resets the layer below and grants a new currency and multiplier.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **Tier** _(string-literal union)_ — `coin` · `prestige` · `transcend`
- **UpgradeEffectScope.kind** _(discriminated-union arm)_ — `producer` · `tier-global`
- **CounterId** _(string-literal union)_ — `freeAccelerator` · `freeMultiplier` · `freeAccelBoost` · `acceleratorPowerBonus`
- **UpgradeGrant.kind** _(discriminated-union arm)_ — `multiplier` · `counter`
- **RuneId** _(string-literal union)_ — `speed` · `duplication` · `prism` · `thrift` · `superiorIntellect`
- **AchievementGroupId** _(string-literal union)_ — `firstOwnedCoin` · `secondOwnedCoin` · `thirdOwnedCoin` · `fourthOwnedCoin` · `fifthOwnedCoin` · `prestigeCount` · `prestigePointGain` · `accelerators` · `multipliers` · `acceleratorBoosts` · `transcensionCount` · `transcendPointGain` · `challenge1` · `challenge2` · `challenge3` · `challenge4` · `challenge5` · `ungrouped`

## Definitions

`AchievementDef`, `CrystalUpgradeDef`, `CumulativeUpgradeDef`, `ProducerDef`, `RuneDef`, `ScalerChallengeDef`, `UpgradeDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **ScalerData** → `producer`, `cumulativeUpgrade`, `upgrade`, `crystalUpgrade`, `achievement`
- **UpgradeEffectScope** → `producer`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`RuneDef`, `ScalerChallengeDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **prestige layers** — Tier ∈ {coin, prestige, transcend}. Each layer resets the one below it and grants a new currency + an upgrade tree + a multiplier.
- **challenge** — A voluntary nerf run taken inside the outer prestige loop ("production halved", "no upgrades") for a permanent stacking bonus.
