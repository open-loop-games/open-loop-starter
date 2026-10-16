# Scaler — archetype identity

> The prestige stack (`prestige` + `meta-progression` + `statistics` + `softcap`)
> layered on Producer's ladder, with the graded run (`challenge` + `meta-progression` +
> `multiplier-stack`) inside the outer reset. `challenge` and `softcap` are the patterns
> Producer's exemplars do not share; `manual-action` is the one Scaler's drop. Each
> layer compresses the one below it.

Genre: `layered-incremental`, whose document in the studio's research library lists the
games in it. Antimatter Dimensions, The Prestige Tree, Synergism and NGU Idle show the
research composition ships, as a set; none is a lift target. This build also carries
`automation`, one piece per layer it hands off.

## What this archetype is

*Paragon.* You run a hero corps over a city at night, told as a comic. Heroes earn
Justice on their own, and each recruit of a tier costs more than the last. There is no
button to press for Justice: the corps is the whole economy. Three prestige layers sit
above it, and each opens its own cascading chain, where tier 1 makes the chain's currency
and each tier above makes the one below.

| Layer | Pays | Wipes | Chain it buys |
|---|---|---|---|
| Reboot the Timeline → Legacy | ∛ of Justice earned this timeline | the run | the Network → Hope, ×every hero |
| Rewrite the Multiverse → Continuity | √ of Legacy earned since the last Rewrite | Legacy, its shop, the Network | Parallel Earths → Echoes, ×Legacy gain and Hope |
| Turn the Age → Canon | a fourth root of Continuity earned this Age, past the Age's gate | Continuity, its shop, the Earths | Imprints → Myth, ×Continuity gain and Echoes |

- **The masthead.** The age (Golden → Silver → Bronze → Dark → Modern), the volume
  (Rewrites) and the issue (Reboots). Each prestige prints its onomatopoeia across the cover.
- **Elseworlds.** Five timelines under a worse rule, five tiers each: No Powers, Secret
  Identity, Villain Uprising, then Dark Days (the Network makes no Hope) with the first
  Rewrite and Lost Earth (Echoes do nothing) with the first Age. Each tier resolved grows
  its permanent reward; the Archives and Canonical Elseworlds raise the cap from 2 to 5.
- **Automation hands each layer off as the next opens.** The Dispatch Desk recruits; the
  Succession Plan reboots at most once per interval, which drills cut; the Network
  Liaison spends Legacy; the Crossover Event rewrites; the Monitor spends Continuity.
  Turning the Age is never automated.
- **Legends** on lifetime Justice multiply every hero, and no reset takes them back.

## Rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`). A
tier's unit n costs c·mⁿ with one shared ratio, every tier repays itself in the same
seconds, and the per-tier cost step is solved so the top tier opens on schedule. Each
prestige layer pays a root of what the layer below earned. A chain inside one reset is a
polynomial in time, r₀(n₁t + r₁n₂t²/2 + r₁r₂n₃t³/6).

**Where the closed form stops:**
- *the run.* The spine models a ladder (fill a tier to `hold` units, save for the next),
  integrated numerically. Hope multiplies the run by g(t), which is time-separable: the
  run earns in t seconds what the plain run earns in τ = ∫g.
- *when to prestige.* The reference walk resets each layer at a share of what it has earned.
- *the thresholds.* Once a layer is automated its time is a count of resets at the
  interval, not a rate. So the first Rewrite's threshold, each Age's gate and each
  Elseworld tier's goal are what the walk has earned when its slot comes up.

**What measures the remainder:** `arc-probe.ts` plays the shipping game and prints every
layer, the cadence per 15 minutes and every Elseworld tier beside the walk. The game has
no RNG, so one run is the measurement.

## The arc

| Beat | Spine | Recorded |
|---|---|---|
| First Reboot | 4m00s | 3m47s |
| First Rewrite | 26m01s | 25m31s |
| The Silver Age | 1h45m42s | 1h40m30s |
| The Bronze Age | 2h36m48s | 2h30m36s |
| The Dark Age | 3h18m22s | 3h12m07s |
| The Modern Age, the end beat | 4h02m39s | 3h55m44s |

An Elseworld tier comes up about every nine minutes from 0:16 to 3:57. `manifest.ts` holds
the recorded beats. Play goes on past the Modern Age, each Age's gate growing by the last.

## Growth ports

- **A choice at the top layer.** Canon spent on exclusive lines, so Turning the Age asks
  which, not only when.
- **Offline progress as a rate.** An automated layer cashed out at a share of its best run.
- **A fourth layer** over the Ages, with Turning the Age handed to automation as it opens.

## Engine fit

| Component | Engine primitive |
|---|---|
| Justice, Legacy, Continuity, Canon; Hope, Echoes, Myth | `createResource` |
| the hero tiers | `createProducerCategory` (`continuous`), the price ratio a modifier chain |
| the chains | `createProducerCategory` with `extraCount`: the production cascade |
| the shops | `createPurchasableCategory` with `Grant`s and `Formula.exponential` costs |
| Reboot, Rewrite, the Age | `createReset` with one module per reset depth; `keep` and `retain` |
| the payouts | `integerRoot` over what each layer earned |
| the Legacy softcap | `Formula.step` over the knee chain |
| Elseworlds | `createChallengeCategory` with `completionLimit`, `restricts` and `rewards`; Secret Identity by `replacementGrants` |
| Legends | `createAchievementCategory` with `cumulative-gte` Gates |
| the automation ladder | `createAutomationTiers`; the desk's policy `selectionHybridPayback` |
| each layer's earned-since-reset count | `Resource.sinceReset`, zeroed by that layer's reset |

One hand-roll carries a `TODO(expansion)` marker: the desk's buy loop (`modules/automation.ts`).

## Balance model

The spine is `data/spine.ts`; its `PREDICTION` is the reference walk.
`balance/arc-probe.ts` plays the shipping game and diffs it against the prediction.
`BALANCING.md` covers the tunables and couplings.
