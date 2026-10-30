# Survivor — balancing

A take is two compounding curves racing on one floor: the loadout's damage, grown by the
rewrites, against the hp walking on, grown by the scene. The spine solves where they cross on
G, fits the rewrite ladder to the income it expects, solves each rating's depth from the
agency a model career holds when it opens, and sizes the shop to what that career pays by
the wrap. The script stages a lead at the climax and set pieces, guests and marks before
it, each sized off the scene's design damage. What the driver banks, what it touches, what
the draft deals and how a lead fight goes are measured. The bucket and where its closed form stops are
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
anchors, the arc's length); every number in `data/script.ts` (the lead's time and share,
the strike call, the marks, the set pieces, the guests and their windows); the ratings'
pay and gates (`data/ratings.ts`); the rigs'
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
- **A harsher take pays more twice.** More walks on deeper, and the rating's pay multiplies
  the clout. The model career counts both, and the shop is solved to what it pays by
  `arcTakes`, so raising a pay or the arc's length grows every agency price.
- **The leads are the ratings' real gate.** A lead's hp is `leadSeconds` of the share of the
  design damage that reaches one body (`leadShare`, assumed). The depths make each rating
  clear like G; the leads decide how many takes a rating holds the career, and so the arc's
  length. A change to either moves the wrap; `career-probe.ts` reads it.
- **R's part rides the agency's spread.** The Big Bad's hp is solved as the wrap's damage ×
  health over R's opening. A cheaper shop or a richer opening agency shrinks it.
- **The marks cut the lead.** Each filled mark takes a quarter of the lead's hp, so mark
  kills and lead hp trade one for one. A mark's kills are a share of a G take's arrivals;
  deeper ratings walk more on, so marks fill sooner there.
- **The crew plays to the cast.** Single-target rigs fire on the lead and a rival in reach
  before the crowd, and the draft favours a single-target rig while the loadout has none.
  Remove either and the area-rig stars cannot close a lead out.
- **The set clears at the climax.** The crowd walks off without reels when the lead walks
  on, and arrivals restart at the climax's scene. Overtime is a duel against a fresh
  crowd; without the clear the floor reaches the guard within a minute of the climax.
- **The opening rig binds the short-reach stars.** The Pyro Gag and the Breakaway Bottles
  cannot hold a crowd entered much past a scene deep with nothing bought: the take ends at
  level 1 before the first rewrite. The solved depths sit inside that line once the agency
  is held.
- **`MAX_EXTRAS` is a frame-rate guard.** At G and PG it turns nothing away. At PG-13 and
  R the set pieces and crowd calls push the floor to it just before the climax, and it turns
  away a few percent of a take's arrivals there. A lower guard caps the hp flux and decides
  takes.
- **The movement score is decided by spread.** Each weight in `modules/sim/steering.ts` is
  sized against the others in score units; a term that reads the same on every candidate
  steers nothing. Contact is costed over remaining health, so the same crowd is cheap at full
  health and lethal at a fifth of it. Bikers walk faster than the double, which widens the
  contact band of every candidate they approach.
- **The heading-bound discount rides on the cone probe.** An improvising star discounts the
  Pyro Gag by about the gap `cone-probe.ts` measures; a better aim shrinks the gap and the
  discount should shrink with it. A hand is not discounted.
- **The floor ticks at 30 Hz, fixed; the star decides at 10 Hz.** The arena step is not
  tick-robust: a different dt plays a different take. The live engine, the probes and the
  suites all tick at `INTERVAL_RATE`. An improvising star re-decides its heading every
  `DECISION_SECONDS` and swings toward it every tick; a faster cadence costs probe time and
  plays the same in aggregate.
- **A take is never saved.** A load mid-take forfeits it and returns to the call sheet.

## Running a pass

1. `survivor-projection.ts`: the spine with no engine: the schedule against the ladder, the
   level gain, the model career with each rating's solved depth, the clout model. Change an
   anchor here first. Under a second.
2. `take-probe.ts [seeds] [ratings] [bare]`: every star × rating with the model career's
   agency, or nothing bought with `bare`. Read `cut` and `fall` per cell, `left` for the
   leads that stood, marks and jackpots, `income` against 1.00, contact, `away` for the
   guard, and the ladder rows on G. About 15 s.
3. `career-probe.ts [seeds] [takes]`: the meta arc under the stars' instincts and the
   reference agent. Read the firsts against `IDENTITY.md` § The arc, the wrap against two hours, the
   takes per rating and the agency at the end. About 30 s.
4. `steering-probe.ts [seeds]` and `cone-probe.ts [seeds]`: the movement policy. Read term
   spreads by density, the path's turn rate, and the cone's capture. Seconds each.

Each fans its takes over the cores (`balance/_pool.ts`); the header of each says how to read
it.

## Known thin

- **The career's pace is set by the leads, not the model.** The model banks three takes a
  rating and six at R; the reference career clears G and PG in about two takes each,
  holds at PG-13 for the ledger's second star, and wraps the picture in two or three R
  takes. The arc lands near two hours, but by a different shape than the model's.
- **The leads' share is assumed.** `leadShare` is not measured per star; the Veteran fells
  leads in under a minute where it reaches them, the Wirework Ace in two.
- **The Pyro and the Wirework Ace die before the climax.** At their opening agency they fall
  short of seven minutes in about half their takes at G and PG; the Pyro's cone stays at
  level 1 under the heading-bound discount. They fell every lead they reach.
- **The career probe is the slow one.** A career is sequential, so its wall time is one
  career's: about 30 s for eighteen takes, most of it the late crowd's shoulder pass and
  the steering score.
- **The cone catches little.** The stars land 8% of the best cone while it is armed, and 16%
  at the instant it fires: the gag fires on the first body to enter it, so it fires early on
  one.
- **The threat term decides alone on a crowded floor.** Past 50 bodies its spread is
  550–2400 against 10–40 for every other term, and most samples expect contact on every
  candidate.
- **The star never stands still** for the Dolly Rifle's bonus, and never plays the shot;
  it works a chalk mark only by holding the crowd inside it.
- **No automation tier, by design.** An improvising star is an alternative driver chosen per
  take, not automation the player unlocks, so no `AutomationTiers` ladder gates it. A ladder
  would withhold nothing. Automation a player earns, such as an auto-draft, would be a
  different seam.
