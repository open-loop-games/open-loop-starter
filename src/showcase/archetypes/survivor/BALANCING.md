# Survivor — balancing

A take is two compounding curves racing on one floor: the loadout's damage, grown by the
rewrites, against the hp walking on, grown by the scene. The spine solves where they cross on
G, fits the rewrite ladder to the income it expects, and solves each rating's depth from the
agency a model career holds when it opens. What the driver banks, what it touches and what
the draft deals are measured. The bucket and where its closed form stops are
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
arrival curves, the margin, the income share, the shot, the ratings' pace, the clout
anchors); the rigs'
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
- **The ladder rides the income share.** `ANCHORS.incomeShare` is η times the share of
  arrivals downed, because the floor holds an uncleared crowd; η alone reads high. It has no
  fixed point: a refit brings the rewrites earlier, an earlier loadout downs more, and income
  rises again. Refit it from `take-probe.ts`'s `income` column on G, once.
- **A rating's depth is solved from the model career's agency.** The career banks
  `takesPerRating` full takes a rating, spent by the reference agent, and the depth is where
  the take clears its floor as G does with that agency's damage. Change an agency price or
  step, the pace or the reference agent, and every depth moves.
- **A deeper take pays more.** Clout is reels over a fixed rate, and more walks on deeper.
  The model career counts it; the agency's prices do not.
- **The opening rig binds the short-reach stars.** The Pyro Gag and the Breakaway Bottles
  cannot hold a crowd entered much past a scene deep with nothing bought: the take ends at
  level 1 before the first rewrite. The solved depths sit inside that line once the agency
  is held.
- **`MAX_EXTRAS` is a frame-rate guard only.** At 1000 it turns nothing away at any rating;
  the floor peaks under 900. A guard below the peak turns arrivals away in late takes, which
  caps the hp flux and decides them.
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
   level gain, the model career with each rating's solved depth, the clout model. Change an
   anchor here first. Under a second.
2. `take-probe.ts [seeds] [ratings] [bare]`: every star × rating with the model career's
   agency, or nothing bought with `bare`. Read `cut` per cell against G's, `income` against
   1.00, contact, `away` for the guard, and the ladder rows on G. About 15 s.
3. `career-probe.ts [seeds] [takes]`: the meta arc under the stars' instincts and the
   reference agent. Read the firsts against `manifest.ts`, the takes per rating and the agency
   at the end. About 20–30 s.
4. `steering-probe.ts [seeds]` and `cone-probe.ts [seeds]`: the movement policy. Read term
   spreads by density, the path's turn rate, and the cone's capture. Seconds each.

Each fans its takes over the cores (`balance/_pool.ts`); the header of each says how to read
it.

## Known thin

- **The ratings gate only the short-reach stars.** With nothing bought, the Veteran reaches
  CUT at R in 7 takes of 8; the Pyro and the Wirework Ace die at PG-13 and R in about 20 s.
- **The career runs ahead of its model.** The model banks three takes a rating; the reference
  career reaches CUT at each rating on its first or second take, so R opens near 35 minutes
  and the agency is bought out within twelve takes. The arc has no target beyond that yet.
- **The Pyro is the weakest star.** It reaches CUT at G in about half its takes with nothing
  bought, and in 27 of 38 career takes.
- **The cone catches little.** The stars land 8% of the best cone while it is armed, and 16%
  at the instant it fires: the gag fires on the first body to enter it, so it fires early on
  one.
- **The threat term decides alone on a crowded floor.** Past 50 bodies its spread is
  550–2400 against 10–40 for every other term, and most samples expect contact on every
  candidate.
- **The star never holds its mark** for the Dolly Rifle, and never plays the shot.
- **No ending.** The career has no last take to build toward.
- **No automation tier, by design.** An improvising star is an alternative driver chosen per
  take, not automation the player unlocks, so no `AutomationTiers` ladder gates it. A ladder
  would withhold nothing. Automation a player earns, such as an auto-draft, would be a
  different seam.
