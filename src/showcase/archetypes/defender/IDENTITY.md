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
| Marigolds | companion planting: every plant touching it hunts harder | 4 |
| Ladybird Hotel | a slow release that lands on a cluster | 7 |

- **Calling it a day** sends the next wave early, and pays compost for the daylight
  given up. The first night waits for the gardener.
- **Compost** comes only from pests seen off.
- **The gardener's level** is the sum of each plot's best score, so a worse night on a
  plot pays nothing. Each level is a note in the almanac, for lessons that carry into
  every plot, and the level teaches new plants.
- **Three plots**, each a fixed run of nights. Holding one opens the next.

## Rate-function spine

**Bucket: exponential family, a geometric committed value**
(`incremental-math/…/rate-functions/exponential.mdx`). The gardener's committed compost
grows by `waveGrowth` each wave, `value(w) = startCompost · G^(w−1)`. Income is what a
full clear pays back, `value(w) · (G − 1)`. Each wave's HP pool is sized off the
planting that value buys, `W(p, w) = pressure(p) · killRate · window(w) · value(w) ·
damageShare`, so `1 / pressure(p)` is the margin a plot leaves. Pests' HP is divided by
their speed ratio, because damage taken scales with exposure.

**Where the closed form stops: the board.** What a planting deals depends on where it
stands: how far the hedges fold the path (`mazeFold`) and how much of the wave each
plant has in reach (`utilization`). Both anchors are chosen by feel. So is what the
almanac buys beyond damage and starting compost.

**What measures the remainder:** `balance/arc-probe.ts` plays the shipping game under
the reference gardener (`balance/_gardener.ts`). For every wave it prints the measured
committed value, HP pool, kill depth, damage against the reference planting,
utilization and route exposure beside the spine's, and whether each plot holds on the
first try.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| The Herb Border held | 117s | 114s |
| The Bean Rows held | 293s | 474s |
| The Old Orchard held | 533s | 649s |

The prediction is the sum of each wave's window under a gardener who calls every wave
at once. `manifest.ts` holds the recorded beats.

## Growth ports

- **Counter wheel.** Attack forms against armour kinds (shelled beetles, soft swarms),
  plants that cannot reach flying moths, and a three-night preview, so the board must
  change its answer, not merely find one.
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
