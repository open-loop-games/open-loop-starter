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
- The beat anchors, `ENDING_TARGET` and `DRAWN_PACE` set `m` and the solved cost step.
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
  every `ACQUISITION_INTERVAL`, so cash it cannot spend yet waits for a dearer unit with
  a better payback. The projection buys at the same cadence once the desk is hired;
  spending everything each second puts it behind the engine's counts within the first
  half hour.
- **The memo reserve carries the arc.** Once the board sits, the desk holds back the
  cheapest open memo, synergy or network. Without it the desk spends every dollar on
  units priced just under a memo (`allocation-probe.ts`). Any change to the board's rule
  needs the projection's reserve changed with it.
- **A desk that saves for units breaks the projection.** `waitForCost` on the
  acquisitions desk compresses the arc far past what a non-saving projection follows.
- **Bull markets are convex.** A drawn bull market (×7 one tip in three) earns more than
  its expected value booked evenly (×3 every tip): the desk buys through it at its
  cadence and the next windfall reads the bank it leaves. `DRAWN_PACE` is that gap, the
  median drawn ending over the expected one. It moves with anything that changes tips,
  the desk's cadence or the windfall, and `tip-probe.ts` § 1 re-measures it.
- **The windfall reads the bank.** It pays the smaller of 15% of cash and 15 minutes of
  income, so saving pays until the bank is 100 minutes of income. The acquisitions desk
  spends the bank down; sending it home is the trade.
- **The closing spree is sized for the early game.** It multiplies hand deals, which are
  a large share of income in the first minutes and a sliver after the referral network.
  At ×777 (Cookie Clicker's) the first spree buys two tiers at once.
- **Synergies amplify count leads.** A cheap holding's synergy pays ×(1 + 0.05 × the
  dear holding's count) per memo, about ×8.5 at 150. Whoever reaches a pair's threshold
  first jumps ahead, so small allocation differences compound.
- **Standing is shared by every achievement.** Any certificate, grade or feat raises
  every press already bought. Adding achievements raises income everywhere.
- **Grades read lifetime revenue, not cash.** A grade's threshold is an opener price,
  so grades track the ladder.
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
| How much do tips move the arc? | `tip-probe.ts [seeds]` | the ending drawn over seeds against the expected arc (`DRAWN_PACE`), and by catch rate |
| What does the desk's rule carry? | `allocation-probe.ts [minutes]` | income, top-tier time and counts under each desk variant and hand speed |
| What does time away do? | `offline-probe.ts` | accumulation against closed form, beats with and without time away, the replay cost |

Run each from the repo root with `pnpm exec vite-node src/showcase/archetypes/producer/balance/<probe>.ts`.
Each probe's header says how to read it. A full arc probe plays four hours in quarter
seconds and takes several minutes; run seeds in parallel.

## Known thin

- **The engine runs a little ahead of the drawn projection.** Over seeds 1–3 the ending
  lands at 3h45m–4h03m against a drawn median of about 4h; the first fifteen minutes vary
  most, because the first tip's draw decides when the top tiers open.
- **`DRAWN_PACE` is noisy.** It moves ±1.5% between solves on 24 seeds.
- **The idle player does not reach the ending.** With no tips caught the arc runs past
  eight hours; at half the tips, six (`tip-probe.ts` § 2). Attention is worth more than
  the line's slow-end exemplars would allow.
- **Economic beats thin in hour two.** Hours two to four bring 13–27 economic beats an
  hour, and the longest gap between them runs 10–16 minutes; tips fill the minutes.
- **Grades are spent by the first half hour.** Their thresholds are opener prices, which
  the arc passes early; later revenue marks carry the record.
- **The bookkeeper's cost is not in the projection.** The reference never hires it;
  hiring it delays the first hour by a few seconds.
