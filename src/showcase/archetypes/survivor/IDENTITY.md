# Survivor — archetype identity

> Automatic fire with positioning as the only input — a standing candidate, not a pattern —
> inside `scaled-opposition`, with an `offered-draft` at every level-up, a `run-setup`
> choice of character and danger, and `meta-progression` banking unlocks across runs.
> Stand inside the threat and respond in real time, run after run.

Identity line source: `../_identity.md` (Survivor entry); the line's player experience and
exemplar calls are `../_docs/survivor.md`. **Core · open core.** Brotato is sourced, and the
patterns above are the ones it carries; Vampire Survivors and Halls of Torment are called
from design knowledge. The defining component is the automatic-fire candidate in
`open-loop-research/patterns/candidate-patterns.md`, cited as a candidate until research
graduates or places it.

## What this archetype is

*One More Take.* You are the stunt double on an action set that never wraps. Extras pour
onto the soundstage from every side; the effects crew fires your rigs on their own clocks.
The only thing you choose is where to stand. A rig is a shape that asks a different place:
the Prop Pistol the nearest body in reach, the Squib Ring everyone close, the Pyro Gag a
cone along your heading, the Dolly Rifle the toughest body far out, faster while you hold
your mark, and Breakaway Bottles orbiting you. Downed extras drop reels where they fall;
walk over them to bank them. A kill inside the drifting camera frame, the shot, drops a gold
reel worth double. Banked reels fill the rewrite bar, and each rung stops the floor for the
writers' pages: a new rig, a level, or a perk. A take ends at CUT, seven minutes in, or at a
wipeout. Either way the reels pay clout, and the agent spends it on perks and new stars.

At the call sheet you pick a star, a rating and who calls the moves. A star is a body (an
opening rig, a health and a speed bias) and an instinct: the parameters of the shipping
movement and draft policies. Call the moves yourself, or let the star improvise. Each rating
starts the take deeper into the opposition curve; CUT at one opens the next.

## Rate-function spine

**Bucket: geometric discrete on scene marks** (`incremental-math/…/rate-functions/`). Both
sides of a take compound: rig damage through the rewrites, extra hp and arrivals through the
scene index, which advances once a minute. The closed core is a crossing between two
geometric curves. Every rig's level-1 damage a second is the same, so a rig choice is about
shape; the per-level gain is solved so the mean loadout meets the last scene's demand. The
rewrite ladder is fitted to the income model at its first and last beat, so the rewrites
land on the authored schedule. Clout is income over a baseline take, and the agency's price
growth is solved so the whole shop costs an anchored number of takes. `data/spine.ts`
holds the anchors and the solves.

**Where the closed form stops:**
- *η and contact.* Collection efficiency and the time a driver spends touched are driver
  outputs: the spine assumes η, and nothing in it predicts contact.
- *the draft.* Offers are a weighted draw over a narrowing pool, so the loadout is a
  distribution; the spine uses a mean pick order.
- *the ratings.* The spine solves G only. A harsher rating is the same curves entered
  deeper.

**What measures the remainder:** `take-probe.ts` plays every star × rating over a seed batch
with no agency and reads ends, η, contact and the rewrites against the ladder;
`career-probe.ts` plays the meta arc under the stars' instincts and a reference agent;
`cone-probe.ts` and `steering-probe.ts` read the movement policy itself.

## The arc

| Beat | Recorded |
|---|---|
| The first rewrite | 0:18 |
| CUT: the first take survives | 7:00 |
| The Pyro signs, and PG opens | 14:00 |
| CUT at PG | 27:50 |
| R opens | 35:35 |

A take runs up to seven minutes. Over eight seeds R opens at a median of 38 minutes, and an
R take reaches CUT only where the floor's population guard turns arrivals away.
`manifest.ts` holds the recorded beats.

## Growth ports

- **An ending.** A last take the arc builds toward, with the game playable after.
- **Rating rewards.** A harsher rating that pays more, so the choice is a trade and not
  only a gate.
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

The real-time floor is consumer-side by the engine's design; `stepArena` is one pure
function the take module and the probes both call. Three hand-rolls carry `TODO(expansion)`
markers: the rigs' cooldown dispatch (`modules/sim/arena.ts` `fireRigs`), k distinct weighted
draws (`modules/sim/draft.ts` `drawOffer`) and the star's utility steering
(`modules/sim/steering.ts`). The probes' process pool (`balance/_pool.ts`) is a fourth.

## Balance model

The spine is `data/spine.ts`; `balance/survivor-projection.ts` runs it, with the schedule
against the ladder, the solved level gain, what each rating demands of the loadout, and the
clout model. The probes play the shipping game and print beside it. `BALANCING.md` covers the
tunables and couplings.
