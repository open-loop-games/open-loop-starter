# Cycler — balancing

A saturating ward races a geometric storm the keeper does not control. The calm phase is an
economy of its own: nets catch salvage, salvage buys the pieces, and every price is a
fraction of one net's catch over a cycle. The pressure phase is a sum, tonight's storm
against one side's ward, and the run ends when the leaks pass the tower's integrity. The
bucket and where its closed form stops are in `IDENTITY.md` § Rate-function spine.

Every number comes from the anchors at the top of `data/spine.ts` (`ANCHORS`), through
`deriveSpine`. To retune, move an anchor and read `cycler-projection.ts`; never edit a
derived value at its reader.

## The tunables

Every key is read at its reader site through `tunable()`, in `modules/logbook.ts`; the
registry is `modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `peg/crossNight` | 5 | The night a saturated side first leaks at the reference g. Authors H, so the watch's length. Each night later adds a cycle to every watch. |
| `peg/g` | 1.5 | The reference growth H and integrity are solved at. Postings carry their own g either side of it, so a watch's storm does not grow at this rate; moving it re-solves W₀ and the tower for every posting. |
| `ward/perWall` | 10 | The ward unit. C_max, W₀, integrity and the weathered payout scale all follow it, so it moves the size of every force number and neither nights nor entries. |
| `wrack/netRate` | 0.5 salvage/s | One net's calm catch, and through Y every price, the start salvage, mending and shoring. Moving it rescales the economy without changing how many pieces a watch buys. |
| `phase/daySeconds` | 120 s | The calm, and Y with it. A longer day is more catch per cycle at the same prices in cycles. |
| `phase/nightSeconds` | 50 s | The storm's length, the night catch and the net's capacity. |

**Not perturbable, on purpose:**
- The bracing and buttress bonuses, prices in cycles and price growth, the start salvage,
  the repair and shoring prices, and the payout's reference run are anchors without keys.
  They are shape: moving one changes what a saturated side or a reference watch is, so
  re-read the projection rather than sweeping them.
- Postings, knowledge ratios and find effects are content in `data/logbook.ts` and
  `data/rock.ts`.

## Couplings

- **The storm is pegged at the watch's start and frozen.** `startWatch` reads W₀ from the
  spine and the posting's g, bent by the almanac, and keeps both for the watch. Knowledge
  bought or a key overridden mid-watch takes effect at the next `startWatch`.
- **Stone adds reach, not nights.** It multiplies every wall's ward and C_max together, so
  W₀ rises with it. A permanent ward bonus outside the peg (not through `permanentWard`)
  would lengthen every watch and break the career's flat run length.
- **The almanac is the only pace lever, and it is gated behind two levels of stone.** It
  bends g toward 1, each level keeping 85% of (g − 1). Ungated, a first career could buy
  length before reach.
- **Shoring and Brass fittings sit outside the peg.** Both add ward the storm was not
  pegged to. In `posting-probe.ts` the bare keeper lands on the spine's nights, and shoring
  adds about one more at Haven Point and the Skerry; Brass alone adds none, and counts only
  on top of shoring. Shoring's price doubles within a night, so salvage buys it
  logarithmically, and more catch (Tide tables) barely moves it.
- **C_max is a side built from its own cells.** A corner's second brace is a wall on the
  next side, so it is reach above the peg, like shoring. Counting it in C_max would peg the
  storm to a seven-wall side the keeper does not build, and every watch would run short.
- **Taking a piece up refunds its last copy's price in full.** Rearranging costs clicks,
  not salvage, so the forecast quarter is a placement puzzle, not a tax. A partial refund
  would make the keeper commit to one side and turn veering winds into a lottery.
- **The storm never touches the board.** Breakers leak into integrity only, so the late
  watch stays a placement problem rather than a rebuild.
- **The payout is two cube roots, floored apart.** Force weathered and salvage gathered
  each pay ⌊∛(source / scale)⌋, scaled so a saturated reference watch pays six and four.
  Flooring them together would let one source mask the other.
- **The payout is written after the reset returns.** The cycle's `afterEnd` adds the
  entries, so they reach `cumulative`. A write inside the reset never would.
- **A net holds one surging night plus a minute of calm.** Capacity tracks the live catch
  rate, Cork floats included. A keeper who skips a morning's haul loses the overflow.
- **Day and night length feed the prices.** Y is the catch over a whole cycle, so a longer
  day makes every price larger in salvage and the same in cycles.
- **The phase is saved; the TickDriver phase is not.** `syncPhase` re-enters `cycler/day` or
  `cycler/night` after every transition and on load. A new transition must call it.

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| What does the spine predict? | `cycler-projection.ts` | the derived economy, nights per posting for a saturated keeper, the peg under stone, the almanac's steps |
| How does one watch play? | `watch-probe.ts [seed]` | each dusk's storm against the struck side's ward, each dawn's leak and shoring, the payout |
| Does run length hold across a career? | `career-probe.ts [watches] [seed]` | nights, minutes and entries per watch beside the knowledge held |
| What does each night verb add? Are the postings level on reward? | `posting-probe.ts` | nights per posting beside the spine for a bare keeper, with Brass, with shoring and with both; the reference keeper's minutes and entries per minute |

Run them from the repo root with
`pnpm exec vite-node src/showcase/archetypes/cycler/balance/<probe>.ts`. Each header says how
to read it. The four together take about fifteen seconds.

## Known thin

- **Shoring is unprojected.** It is worth about a night at Haven Point and the Skerry and
  none at Cape Wrath, measured, not predicted: how many shorings a night buys depends on
  the salvage the day left.
- **The career has no end beat.** Every knowledge entry but the almanac and the charters
  levels without limit, and run length stops moving once the almanac is bought.
- **The keeper is probe-side, not shipping automation.** The game ships no player
  automation but the winch, so the canon driver (a policy in `modules/automation.ts`
  behind `AutomationTiers`) would mean shipping a keeper's mate first, a growth port in
  `IDENTITY.md`. The keeper buys in a fixed order: a competent player, not a best one.
- **There is no offline progress.** The rock's clock stops while the tab is closed.
