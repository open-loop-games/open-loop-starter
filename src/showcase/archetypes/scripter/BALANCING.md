# Scripter — balancing

A geometric student ladder under a multiplier stack, with a scroll that spends the
student's beats and challengers that turn some of those beats into bouts. Training
strikes are most of the income: a strike banks (1 + Temper) seconds of the students'
meditation, every beat. Bouts pay a bounty against the reference scroll's pace, and the
first win over each challenger multiplies all Ki. The bucket and where its closed form
stops are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`, the challengers' rules in
`RULES`, and each challenger's measured `PAR`. The arrival gates, the answering techniques'
prices, Flowing Form's threshold and the graduation threshold are recorded by one pass of
the reference walk (`walkArc`), at their slots. To retune, change an anchor or a slot and
let the walk re-record; change a rule and re-measure `PAR` first.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `student/baseCost`, `student/growth` | 8, 2^(1/5) | The ladder's first price and its doubling every five students. A steeper ladder slows the whole arc, arrivals included. |
| `student/rate` | 0.2 Ki/s | One student's meditation, and through it every training strike. |
| `senpai/baseCost`, `senpai/growth`, `senpai/trainRate` | the 25th student's price, ×√2, 1/60 s | The cascade: how soon and how fast senpai add students. |
| `temper/baseCost`, `temper/growth` | the 10th student's price, ×2 | The fist. Temper multiplies training strikes, so it moves income more than any other key; Ren needs two levels. |
| `strike/seconds` | 1 | Seconds of income a training strike banks before Temper. |
| `executor/beatSeconds0`, `executor/beatShrink` | 2 s, ×0.75 per tier | The student's cadence. Faster beats mean more training strikes and shorter bouts in seconds. |
| `gate/rotationSeconds` | 90 s | The gap between bouts. Shorter means more bouts, so more of the income comes from bounties, and a bad scroll costs more. |
| `gate/bountyStrikesPerBeat` | 2 | A won bout's pay, in training strikes per par beat. At 1, a bout at par pays what training would have. |
| `gate/standing` | ×1.25 | All Ki per challenger beaten once. |
| `graduation/threshold` | recorded | Run Ki for the first Insight. |

**Not perturbable, on purpose:**
- The arrival gates, answer prices and Flowing Form's threshold are recorded from the walk
  at import. Moving a tunable does not move them, so the engine drifts off the schedule;
  move the anchor or the slot instead.
- `RULES` and `PAR` are paired. A rule perturbed without re-measuring par changes every
  bounty silently.

## Couplings

- **A bounty is paid against par.** It is 2 × par × min(2, par / beats) training strikes.
  A rule change that makes a challenger slower under the reference scroll lowers its
  bounty, and does so silently until `bout-probe.ts` records the new par.
- **Health is counted in blows, so Temper does not shorten bouts.** Only Ren's hide takes
  a fixed bite. The bounty scales with the training strike instead, so bouts stay a
  steady share of income across the arc, about a third in the walk.
- **The beat runs in one order.** The line in hand performs, the move resolves at the
  gate or as training, and only then does the sequencer advance. So a test reads the bout
  after the challenger's own beat, and `if foe winds: parry` raises the parry in time for
  the smash. Moving the advance before the resolution makes every test a beat stale.
- **A held line resumes on the next beat.** The sequencer's retry runs in the settle step,
  after the resolution. A `when` that comes true performs one beat later, which is why
  Iron-Shell Ma's window is three beats wide.
- **A challenger who wins comes back after three rotations.** The gap is what lets the
  dojo learn the answer between visits. At one rotation, a hopeless challenger takes most
  of the dojo's beats and the economy stalls.
- **The reference sensei saves only for an answer within reach.** Within 300 seconds of
  income, its scroll drops the purchase lines until it can buy. Without the horizon, a
  graduation mid-lesson leaves a price no new run can save for.
- **No graduation while a challenger at the gate is unbeaten.** The walk and the probe
  both wait, because a graduation takes the words back. A player who graduates mid-lesson
  re-learns the answer in the next run, at its arrival price.
- **The first graduation pays two Insight at 30:00.** The threshold is a quarter of the
  walk's run Ki there. Insight is a square root, so the threshold sets every later run's
  pay too.
- **Training is most of the income.** At late Temper a strike banks about twenty seconds
  of meditation per beat, so students' own Ki is a few percent. The ladder still matters
  as the strike's multiplicand. A change to `strike/seconds` or Temper's price is the
  largest lever on the arc.
- **Ki earned this run is counted off the Ki ref.** A sync watch adds every rise; the
  graduation's wipe of the dojo zeroes it. A lifetime cumulative minus a mark would also
  work at these magnitudes, but drops gains past about 9e15.

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| What does each challenger's word pay? | `bout-probe.ts [seeds]` | per challenger: wins and median beats with its word, before it, and under the dispatcher, beside `PAR` |
| Does the shipping game follow the walk? | `arc-probe.ts [seconds] [--beats]` | arrivals and first wins, graduations, bouts per challenger against par, the end state |

Run them from the repo root with
`pnpm exec vite-node src/showcase/archetypes/scripter/balance/<probe>.ts`. Each header says
how to read it. The arc probe plays 2.5 hours in a few seconds of wall time.

## Known thin

- **The middle arc runs up to three and a half minutes behind the walk on arrivals.** The walk buys
  greedily every second; the scroll buys one purchase per beat until Thousand Hands, and
  spends bout beats on it.
- **Bouts in the arc run 15–20% over par for Iron-Shell Ma, the Twins and the Envoy.** Par
  is measured on bout lines alone; the arc's scroll keeps its purchase lines, which spend
  bout beats. Their bounties pay at that speed factor.
- **Sister Wen and Master Lu are hard failures before their words.** Every earlier scroll
  loses to them, by design: chi runs out against Wen, and Lu answers every repeated form.
  The rest only earn less.
- **The rotation is uniform over the beaten.** Late in the arc the Straw Post still comes,
  for a bounty of eight beats. It is a breather, not a test.
- **The dispatcher is one scroll.** `PAR` for the Envoy is the reference dispatcher's; a
  better one beats it and is paid up to twice the bounty.
