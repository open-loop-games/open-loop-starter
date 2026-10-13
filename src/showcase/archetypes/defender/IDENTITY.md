# Defender — archetype identity

> Maze tower defence (`wave` + `player-siting` + `positional-effect` +
> `scaled-opposition` + `manual-action`), which GemCraft carries with
> `target-reservation` and `emergent-income`, and with `statistics` carrying progress
> between fields. Commit architecture before the threat arrives and watch the outcome
> resolve: the player is architect, not participant.

Identity line source: `../_identity.md` (Defender entry); the line's player experience
and exemplar calls are `../_docs/defender.md`. **Core · covered.** GemCraft, Bloons TD 6
and Kingdom Rush show the composition ships, as a set; none is a lift target.

## What this archetype is

*The Walled Garden.* Every evening the pests come through a gap in the garden wall and
make for the seedbed. By day the gardener plants: box hedges that send the pests the
long way round, never sealing the path, and along it the plants that see them off. Then
night falls, the beds go dark, and the night plays out with nothing left to do but
watch.

| Plant | What it does | Learned at |
|---|---|---|
| Box Hedge | fills a cell; the path re-routes round it | 0 |
| Thrush Perch | single shots at the pest nearest the seedbed; marks what it has in flight | 0 |
| Sticky Trap | slows every pest in reach | 2 |
| Bat Box | single shots at moths, and at nothing on the ground | 3 |
| Marigolds | companion planting: every plant touching it hunts harder | 4 |
| Ladybird Hotel | a slow release that lands on a cluster | 7 |

- **The counter wheel.** Each night sends one kind of pest, and each plant's way of
  hunting meets each kind at its own strength. Thrushes crack beetles and barely
  touch greenfly. Ladybirds eat greenfly, and a shell turns them. Moths fly
  straight over the hedges, and only bats reach them. Each plot adds a turn: the
  Bean Rows bring moths, the Orchard greenfly. The board shows the next three
  nights and what sees each off, so the gardener plants for the night ahead.
  This is research's `type-effectiveness`, carried beyond the line: none of the
  line's sourced exemplars is a member, so the line does not cite it.
- **Calling it a day** sends the next wave early, and pays compost for the daylight
  given up. The first night waits for the gardener.
- **Compost** comes only from pests seen off.
- **The gardener's level** is the sum of each plot's best score, so a worse night on a
  plot pays nothing. Each level is a note in the almanac, for lessons that carry into
  every plot, and the level teaches new plants.
- **Three plots**, each a fixed run of nights. Holding one opens the next.

## Rate-function spine

**Bucket: exponential family, a geometric bounty curve**
(`incremental-math/…/rate-functions/exponential.mdx`). Wave `w` pays
`S₀ · G^(w−1) · (G − 1)` when every pest is seen off. What the gardener has committed by
then is that curve summed, plus what calling it a day paid, in closed form
(`committedValue`).

**Where the closed form stops: the board.** A wave's HP is sized off what the reference
board can deal to it, in the stream form of a leak estimate (td-arcade
`combat/leak_proxy.rs`). Each hunting
plant fires from the wave's first arrival to its last departure, one pest at a time:
`C = thrushes · dps · (n·gap + dwell)`. Two things about a board are not closed form:
- how long a pest dwells in a plant's reach, which depends on the map and on the
  hedges, measured per plot;
- how much of that capacity a board lands before a pest gets through (`land`), measured
  as the point where the reference gardener loses a plot.

So `W = pressure · land · C`, and pressure 1 is the reference gardener's loss
threshold. The counter wheel adds two factors per night:
- `answer`, the share of the reference board that can hurt tonight's kind. It is
  closed form: the board splits its hunting compost across forms as the plot's
  rotation asks.
- `toll`, how much of a pool of that kind a board lands before one gets through,
  against slugs. It is measured per kind.

**What measures the remainder:** three probes over the shipping game under the
reference gardener (`balance/_gardener.ts`):
- `capacity-probe.ts` measures dwell, damage share and each wave's tail;
- `threshold-probe.ts` bisects the loss threshold `land` is set from, and each
  kind's threshold, which `KIND_TOLL` is set from;
- `arc-probe.ts` plays every plot and diffs each wave against the spine.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| The Herb Border held | 98s | 100s |
| The Bean Rows held | 324s | 326s |
| The Old Orchard held | 508s | 507s |

The prediction counts each wave's arrivals, and a measured tail per plot after the last
one, under a gardener who calls every wave at once. `manifest.ts` holds the recorded
beats.

## Growth ports

- **Booster against maze.** A companion boost strong enough to compete with path length
  for the same cells: a booster wants to be surrounded, a maze wants long thin walls.
- **Endless tail.** Nights past a plot's last, with health outgrowing bounty and the
  wheel still turning, so depth grades breadth and feeds the plot's best score.

## Engine fit

| Component | Engine primitive |
|---|---|
| the board, the path, never-seal | `createSpatialGrid`, `distanceField` |
| marigolds' 8-ring | `SpatialGrid.neighbors` with `DIAGONAL_OFFSETS` |
| the plots, opened in order | `createZoneSystem` |
| a plot's best score | `createBestOf` |
| almanac lessons, relearning | `createPurchasableCategory` + `createCostRequirement`, `createReset` |
| what lessons feed | `createModifierChain` ×5 |
| every spine anchor | `createTuningRegistry` + `tunable` |

Real-time movement, targeting and shots are consumer-side by the engine's scope. The
wave lifecycle is phases inside one run, which INDEX § Reserved names leaves
consumer-side too (`modules/run.ts`).

## Balance model

The spine is `data/spine.ts`, printed by `balance/defender-projection.ts` with its
beat schedule check. `balance/arc-probe.ts` plays the shipping game through every plot.
`BALANCING.md` covers the tunables and couplings.
