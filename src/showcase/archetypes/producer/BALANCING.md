# Producer — balancing

A geometric cost ladder under multiplicative stacks, with no adversary and no reset:
cash buys units, units earn cash, and discrete steps (memos, certificates, grades)
multiply what units earn. Automation hands the spending to desks that follow the same
buy order the spine projects. The bucket and its closed form are in `IDENTITY.md`
§ Rate-function spine.

The numbers come from the authored anchors at the top of `data/spine.ts`. To retune,
change an anchor and let the derivations follow: `m` comes from two beat times, and the
per-tier cost step is re-solved against `LADDER_TARGET` on import.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `balance/costRatio` | `COST_RATIO` (≈1.14) | How fast every subsidiary's price climbs with its own count. Higher is a slower arc and longer beats between buys. |
| `subsidiaries/<id>/baseCost` | the solved ladder | One tier's opening price. Lower brings that tier's opening forward and pulls the desk's buying toward it. |

**Not perturbable, on purpose:**
- The beat anchors (`OPENING_BEAT`, `LATE_BEAT`, `LATE_LEVEL`) and `LADDER_TARGET` derive
  `m` and the cost step. Perturbing the results instead of the anchors desyncs the game
  from the projection the probes diff against.
- Memo, training, grade and hire prices are derived from the ladder at import; moving
  `baseCost` through the registry does not move them.
- `ACTIVE_DEAL_RATE` is both the probe hand's click rate and the sales desk's rate, so
  the desk replaces the hand rather than out-earning it.

## Couplings

- **`m` is set by two beat times together.** `COST_RATIO = (LATE_BEAT / OPENING_BEAT)^(1/(LATE_LEVEL−1))`.
  Moving one anchor alone changes every beat in the arc.
- **The cost step is solved against the projection.** Change anything `projectArc`
  reads (the stack, the hires, the reserve rule) and the step re-solves on import, so
  the top tier stays at `LADDER_TARGET` while every intermediate beat moves.
- **The memo reserve carries the arc.** Without it the acquisitions desk spends every
  dollar on units priced just under a memo, and income at 30 minutes falls by about 40%
  (`allocation-probe.ts`). Any change to the board's rule needs the projection's
  reserve branch changed with it.
- **A desk that saves for units breaks the projection.** `waitForCost` on the
  acquisitions desk compresses the arc far past what a non-saving projection follows:
  the ladder flattens and the top tier opens in half the time. The projection can model
  a saving rule only if it saves the same way.
- **Grades read lifetime revenue, not cash.** A grade's threshold is the opener price of
  a tier two above it, so grades track the ladder; retune the ladder and the grades
  move with it.
- **The offline window is the smaller of two limits.** Game length (`LADDER_TARGET`)
  and the wait a return may hold the load (`OFFLINE_WAIT_BUDGET / OFFLINE_REPLAY_COST`).
  The replay cost is measured with every desk working; a heavier module stack raises it.
- **Replay chunks follow the acquisitions desk.** Catch-up advances in
  `ACQUISITION_INTERVAL` chunks so the desk buys on its own cadence through a replay.
  A coarser chunk replays faster and buys less.

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| What does the spine predict? | `producer-projection.ts [minutes]` | the ladder, the stack's prices, projected beats, the offline window and which limit binds |
| Does the shipping game follow it? | `arc-probe.ts [minutes]` | every perceptible beat beside its projection, the flow channel of each gap, and the end state |
| What does the desk's rule carry? | `allocation-probe.ts [minutes]` | income, top-tier time and counts under each desk variant and hand speed |
| What does time away do? | `offline-probe.ts` | accumulation against closed form, beats with and without time away, and the replay cost |

Run each from the repo root with `pnpm exec vite-node src/showcase/archetypes/producer/balance/<probe>.ts`.
Each probe's header says how to read it.

## Known thin

- **Content runs out at about 40 minutes.** Past the top tier, memos and certificates
  arrive minutes apart; in a 120-minute run the arc is engaged 59% of the time.
- **The bookkeeper's cost is not in the projection.** The probe's hand never hires it,
  so the beats it records are the arc without it; hiring it delays the top tier by a few
  seconds (`offline-probe.ts` § 2).
- **The projection runs a little ahead.** Realized beats trail the projected ones by up
  to 6%, and income at 30 minutes sits at 94% of projected. Nothing yet says which of the
  projection's simplifications the gap comes from.
