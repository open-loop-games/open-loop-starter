# Survivor — archetype identity

> Automatic fire with positioning as the only input — a standing candidate, not a pattern —
> inside `scaled-opposition`, with an `offered-draft` at every level-up, a `run-setup`
> choice of character and danger, and `meta-progression` banking unlocks across runs.
> Stand inside the threat and respond in real time, run after run.

Genre: `survivors-like`, whose document in the studio's research library lists the games
in it. Brotato is sourced, and the patterns above are the ones it carries; Vampire
Survivors and Halls of Torment are called from design knowledge. The defining component is
the automatic-fire candidate in `open-loop-research/patterns/candidate-patterns.md`, cited
as a candidate until research graduates or places it.

## What this archetype is

*One More Take.* You are the stunt double on an action set that never wraps. Extras pour
onto the soundstage from every side; the effects crew fires your rigs on their own clocks.
The only thing you choose is where to stand. A rig is a shape that asks a different place:
the Prop Pistol the nearest body in reach, the Squib Ring everyone close, the Pyro Gag a
cone along your heading, the Dolly Rifle the toughest body far out, faster while you hold
your mark, and Breakaway Bottles orbiting you. Downed extras drop reels where they fall;
walk over them to bank them. A kill inside the drifting camera frame, the shot, drops a gold
reel worth double. Banked reels fill the rewrite bar, and each rung stops the floor for the
writers' pages: a new rig, a level, or a perk.

The take is scripted around the crowd. Set pieces stampede, charge or surround the double;
guest stars walk on for one scene, a rival whose jackpot pays only if it is downed before
the scene ends, or a crowd call. Two chalk marks wait on the floor, and filling one with
kills cuts the lead's part. At seven minutes the set clears and the rating's lead walks on.
The take is in the can, CUT, only when the lead falls; the scene keeps stepping while it
stands, and three minutes on the strike crew strikes the set. Whatever the end, the reels
pay clout, more at a harsher rating, and the agent spends it on perks and new stars.

At the call sheet you pick a star, a rating and who calls the moves. A star is a body (an
opening rig, a health and a speed bias) and an instinct: the parameters of the shipping
movement and draft policies. Call the moves yourself, or let the star improvise. Each rating
starts the take deeper into the opposition curve and stages more; a ledger records the
harshest rating each star has wrapped, and a rating opens once enough stars have wrapped
the one below. R's lead is the picture's villain: felling it wraps the picture, and the set
stays open after.

## Rate-function spine

**Bucket: geometric discrete on scene marks** ([rate functions](https://open-loop-games.github.io/incremental-math/rate-functions/)). Both
sides of a take compound: rig damage through the rewrites, extra hp and arrivals through the
scene index, which advances once a minute. The closed core is a crossing between two
geometric curves. Every rig's level-1 damage a second is the same, so a rig choice is about
shape; the per-level gain is solved so the mean loadout meets the last scene's demand. The
rewrite ladder is fitted to the income model at its first and last beat, so the rewrites
land on the authored schedule. A rating enters the same curves deeper: its depth is solved
so the take clears its floor as G does with nothing bought, with the damage the agency adds
by the time the rating opens in a model career. That career runs an anchored number of
takes to the wrap, and the shop is solved to cost what it pays, so the agency is bought out
at the arc's end. Every staged body is sized off the scene's design damage: a lead is a
share of it held for an anchored time, and R's part is solved so the villain stands against
the wrap's agency as each lead stands against its opening one. `data/spine.ts` holds the
anchors and the solves; `data/script.ts` the staging.

**Where the closed form stops:**
- *income and contact.* The share of what walks on that a driver banks, and the time it
  spends touched, are driver outputs: the spine assumes the first, and nothing in it
  predicts the second.
- *clearing is not surviving.* The depths are solved on clearing the floor, and a star that
  kites survives an uncleared crowd; what decides a take is contact against health.
- *the draft.* Offers are a weighted draw over a narrowing pool, so the loadout is a
  distribution; the spine uses a mean pick order.
- *the climax.* How much of the loadout reaches one body, and how a lead fight races the
  stepping crowd, are measured; the lead's share of the damage is assumed.

**What measures the remainder:** `take-probe.ts` plays every star × rating over a seed batch
with the agency the model career holds there, and reads ends, income, contact and the
rewrites against the ladder;
`career-probe.ts` plays the meta arc under the stars' instincts and a reference agent;
`cone-probe.ts` and `steering-probe.ts` read the movement policy itself.

## The arc

| Beat | Recorded |
|---|---|
| The first rewrite | 0:16 |
| The Pyro signs | 9:09 |
| CUT: the first lead falls | 17:32 |
| PG opens | 25:13 |
| PG-13 opens | 48:17 |
| R opens, with two stars wrapped at PG-13 | 1:53:35 |
| The picture wraps: the Big Bad falls | 2:01:11 |

A take runs seven minutes to the climax and up to three more. Over eight seeds R opens at a
median of 1:30:44 and the picture wraps at 1:54:36, as the agency is bought out; the set
stays open after.

<!-- eject:strip-start -->
`manifest.ts` holds the recorded beats.
<!-- eject:strip-end -->

## Growth ports

- **Rule-changing stars.** Brotato's characters each break one rule (no weapons, one slot,
  paid for what is alive); a star that changes a rule rather than a bias.
- **Per-take notes.** A call-sheet note that bends one take, as Vampire Survivors' light
  sources and Deep Rock Galactic: Survivor's mutators do.
- **Evolutions.** A maxed rig paired with the right perk recombines into a named rig, as
  Vampire Survivors' weapons do.
- **A wave-shop fork.** Brotato replaces the level-up draft with a shop between waves:
  same identity line, a different draft.

## Engine fit

| Component | Engine primitive |
|---|---|
| clout | `createResource` |
| agency, stars, ratings | `createPurchasableCategory`; ratings open by `setupSweepAutoPurchase` |
| the rewrite ladder | `createSkill` over an inverted geometric `Formula` |
| damage, fire rate, health, speed, reach | `createModifierChain`; agency grants and rewrite perks bind into the same chains |
| a take's reset | `createReset` over the take module's persistent context |
| the reel route | `createSpatialGrid` `distanceField`, descended consumer-side |
| the floor and the draft's draws | `createSeededRNG`, `weightedPick` |
| every perturbable anchor | `createTuningRegistry`, `tunable` |
| the ledger, the wrap | `persistent` per star, lifetime; ratings read it through `createBooleanRequirement` |

The real-time floor is consumer-side by the engine's design; `stepArena` is one pure
function the take module and the probes both call. Three hand-rolls carry `TODO(expansion)`
markers: the rigs' cooldown dispatch (`modules/sim/arena.ts` `fireRigs`), k distinct weighted
draws (`modules/sim/draft.ts` `drawOffer`) and the star's utility steering
(`modules/sim/steering.ts`). The probes' process pool (`balance/_pool.ts`) is a fourth.

## Balance model

The spine is `data/spine.ts`; `balance/survivor-projection.ts` runs it, with the schedule
against the ladder, the solved level gain, the model career with each rating's solved
depth, and the clout model. The probes play the shipping game and print beside it.
`BALANCING.md` covers the tunables and couplings.
