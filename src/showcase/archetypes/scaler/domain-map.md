# Scaler — domain language

Paragon: a hero ladder under two prestige layers told as a comic, with Elseworlds as the graded run inside the first layer, Legends on lifetime Justice, and no click and no RNG.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **TierId** _(string-literal union)_ — `patrol` · `response` · `strike` · `tower` · `league` · `bastion`
- **LegacyUpgradeId** _(string-literal union)_ — `dispatch` · `public-trust` · `elseworld-protocols` · `press-office` · `training`
- **ContinuityUpgradeId** _(string-literal union)_ — `eternal-dispatch` · `auto-reboot` · `mythic`
- **ElseworldId** _(string-literal union)_ — `no-powers` · `secret-identity` · `villain-uprising`

## Defs

`ContinuityUpgradeDef`, `ElseworldDef`, `LegacyUpgradeDef`, `LegendDef`, `TierDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **RunShape** → `tier`
- **Walk** → `elseworld`
- **WalkParams** → `elseworld`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`LegacyUpgradeDef`, `ContinuityUpgradeDef`, `LegendDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **hero tier** — A producer tier of the corps: each unit earns Justice every second. A tier shows once the one below is staffed.
- **Reboot the Timeline** — The first prestige layer: wipes the run and banks Legacy, a cube root of Justice earned this timeline. The issue number counts Reboots.
- **Legacy** — The first layer’s currency. Legacy earned since the last Rewrite multiplies every hero, bent to √ past the knee; spending it never costs the bonus.
- **Rewrite the Multiverse** — The second prestige layer: wipes the run and Legacy with its shop, and banks Continuity, a square root of Legacy earned. The volume number counts Rewrites.
- **Continuity** — The second layer’s currency. Continuity ever earned multiplies the corps; nothing resets it.
- **Elseworld** — A timeline under a worse rule, entered by a Reboot. Reaching its goal before the next Reboot makes its reward permanent. Distinct from the Rewrite: an Elseworld wipes only the run.
- **Legend** — An achievement on lifetime Justice; each multiplies every hero, and no reset takes it back.
- **Dispatch Desk** — The first automation tier: recruits by blended payback, and saves for a dearer tier when that pays sooner.
- **Succession Plan** — The second automation tier: reboots once pending Legacy reaches a share of Legacy earned, never inside an Elseworld.
- **Eternal Dispatch** — A Continuity upgrade that keeps the Dispatch Desk and Elseworld Protocols through a Rewrite: the conditional keep-set.
