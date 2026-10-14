# Scaler — domain language

Paragon: a hero ladder under three prestige layers told as a comic, each opening a cascading chain, with tiered Elseworlds as the graded run inside the first layer, Legends on lifetime Justice, and no click and no RNG.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **TierId** _(string-literal union)_ — `patrol` · `response` · `strike` · `tower` · `league` · `bastion`
- **LegacyUpgradeId** _(string-literal union)_ — `dispatch` · `public-trust` · `elseworld-protocols` · `press-office` · `training`
- **ContinuityUpgradeId** _(string-literal union)_ — `succession` · `eternal-dispatch` · `liaison` · `archives` · `mythic` · `drill`
- **CanonUpgradeId** _(string-literal union)_ — `crossover` · `monitor` · `canon-elseworlds`
- **ElseworldId** _(string-literal union)_ — `no-powers` · `secret-identity` · `villain-uprising` · `dark-days` · `lost-earth`

## Defs

`CanonUpgradeDef`, `ChainTierDef`, `ContinuityUpgradeDef`, `ElseworldDef`, `LegacyUpgradeDef`, `LegendDef`, `TierDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **ChainTierDef** → `tier`
- **RunShape** → `tier`
- **WalkStep** → `elseworld`
- **ElseworldSlot** → `tier`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`LegacyUpgradeDef`, `ContinuityUpgradeDef`, `CanonUpgradeDef`, `LegendDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **hero tier** — A producer tier of the corps: each unit earns Justice every second. A tier shows once the one below is staffed.
- **Reboot the Timeline** — The first prestige layer: wipes the run and banks Legacy, a cube root of Justice earned this timeline. The issue number counts Reboots.
- **Legacy** — The first layer’s currency. Legacy earned since the last Rewrite multiplies every hero, bent to √ past the knee; spending it never costs the bonus.
- **Rewrite the Multiverse** — The second prestige layer: wipes the run and Legacy with its shop, and banks Continuity, a square root of Legacy earned. The volume number counts Rewrites.
- **Continuity** — The second layer’s currency. Continuity earned this Age multiplies the corps; an Age resets it.
- **Turn the Age** — The third prestige layer, never automated: once Continuity earned this Age meets the Age’s gate, wipes everything below and the Earths, and banks Canon. The ages run Golden, Silver, Bronze, Dark, Modern.
- **Canon** — The third layer’s currency. Canon ever earned multiplies the corps and every Rewrite’s Continuity; nothing resets it.
- **chain** — A layer’s cascading producer chain: tier 1 makes the chain’s currency, each tier above makes units of the tier below. The Network makes Hope, the Parallel Earths Echoes, the Imprints Myth. What a chain made goes with its layer’s reset; what was bought goes with the reset above.
- **Elseworld** — A timeline under a worse rule, entered by a Reboot. Reaching the tier’s goal before the next Reboot resolves the tier, up to five; each resolution grows its permanent reward. Distinct from the Rewrite: an Elseworld wipes only the run.
- **Legend** — An achievement on lifetime Justice; each multiplies every hero, and no reset takes it back.
- **Dispatch Desk** — The first automation tier: recruits by blended payback, and saves for a dearer tier when that pays sooner.
- **Succession Plan** — The second automation tier: reboots once pending Legacy reaches a share of Legacy earned, at most once per interval, never inside an Elseworld.
- **Crossover Event** — A Canon upgrade that rewrites once pending Continuity reaches a share of Continuity earned this Age, never inside an Elseworld.
- **Eternal Dispatch** — A Continuity upgrade that keeps the Dispatch Desk and Elseworld Protocols through a Rewrite: the conditional keep-set.
