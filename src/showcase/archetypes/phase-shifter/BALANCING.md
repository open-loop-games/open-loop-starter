# Phase-shifter — balancing

Three economies in sequence, each a geometric purchase ladder funded by a rate that
grows with what it buys. A one-way door ends each one, so the phases never compound:
what couples them is what a door hands forward. The bucket and the splice are in
`IDENTITY.md` § Rate-function spine.

The numbers come from `ANCHORS` at the top of `data/spine.ts`: a click rate, a ladder
ratio, a length for each phase and the nights the first and last alibis hold. To
retune, change an anchor and let the derivations follow: the box's size, the board's
threshold and the elimination ladder are all solved from them.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `ladders/growth` | 1.15 | Every repeatable ladder's ratio: clerks, canvassers, witnesses. Higher is fewer buys per phase. |
| `box/pages` | 4434 | Pages in the box. More pages lengthen Phase I, but the first door reads the spine's count. |
| `box/notesPerPage` | 1 | Notes a page pays. Phase II starts on what is left. |
| `box/clerk/pagesPerS`, `box/clerk/baseCost` | 1, 16 | A clerk's reading pace and first price: Phase I's ramp. |
| `board/notesPerLead` | 10 | Notes per lead, by hand or by clerk. |
| `board/clerk/notesPerS` | 2 | A reassigned clerk's cross-referencing pace. |
| `board/tipline/notesPerS` | 2 | The phone's trickle: Phase II's floor. |
| `board/canvasser/notesPerS`, `board/canvasser/baseCost` | 2, 4 | A canvasser's supply and first price: Phase II's ramp. |
| `board/secondShift/cost` | 132 | The second shift's price in leads. |
| `night/seconds` | 40 | Sim-seconds per replayed night. Every night's yield scales with it. |
| `night/baseRate` | 1 | Contradictions/s of a bare model. |
| `night/witness/baseCost` | 40 | The first witness account. |
| `night/eliminate/baseCost`, `night/eliminate/ratio` | 75, 1.59 | The alibi ladder: when the first and the last suspect fall. |
| `night/insomnia/cost`, `night/insomnia/speed` | 120, 2 | Insomnia's price and the game speed it sets. |
| `night/clerks/witnessShare` | 0.5 | Share of the bank the filing policy may spend on witnesses. |

**Not perturbable, on purpose:**
- **The door thresholds** read the spine, not the registry, because they are Gate data
  registered at install. Perturbing `box/pages` changes the box but not the record the
  first door reads; change the anchor instead.
- **`ANCHORS.filingTierNights`** is the clerks' automation tier. Moving it changes the
  night's arc, so it is a spine decision, not a knob.

## Couplings

- **The box is finite, so a clerk costs Phase II fuel.** Every note spent on a clerk is
  a note the board never burns. The spine assumes greedy hiring; a player who
  under-hires carries more notes across and runs Phase I longer.
- **The clerk count crosses the first door.** Phase I's ladder sets Phase II's
  cross-referencing capacity. Under the reference player that capacity is far above
  the note supply, so the hand verb on the board is idle. Raising Phase I's ladder
  deepens that.
- **Fidelity reads the board's lifetime record.** The night's yield scales with
  √(lifetime leads / threshold). A player who stays on the board past its record
  starts the night stronger; the reference player opens the door at once, at ×1.
- **The night's solves share one dawn order.** Witnesses by the filing policy, then
  suspects, then insomnia. `shouldFileWitness` is both the spine's assumption and the
  clerks' policy, so changing it changes both together; a dawn order the probe does
  not follow breaks the prediction silently.
- **Insomnia is game speed.** It sets the TickDriver's `speedMultiplier`, so it
  shortens wall time, not sim time. The spine's beats are sim-seconds.

## Running a pass

- `balance/phase-shifter-projection.ts` prints the spine: each phase's ladder, what
  each door carries, the night's elimination schedule, and each beat against the
  anchor that set it. An `off` mark means a derived value no longer lands on its
  anchor.
- `balance/arc-probe.ts` plays the shipping game to the closed case under the
  reference player its header describes, and prints each beat's sim-second against the
  spine, the retirements at each door, and restore parity for saves taken mid-phase.

## Known thin

- **No door changes what the player does.** Every phase is a purchase list in a new
  currency. The line's door test asks each door to change the verb or the control
  level, and the scarcity or the failure mode with it; these doors change neither.
- **Phase II's hand verb is idle.** The inherited clerks cross-reference far faster than
  notes arrive, so the cross-reference button does nothing a player can feel.
- **Phase III is mostly waiting.** After the filing tier opens the player's acts are
  the eliminations and insomnia; suspects fall in a fixed order, bought, not deduced.
- **The board runs 8s long.** The second shift is bought mid-phase and is outside the
  board's solve, and every later beat carries the same 8s.
