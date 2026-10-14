# Survivor — balancing

A take is two compounding curves racing on one floor: the loadout's damage, grown by the
rewrites, against the hp walking on, grown by the scene. The spine solves where they cross on
G and fits the rewrite ladder to the income it expects. What the driver banks, what it
touches and what the draft deals are measured. The bucket and where its closed form stops are
in `IDENTITY.md` § Rate-function spine.

## The tunables

Every key is read through `tunable()` and listed in `modules/tuning.ts`. A probe overrides
one with `perturb()` from `balance/_set.ts`.

| Key | Default | What it moves |
|---|---|---|
| `contact/scale` | 1 | Contact damage against the spine's curve. It moves survival and nothing the ladder reads, so the rewrites keep their times while takes end sooner or later. |
| `player/baseHp` | 100 | The double's health before the star's bias, Padding and Stamina. Like contact, it moves survival only. |

**Not perturbable**, because each feeds a solve and a change means rerunning
`survivor-projection.ts`: every anchor in `data/spine.ts` (the take, the scene, the hp and
arrival curves, the margin, η, the shot, the ratings' offset, the clout anchors); the rigs'
cooldowns, reach and expected hits (`data/rigs.ts`), which set each rig's base damage; the
extras' roster (`data/extras.ts`), which the hp flux reads; the card weights; the agency's
prices and steps; the stars' instincts.

## Couplings

- **Every rig opens at the same damage a second.** Base damage is DPS0 × cooldown ÷ expected
  hits, so a rig's shape is its only difference at level 1. Expected hits are an assumption
  per shape: change a reach and the rig's real damage moves while its base damage does not.
- **The level gain is solved against a depth-first mean loadout.** A draft that goes broader
  than the mean pick order delivers less damage than the gain was solved for; one that goes
  deeper delivers more. `CARD_WEIGHTS` and the stars' draft policy both move this.
- **The ladder is fitted to assumed income.** Income rides `ANCHORS.eta` and the shot share.
  A driver that banks less pushes every rewrite late; one that banks more pulls them early.
  The first beats always run late, because a driver has swept nothing before the first one.
- **Clout is anchored to a take that wipes out.** `REELS_PER_CLOUT` assumes a zero-meta take
  ends at `baselineTakeSeconds`; a take that reaches CUT pays about twice that, so the shop
  costs about 17 full takes, not the anchored 36.
- **A rating is the same curves entered deeper.** The spine solves G only. What a rating
  demands of the loadout grows ×1.5 a scene of offset, and the agency adds at most ×1.6
  damage, so a harsher rating passes on survival perks, the driver and the population guard.
- **`MAX_EXTRAS` turns arrivals away.** Past 500 bodies on the floor no arrival is admitted. A
  frame-rate guard, but it caps the hp flux, so where it binds it decides the take.
- **The movement score is decided by spread.** Each weight in `modules/sim/steering.ts` is
  sized against the others in score units; a term that reads the same on every candidate
  steers nothing. Contact is costed over remaining health, so the same crowd is cheap at full
  health and lethal at a fifth of it. Bikers walk faster than the double, which widens the
  contact band of every candidate they approach.
- **The heading-bound discount rides on the cone probe.** An improvising star discounts the
  Pyro Gag by about the gap `cone-probe.ts` measures; a better aim shrinks the gap and the
  discount should shrink with it. A hand is not discounted.
- **The floor ticks at 30 Hz, fixed.** The arena step is not tick-robust: a different dt plays
  a different take. The live engine, the probes and the suites all tick at `INTERVAL_RATE`.
- **A take is never saved.** A load mid-take forfeits it and returns to the call sheet.

## Running a pass

1. `survivor-projection.ts`: the spine with no engine: the schedule against the ladder, the
   level gain, each rating's demand against the loadout, the clout model. Change an anchor
   here first. Under a second.
2. `take-probe.ts [seeds] [ratings]`: every star × rating with no agency. Read `cut`, η and
   contact per cell, `away` for the guard, and the ladder rows on G. About 15 s.
3. `career-probe.ts [seeds] [takes]`: the meta arc under the stars' instincts and the
   reference agent. Read the firsts against `manifest.ts`, the takes per rating and the agency
   at the end. About 20–30 s.
4. `steering-probe.ts [seeds]` and `cone-probe.ts [seeds]`: the movement policy. Read term
   spreads by density, the path's turn rate, and the cone's capture. Seconds each.

Each fans its takes over the cores (`balance/_pool.ts`); the header of each says how to read
it.

## Known thin

- **The ratings are past the agency.** On the projection, PG's last beat asks 1.83× the
  zero-meta loadout, PG-13 3.34× and R 6.11×, against the agency's ×1.6. In the career, takes
  at PG-13 and R end at a median of about 0:25.
- **R is reached through the population guard.** The career's R takes that reach CUT do so
  with the guard turning thousands of arrivals away; the same holds at PG-13.
- **Clout is anchored to the wrong take.** See § Couplings: the shop costs about 17 full
  takes.
- **The Pyro and the Wirework Ace die at PG and above with nothing bought,** in about 20 s.
  In the career the Pyro reaches CUT in almost no take: its draft discount leaves its own
  gag at level 1.
- **The cone catches little.** The stars land 8% of the best cone while it is armed, and 16%
  at the instant it fires: the gag fires on the first body to enter it, so it fires early on
  one.
- **The threat term decides alone on a crowded floor.** Past 50 bodies its spread is 440–1600
  against 10–25 for every other term, and most samples expect contact on every candidate.
- **The star never holds its mark** for the Dolly Rifle, and never plays the shot.
- **No ending.** The career has no last take to build toward.
- **No automation tier, by design.** An improvising star is an alternative driver chosen per
  take, not automation the player unlocks, so no `AutomationTiers` ladder gates it. A ladder
  would withhold nothing. Automation a player earns, such as an auto-draft, would be a
  different seam.
