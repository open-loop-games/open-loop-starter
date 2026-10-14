# Scaler — balancing

A geometric hero ladder under two prestige layers, with no click and no RNG. Heroes
earn Justice; a Reboot turns Justice earned into Legacy by a cube root, and a Rewrite
turns Legacy earned into Continuity by a square root, each multiplying the corps. The
bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the authored anchors and levers at the top of `data/spine.ts`.
The tier cost step, the Reboot and Rewrite thresholds, the softcap knee, the Elseworld
goals and Continuity's power are all derived on import. To retune, change an anchor or a
lever and let the derivations follow.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `heroes/priceRatio` | `ANCHORS.priceRatio` (1.15) | How fast every tier's price climbs with its own count, before Villain Uprising's rule or reward. Higher is a slower run and a later Reboot. |
| `heroes/<id>/baseCost` | the solved ladder | One tier's first-unit price. Lower opens that tier sooner and pulls the desk toward it. |

**Not perturbable, on purpose:**
- The anchors and levers set every derived threshold. Perturbing a threshold instead of
  its anchor desyncs the game from the reference walk.
- The Reboot threshold, the Rewrite threshold, the Elseworld goals and Continuity's
  power are computed at import from the walk; moving a tunable does not move them.

## Couplings

- **`hold` is fitted to the desk.** The ladder model fills a tier to `hold` units before
  saving for the next; the Dispatch Desk interleaves tiers instead. Change the desk's
  policy and refit `hold` against § tier openings of the arc probe.
- **The desk buys until it would rather save.** Each tick it recruits by blended payback
  until the best pick is unaffordable. A desk limited to one recruit a tick falls behind
  the late economy: the 13th Reboot comes four minutes later and late Reboots floor at
  20–50 seconds.
- **The thresholds come from the reference walk.** The Reboot threshold is what a fresh
  run earns by `firstRebootS`. The Rewrite threshold is the Legacy earned after
  `rewriteAfter` Reboots of the walk, and the softcap knee sits on it, so pushing Legacy
  past the knee is the signal to go up a layer. Anything the walk reads moves both.
- **Elseworld goals are sized at one multiplier.** Each goal is what its restricted run
  earns in `elseworldS` seconds at the output the reference has when it buys Elseworld
  Protocols. The reference enters an Elseworld only at that output, never straight after
  a Rewrite strips the Legacy term; a player who enters early faces a far longer run.
- **Continuity's power is solved on late cycles.** The power is set so Rewrite cycles 4
  to 8 shrink by `rewriteCompress` each. Cycles 1 to 3 compress for other reasons (the
  Elseworld rewards, Mythic Standing, the keep-set), and a target on them pins the
  power at zero.
- **Eternal Dispatch protects the next Rewrite.** The wipe runs before new Continuity is
  spent, so Eternal Dispatch bought at a Rewrite keeps the desk through the following
  one. The walk models it the same way.
- **One module per reset depth.** A ref joins a layer's scope by being created in that
  layer's module: the run in `modules/run.ts`, Legacy in `modules/legacy.ts`. A ref
  created elsewhere survives the reset.
- **An Elseworld's rule and reward on one chain need distinct descriptions.** Both lower
  to bind ids of `{scope}/{description}`, and a repeat throws.

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| Does the shipping game follow the spine? | `arc-probe.ts [seconds] [--beats]` | tier openings, every Reboot and Rewrite beside the reference walk, Elseworld goals, the end state |

Run it from the repo root with
`pnpm exec vite-node src/showcase/archetypes/scaler/balance/arc-probe.ts`. Its header says
how to read it. Ninety minutes of play take about a minute.

## Known thin

- **The arc ends at about seventeen minutes.** After the third Elseworld resolves there
  is no new content: Rewrite cycles settle near 20 seconds, and the Rewrite is a press
  every cycle because nothing automates it.
- **The tier openings run behind the ladder model.** The engine opens tiers 4–18% after
  the spine; `hold` absorbs the interleaving only on average.
- **The engine's short timelines run longer than the walk's.** From the tenth Reboot on,
  a timeline takes 2.5–6 seconds in the engine against the walk's 0.2–4. The walk ends a
  timeline the instant its target is earned; the probe's player acts every half second.
