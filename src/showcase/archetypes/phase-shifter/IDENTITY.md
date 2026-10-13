# Phase-shifter — archetype identity

> The one-way mechanic lifecycle — a mechanism installed, retired, demoted to supply or
> replaced by progress, never cycling back — over `automation`, `converter` and
> `statistics`, with an `ending`. Each door retires what came before it, and nothing
> ever opens it twice.

Identity line source: `../_identity.md` (Phase-shifter entry), with its door test; the
line's player experience and exemplar calls are `../_docs/phase-shifter.md`. **Core ·
open core.** The defining component, the one-way mechanic lifecycle, has no research
pattern, so this build designs it (§ The defining component). Universal Paperclips, A
Dark Room and Candy Box 2 show the composition ships, as a set; none is a lift target.

## What this archetype is

*Night Clerk.* A box with no label comes down the chute into a county records
sub-basement at 2:14 a.m.: the file on Ada Larkspur, a schoolteacher who vanished from
Harrow Mill on January 14, 1979. You read it page by page, and hire clerks to read
with you. When the box is empty you pin what it held to a board: notes come in by
telephone and canvasser, and the same clerks cross-reference them into leads. When
the board holds enough you take it down and rebuild the night itself as a model,
replayed 18:00 to 06:00, until six alibis hold. The seventh account is the one nobody
filed: the clerk on duty that night.

Each door is opened by hand once its record holds, and each retires what came
before it. A list of what is filed away, each stamped RETIRED or REASSIGNED, shows the
player that the door was one-way. The last door ends the content: the clock stops and
stays stopped.

## The defining component

**The lifecycle table** (`MECHANISMS` in `data/case.ts`, `modules/lifecycle.ts`).

- **Doors** are a purchasable category with `limit: 1`, opened in order, each from a
  record that spending never lowers: pages read, lifetime leads, suspects cleared. No
  reset names them, so door state only grows.
- **Every mechanism declares `[installedBy, retiredBy)`.** Its liveness is an engine
  Gate over the doors, so it flips on once and off once. The phase is derived as
  "doors opened", never stored beside them.
- **Three fates from one table.** Installed, retired, or replaced: `replaces` names the
  mechanism whose role a new one takes over. The clerks read, then cross-reference,
  then file: one count, three acts.
- **Enforcement.** A mechanism that owns a modifier chain hands it to `scope()`, which
  registers ×0 on a `ConditionalEffectSystem` outside its lifespan. A verb or purchase
  reads the same Gate through `visible` or `isLive()`. Nothing is saved; a load
  re-derives the live set from the doors, even loading backwards.

## Rate-function spine

**Bucket: exponential family, geometric cost ladders** (`incremental-math/…/rate-functions/exponential.mdx`),
one per phase, spliced at each door (`…/rate-functions/composition.mdx` § Piecewise
splice). Within a phase a ladder `base · 1.15ⁿ` is bought greedily from a rate linear in
what it buys. The phases do not compound: each door retires the ladder below it, so each
is solved alone, and what couples them is what a door hands forward.

- **The box** is sized so the greedy ladder empties it at its designed length; the same
  walk predicts the clerks and notes that cross the first door.
- **The board's** door threshold is the greedy ladder's lifetime take at its length,
  starting from the inherited notes.
- **The night** banks once per replay, so it is discrete: an elimination ladder solved
  by scan for its first and last night.

**Where the closed form stops.** Witness filing spends the bank between nights, so
the night's solve is a scan, not an inversion. The second shift is bought mid-phase and
sits outside the board's solve. Clerk capacity binding on the board is not modelled.
**What measures the remainder:** `balance/arc-probe.ts` times every beat against the
spine under the reference player, checks each door's retirements, and checks restore
parity on saves taken mid-phase.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| First clerk | 8s | 8s |
| The box is empty: pin it to the wall | 240s | 241s |
| The board holds: reconstruct the night | 660s | 668s |
| First alibi holds | 820s | 828s |
| Sixth alibi holds: the last account | 1300s | 1308s |

`manifest.ts` holds the recorded beats.

## Growth ports

- **A door with a choice.** A door that offers two next phases, one declined for good,
  so the lifecycle table branches.
- **An accusation, not a purchase.** The suspect is named by the player from what the
  replays turned up, and a wrong name costs the night.

## Engine fit

| Component | Engine primitive |
|---|---|
| the doors | `createPurchasableCategory` with `createGateRequirement` |
| mechanism liveness, dormancy | `createPredicateResolver`, `createConditionalEffectSystem` |
| reading, cross-referencing | `createConversion`, and a continuous converter hand-roll |
| clerks, canvassers, the model | `createPurchasableCategory`, `createProducerCategory` |
| the replayed night | `createCycle` |
| the clerks' filing | `createAutomationTiers` |
| the box's fragments | `createAchievementCategory` |
| insomnia | the TickDriver's `speedMultiplier` |

Two hand-rolls carry `TODO(expansion)` markers: the continuous converter
(`modules/convert.ts`) and the lifespan table (`modules/lifecycle.ts`).

## Balance model

The spine is `data/spine.ts`, printed by `balance/phase-shifter-projection.ts` with
its beat schedule check. `balance/arc-probe.ts` plays the shipping game to the closed
case. `BALANCING.md` covers the tunables and couplings.
