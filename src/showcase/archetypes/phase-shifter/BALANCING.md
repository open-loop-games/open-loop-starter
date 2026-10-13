# Phase-shifter — balancing

Three economies in sequence, each with its own currency and its own kind of player: a
clerk ladder bought with notes, a board that earns leads from where cards are pinned,
and a night roster bought with the accounts that sightings file. A one-way door ends
each one, so they never compound; what couples them is what a door hands forward. The
bucket and the splice are in `IDENTITY.md` § Rate-function spine.

The numbers come from `ANCHORS` at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: the box's size, the card price, the wall prices,
the board's threshold and the roster ladder are all solved from them.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `ladders/growth` | 1.15 | The clerk ladder's ratio. Higher is fewer clerks by the door, and more notes carried across it. |
| `box/pages` | 4434 | Pages in the box. More pages lengthen Phase I, but the first door reads the spine's count. |
| `box/notesPerPage` | 1 | Notes a page pays. Phase II writes cards from what is left. |
| `box/clerk/pagesPerS`, `box/clerk/baseCost` | 1, 16 | A clerk's reading pace and first price: Phase I's ramp. |
| `board/notesPerCard` | 47 | Notes a card costs to write up. Lower floods the inbox; higher starves the board. |
| `board/clerk/cardsPerS` | 0.02 | Cards each clerk, and you, write per second. |
| `board/tipline/notesPerS` | 2 | The phone's notes: what writes the deck's later cards. |
| `board/leadsPerStrength` | 1 | Leads per second per unit of string. Every Phase II price scales with it. |
| `board/wall/{0,1,2}/cost` | 1890, 5268, 14684 | Leads to open 4×4, 5×5 and 6×6. |
| `night/seconds` | 40 | Sim-seconds per replayed night. |
| `night/sightingsPerHour` | 1 | Sightings an hour of an alibi needs before it holds. |
| `night/accountsPerSighting` | 1 | Accounts a sighting files at dawn. |
| `night/roster/baseCost`, `night/roster/ratio` | 4, 1.22 | The roster ladder: how fast the night shift grows. |
| `night/insomnia/cost`, `night/insomnia/speed` | 6, 2 | Insomnia's price and the game speed it sets. |

**Not perturbable, on purpose:**
- **The door thresholds** read the spine, not the registry, because they are Gate data
  registered at install. Perturbing `box/pages` changes the box but not the record the
  first door reads; change the anchor instead.
- **The deck, the routes and the places** are authored in `data/evidence.ts`. They are
  the night's content, and the hints, the search and the alibis all follow from them.
- **`ANCHORS.watchesPerStrain`** sets how much strain a roster carries. It decides how
  much the planner may search, so it is a spine decision, not a knob.

## Couplings

- **The box is finite, so a clerk costs Phase II fuel.** Every note spent on a clerk is
  a note the board never writes up. A player who under-hires carries more notes across,
  and the first cards arrive faster.
- **The board's cards are the night's hints.** Each suspect card pinned at the second
  door marks its watch on the stakeout. The reference board is 4×4, about 14 of the 23
  suspect hours. A 5×5 board shortens the night by several nights; it is priced to cost
  a longer stay on the board.
- **Hints and strain trade off.** Unknown watches have to be searched, and every empty
  watch is strain. The strain a night carries grows with the roster, so a bigger night
  shift can afford to search more. Retuning `watchesPerStrain` moves the whole night.
- **One planner, three users.** `planWatches` is the spine's reference planner, the
  probe's, and the clerks' automation (without its search). Changing it changes the
  prediction and the game together.
- **The deck's order is a pacing decision.** The postmistress's and the minister's nights
  come first and whole, so the first board has strings and the first alibis hold early.
  Reordering the deck moves which alibis the reference board hints.
- **Insomnia is game speed.** It sets the TickDriver's `speedMultiplier`, so it shortens
  wall time, not sim time. The spine's beats are sim-seconds.

## Running a pass

- `balance/phase-shifter-projection.ts` prints the spine: the box's ladder, the board
  walk with its wall prices and threshold, the night walk with its hints and alibi
  nights, and each beat against the anchor that set it. An `off` mark means a derived
  value no longer lands on its anchor. It also prints the night with no hints at all,
  which is what the board is worth.
- `balance/arc-probe.ts` plays the shipping game to the closed case under the reference
  player its header describes. It prints each beat's sim-second against the spine, the
  retirements at each door, nights that broke, and restore parity for saves taken
  mid-phase.

## Known thin

- **The reference arranger is weak.** It pins each card where it adds the most and never
  rearranges, so its 4×4 board earns about one unit of string a card. A player who sorts
  the board by person and hour earns about twice that, and opens the night much sooner
  than the spine predicts.
- **The middle of the night is quiet.** Under the reference planner the third and
  fourth alibis are four nights apart, while the planner searches for the hours the board
  did not hint.
- **The board's hint value is uneven.** A 3×3 board and a 4×4 board make nearly the same
  night; only the 5×5 shortens it sharply.
