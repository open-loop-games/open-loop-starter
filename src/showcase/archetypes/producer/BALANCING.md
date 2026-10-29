# Producer — balancing

A geometric cost ladder under multiplicative stacks, with no adversary and no reset.
Cash buys units and phones, they earn cash, and discrete steps (memos, certificates,
grades, synergies, press) multiply what they earn. Tips add a random, attention-bound
layer on top. Automation hands the spending to desks that follow the buy order the spine
projects. The bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the authored anchors at the top of `data/spine.ts`. To retune,
change an anchor and let the derivations follow: `m` comes from two beat times, and the
per-tier cost step is re-solved on import so the reference player buys the ending at
`ENDING_TARGET`.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `balance/costRatio` | `COST_RATIO` (≈1.14) | How fast every subsidiary's price climbs with its own count. Higher is a slower arc and longer beats between buys. |
| `subsidiaries/<id>/baseCost` | the solved ladder | One tier's opening price. Lower brings that tier's opening forward and pulls the desk's buying toward it. |

**Not perturbable, on purpose:**
- The beat anchors and `ENDING_TARGET` set `m` and the solved cost step.
  Perturbing the results instead of the anchors desyncs the game from the projection.
- Every one-shot's price (memos, synergies, networks, press, tip upgrades, hires, the
  bookkeeper, the ending) is derived from the ladder at import; moving `baseCost`
  through the registry does not move them.
- `ACTIVE_DEAL_RATE` is both the probe hand's rate and the sales desk's starting phones,
  so the desk replaces the hand rather than out-earning it.

## Couplings

- **`m` is set by two beat times together.** `COST_RATIO = (LATE_BEAT / OPENING_BEAT)^(1/(LATE_LEVEL−1))`.
  Moving one anchor alone changes every beat in the arc.
- **The cost step is solved against the whole projection.** Change anything
  `projectArc` reads and the step re-solves on import, so the ending stays near
  `ENDING_TARGET` while every earlier beat moves.
- **The desk's cadence is part of the spine.** The acquisitions desk buys one unit
  every `ACQUISITION_INTERVAL`, so cash it cannot spend yet waits for a costlier unit with
  a better payback. The projection buys at the same cadence once the desk is hired;
  spending everything each second puts it behind the engine's counts within the first
  half hour.
- **The memo reserve carries the arc.** Once the board sits, the desk holds back the
  cheapest open memo, synergy or network. Without it the desk spends every dollar on
  units priced just under a memo (`allocation-probe.ts`). Any change to the board's rule
  needs the projection's reserve changed with it.
- **A desk that saves for units breaks the projection.** `waitForCost` on the
  acquisitions desk compresses the arc far past what a non-saving projection follows.
- **Attention is worth a seventh of the arc.** The idle player buys the building about
  14% after the attentive reference in closed form (`tip-probe.ts` § 2), and 17% on the
  engine. The tip achievements are part
  of that share: they count toward standing, and standing compounds through every press.
  A new tip effect, a stronger one or another tip achievement widens the gap.
- **Bull markets are convex.** A drawn bull market (the whole multiplier one tip in three)
  earns more than its expected value booked evenly (a third of it every tip): the desk
  buys through it at its cadence and the next windfall reads the bank it leaves. The solve
  targets the expected arc, so a stronger bull market pulls the drawn arc ahead of it;
  `tip-probe.ts` § 1 prints the gap.
- **Only the first tip upgrade moves the reference.** It halves the interval; the second
  only keeps a tip up longer, and the third comes after the ending at the reference's
  catch.
- **The windfall reads the bank.** It pays the smaller of 15% of cash and 15 minutes of
  income, so saving pays until the bank is 100 minutes of income. The acquisitions desk
  spends the bank down; sending it home is the trade.
- **The closing spree is sized for the early game.** It multiplies hand deals, which are
  a large share of income in the first minutes and a sliver after the referral network.
  At ×777 (Cookie Clicker's) the first spree buys two tiers at once.
- **Synergies amplify count leads.** A cheap holding's synergy pays ×(1 + 0.05 × the
  costly holding's count) per memo, about ×8.5 at 150. Whoever reaches a pair's threshold
  first jumps ahead, so small allocation differences compound.
- **Standing is shared by every achievement.** Any certificate, grade or feat raises
  every press already bought. Adding achievements raises income everywhere.
- **Grades are solved with the ladder.** A grade's threshold is the lifetime revenue the
  reference has at its share of the arc, so the ten grades mark eleven even chapters
  (`solveGrades`). Anything that moves the projection moves the thresholds; a player off
  the reference's pace reaches each grade at another time.
- **The offline window is the smaller of two limits.** A quarter of the arc, and the
  wait a return may hold the load (`OFFLINE_WAIT_BUDGET / OFFLINE_REPLAY_COST`). The
  replay cost is measured with every desk working; a heavier module stack raises it.
- **Time away replays the desks, not the player.** Tips go uncaught and press waits, so
  the arc slips by more than the time away; early on, five minutes away costs about
  nine (`offline-probe.ts` § 2).

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| What does the spine predict? | `producer-projection.ts [minutes]` | the ladder, the stack's prices, projected economic beats, the ending, the offline window |
| Does the shipping game follow it? | `arc-probe.ts [minutes] [seed] [--beats]` | landmarks beside the projection, economic beats and flow channels per hour, the end state |
| How much do tips move the arc? | `tip-probe.ts [seeds]` | the ending drawn over seeds against the expected arc, and by catch rate |
| What does the desk's rule carry? | `allocation-probe.ts [minutes]` | income, top-tier time and counts under each desk variant and hand speed |
| What does time away do? | `offline-probe.ts` | accumulation against closed form, beats with and without time away, the replay cost |

Run each from the repo root with `pnpm exec vite-node src/showcase/archetypes/producer/balance/<probe>.ts`.
Each probe's header says how to read it. A full arc probe plays four hours in quarter
seconds and takes several minutes; run seeds in parallel.

## Known thin

- **The engine runs ahead of the projection when tips are caught.** Over seeds 1–3 the
  building is bought at 3h49m–3h59m, against a drawn median near 4h04m. An idle engine
  lands within a few percent of the idle projection, so the engine values the spree,
  the windfall or the tip achievements more than the projection books them.
- **The expected ending is jagged in the cost step.** A 0.1% change in the step moves it
  by up to ±3%, because the greedy buy order flips; the solve lands within that of
  `ENDING_TARGET`, and any change to the projection re-rolls where.
- **The longest waits come before a late memo.** Hours two to four bring 23–40 economic
  beats an hour, with most gaps under seven minutes. The longest, 8–11 minutes, wait for a
  memo such as Night Depots or Ballot Printing. Feats break the save for the building
  into gaps under nine minutes.
- **The bookkeeper's cost is not in the projection.** The reference never hires it;
  hiring it delays the first hour by a few seconds.
