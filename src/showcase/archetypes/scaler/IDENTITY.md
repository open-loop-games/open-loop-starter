# Scaler — archetype identity

> The prestige stack (`prestige` + `meta-progression` + `statistics` + `softcap`)
> layered on Producer's ladder, with the graded run (`challenge` + `meta-progression` +
> `multiplier-stack`) inside the outer reset. `challenge` and `softcap` are the patterns
> Producer's exemplars do not share; `manual-action` is the one Scaler's drop. Each
> layer compresses the one below it.

Identity line source: `../_identity.md` (Scaler entry); the line's player experience and
exemplar calls are `../_docs/scaler.md`. **Core · covered.** Antimatter Dimensions, The
Prestige Tree, Synergism and NGU Idle show the composition ships, as a set; none is a
lift target. This build also carries `automation` (the Dispatch Desk and the Succession
Plan).

## What this archetype is

*Paragon.* You run a hero corps over a city at night, told as a comic. Heroes earn
Justice on their own, and each recruit of a tier costs more than the last. There is no
button to press for Justice: the corps is the whole economy.

| Piece | What it does |
|---|---|
| Six hero tiers | each unit earns Justice every second; a tier shows once the one below is staffed |
| Reboot the Timeline | wipes the run and banks ⌊∛(Justice earned / threshold)⌋ Legacy; Legacy earned multiplies every hero, softcapped to √ past a knee |
| The Legacy shop | the Dispatch Desk, Public Trust, Elseworld Protocols, the Press Office, Hero Training |
| Elseworlds | a timeline under a worse rule: No Powers, Secret Identity, Villain Uprising; reaching the goal makes the reward permanent |
| Legends | lifetime-Justice thresholds; each multiplies every hero, and no reset takes it back |
| Rewrite the Multiverse | wipes the run and Legacy with its shop, banks ⌊√(Legacy earned / threshold)⌋ Continuity; Continuity ever earned multiplies the corps |
| The Continuity shop | Eternal Dispatch (keeps the desk and the Protocols), the Succession Plan, Mythic Standing |

- **The masthead.** The Rewrite count is the volume and the Reboot count the issue.
  Each prestige prints its onomatopoeia across the cover.
- **Automation.** The Dispatch Desk recruits by blended payback and saves for a dearer
  tier when it would rather wait. The Succession Plan reboots once pending Legacy
  reaches a share of Legacy earned, and never abandons an Elseworld. The Rewrite is
  never automated.

## Rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`). A
tier's unit n costs c·mⁿ with one shared ratio, every tier repays itself in the same
seconds, and the per-tier cost step is solved so the top tier opens on schedule. Each
prestige layer pays a root of what the layer below earned, so each compresses the one
below it by a power.

**Where the closed form stops:**
- *the run.* The spine models a ladder: fill a tier to `hold` units, save for the next,
  keep buying the top tier. The time to a total is ∫ c·mˣ / income(x) dx, integrated
  numerically. `hold` is fitted to the Dispatch Desk, which interleaves tiers.
- *when to prestige.* The reference walk reboots at half of Legacy earned and rewrites
  the moment Continuity is pending; a policy, not an optimum.

**What measures the remainder:** `arc-probe.ts` plays the shipping game and prints every
Reboot and Rewrite beside the reference walk. The game has no RNG, so one run is the
measurement.

## The arc

| Beat | Spine | Recorded |
|---|---|---|
| The top tier opens | 2m30s | 2m36s |
| First Reboot | 4m00s | 3m48s |
| First Rewrite | 12m31s | 11m20s |
| Every Elseworld resolved | — | 13m08s |
| A Rewrite cycle under 30 s | 15m54s | 15m57s |

`manifest.ts` holds the recorded beats. After the last beat the arc has no further
content: Rewrite cycles settle near 20 seconds.

## Growth ports

- **A third layer.** Above the Rewrite, with the Rewrite handed to automation as it opens.
- **A production chain per layer.** Each layer opens its own producers rather than only
  a multiplier.
- **Tiered Elseworlds.** Repeatable completions with escalating goals and rewards.

## Engine fit

| Component | Engine primitive |
|---|---|
| Justice, Legacy, Continuity | `createResource` (`.cumulative`) |
| the hero tiers | `createProducerCategory` (`continuous`), the price ratio a modifier chain |
| the shops | `createPurchasableCategory` with `Grant`s and `Formula.exponential` costs |
| Reboot, Rewrite | `createReset` with one module per reset depth; Eternal Dispatch as `retain` |
| the payouts | `integerRoot` over Justice and Legacy earned |
| the Legacy softcap | `Formula.step` over the knee chain |
| Elseworlds | `createChallengeCategory` with `restricts` and `rewards`; Secret Identity by `replacementGrants` |
| Legends | `createAchievementCategory` with `cumulative-gte` Gates |
| the automation ladder | `createAutomationTiers`; the desk's policy `selectionHybridPayback` |

Two hand-rolls carry `TODO(expansion)` markers: the run-scoped cumulative behind pending
Legacy and pending Continuity (`modules/run.ts`), and the desk's buy loop, which
`setupPolicyAutoPurchase` replaces at one attempt per tick (`modules/automation.ts`).

## Balance model

The spine is `data/spine.ts`; its `PREDICTION` is the reference walk.
`balance/arc-probe.ts` plays the shipping game and diffs it against the prediction.
`BALANCING.md` covers the tunables and couplings.
