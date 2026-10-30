# Phase-shifter — archetype identity

> The one-way mechanic lifecycle — a mechanism installed, retired, demoted to supply or
> replaced by progress, never cycling back — over `automation`, `converter` and
> `statistics`, with an `ending`. Each door changes what the player does: a reader,
> then an arranger, then a planner, then a reader again for one page.

Genre: `incremental`, whose document in the studio's research library lists the games in
it. The defining component, the one-way mechanic lifecycle, has no research pattern, so
this build designs it (§ The defining component). Universal Paperclips, A Dark Room and
Candy Box 2 show the research composition ships, as a set; none is a lift target.

## What this archetype is

*Night Clerk.* A box with no label comes down the chute into a county records
sub-basement at 2:14 a.m.: the file on Ada Larkspur, who vanished from Harrow Mill on
January 14, 1979. Four phases, each behind a door the player opens by hand:

| Phase | Verb | You are | What runs short | How it can go wrong |
|---|---|---|---|---|
| I. The Box | read a page; hire clerks | hand, then manager | the box's pages | it can't: the sparse opening |
| II. The Board | pin cards; string runs between neighbours that share a fact | arranger | wall space | a card pinned badly earns nothing |
| III. The Night | post clerks on watches, a place at an hour | planner | clerks on nights | too many empty watches break the model, and the night is lost |
| IV. The Last Page | read a page | reader, once more | — | — |

The clerks cross every door with a new job: they read, then write notes up into cards,
then watch. The board's pinned cards become the night's hints, so a better board, or a
longer stay on it, is a shorter night. The case closes on the first verb, reading the
intake sheet the box brings back. A "Filed away" list stamps each retired mechanism.

## The defining component

**The lifecycle table** (`MECHANISMS` in `data/case.ts`, `modules/lifecycle.ts`).

- **Doors** are a purchasable category with `limit: 1`, opened in order, each from a
  record that spending never lowers: pages read, lifetime leads, alibis holding.
- **Every mechanism declares `[installedBy, retiredBy)`.** Its liveness is an engine
  Gate over the doors, so it flips on once and off once. The phase is derived as
  "doors opened", never stored beside them. `replaces` marks a role handed on.
- **Enforcement.** A mechanism that owns a modifier chain hands it to `scope()`, which
  registers ×0 on a `ConditionalEffectSystem` outside its lifespan. A verb or purchase
  reads the same Gate through `visible` or `isLive()`. Nothing is saved; a load
  re-derives the live set from the doors, even loading backwards.

## Rate-function spine

**Bucket: exponential family, geometric cost ladders** ([rate functions § exponential](https://open-loop-games.github.io/incremental-math/rate-functions/exponential/)),
one per phase, spliced at each door (`…/rate-functions/composition.mdx` § Piecewise
splice). The box is a clerk ladder solved in closed form: its size is what the greedy
ladder reads by the phase's length. The phases never compound, so each is solved alone.

**Where the closed form stops: arrangement and search.** What the board earns depends on
where cards are pinned, and what a night finds depends on where clerks watch. The spine
walks both under the reference player's own policies, `bestCell` and `planWatches` in
`data/evidence.ts`. The walks solve the wall prices, the board's door threshold and the
roster ladder. **What measures the remainder:** `balance/arc-probe.ts` plays those same
policies through the game's verbs, and times every beat against the walks. It also
checks each door's retirements and restore parity.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| First clerk | 8s | 8s |
| The box is empty: pin it to the wall | 240s | 241s |
| The board opens to 4×4 | 440s | 442s |
| The board holds: reconstruct the night | 660s | 662s |
| First alibi holds | 820s | 822s |
| Sixth alibi holds: the box comes back | 1180s | 1182s |

<!-- eject:strip-start -->
`manifest.ts` holds the recorded beats.
<!-- eject:strip-end -->

## Growth ports

- **A door with a choice.** A door that offers two next phases, one declined for good,
  so the lifecycle table branches.
- **Rumours on the board.** Cards that are not true: they string like any other, and
  their hint sends a clerk to an empty watch.

## Engine fit

| Component | Engine primitive |
|---|---|
| the doors | `createPurchasableCategory` with `createGateRequirement` |
| mechanism liveness, dormancy | `createPredicateResolver`, `createConditionalEffectSystem` |
| reading; the phone and the string | `createProducerCategory`; the clerks read through a producer with `inputs` (pages) |
| clerks, wall, roster | `createPurchasableCategory` with `createCostRequirement` |
| the replayed night | `createCycle` |
| the clerks' planning | `createAutomationTiers` |
| the box's fragments | `createAchievementCategory` |
| insomnia | the TickDriver's `speedMultiplier` |

One hand-roll carries a `TODO(expansion)` marker: the lifespan table (`modules/lifecycle.ts`). The board
declines `createSpatialGrid`: its adjacency is shared arithmetic with the spine
(`modules/board.ts` says why).

## Balance model

The spine is `data/spine.ts`, printed by `balance/phase-shifter-projection.ts` with
its beat schedule check. `balance/arc-probe.ts` plays the shipping game to the closed
case. `BALANCING.md` covers the tunables and couplings.
