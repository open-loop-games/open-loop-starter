# Defender — balancing

A plot is a short adversarial economy: compost buys plants, plants see off pests, and
pests seen off pay the compost for the next wave. A plot's run is not saved and nothing
in it outlasts the plot except its score. Between plots, the gardener's level and the
almanac carry margin forward. The bucket and its closed form are in `IDENTITY.md`
§ Rate-function spine.

The numbers come from `ANCHORS` at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: wave sizes, bounties, plant prices and the
schedule are all solved from them.

## The tunables

Every anchor is a key, `spine/<anchor>`, read once in `modules/garden.ts`; the registry
is in `modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `spine/thrushCost` | 50 | The currency unit. Every plant price is a ratio of it, and so is the HP a wave carries per compost. |
| `spine/thrushDps` | 10 | The damage unit. Wave HP scales with it, so raising it alone changes nothing but a thrush's share against the other plants. |
| `spine/thrushRange` | 2.5 | A thrush's reach, and the spine's exposure per range circle. |
| `spine/pestSpeed` | 1.5 | Cells per second for a slug. Faster pests shorten exposure; the spine sizes HP off it. |
| `spine/spawnGap` | 0.8 | Seconds between arrivals. Longer spreads a wave and lengthens its window. |
| `spine/mazeFold` | 1.6 | How far the spine assumes hedges fold the path through one range circle. Raises every wave's HP. |
| `spine/utilization` | 0.5 | The share of a wave a plant has a pest in reach. Raises every wave's HP. |
| `spine/startCompost` | 200 | Compost at the start of a plot, and the base of the whole value curve. |
| `spine/damageShare` | 0.75 | The share of committed compost the spine counts as damage; the rest is hedge. |
| `spine/waveGrowth` | 1.22 | Growth of committed value per wave: ≈3.5 waves per doubling. Income per wave is `value · (G − 1)`. |
| `spine/basePressure` | 0.55 | The first plot's pressure. `1 / pressure` is the margin a reference planting has. |
| `spine/pressureStep` | 1.6 | Pressure between plots: 0.55 → 0.88 → 1.41. The third plot is priced past the reference planting. |
| `spine/baseWaves`, `spine/wavesStep` | 10, 4 | Waves per plot: 10, 14, 18. |
| `spine/earlyCallShare` | 0.3 | The share of a wave's income that calling it a day at once pays. It scales with the daylight given up. |
| `spine/upgradeGrowth` | 1.5 | A plant's level price ratio, and its damage multiplier at the same total, so damage per compost is level-flat. |
| `spine/buildSeconds` | 25 | Daylight between waves. Only a gardener who does not call it a day feels it. |

**Not perturbable, on purpose:**
- **Pest kinds** (`SPEED_MULT`, the leak per kind, the badger's share) and the wave
  composition are structural: they shape the opposition, and the spine sizes the pool
  regardless of how it is split.
- **Plant mechanics** besides price (shot speeds, splash radius, the trap's slow, the
  marigold's boost, unlock levels) are constants in `plantSpecs`. Each price is solved
  from the thrush by an equivalence written beside it.
- **The level curve** (`XP_PER_LEVEL_SQ`), the almanac steps and the seedling count are
  constants. They decide when plants are learned, which is the arc's shape, not a rate.

## Couplings

- **Damage per compost is level-flat by construction.** A level costs
  `base · G_u^(L−1)` and multiplies damage by `Σ G_u^k`, both from `upgradeGrowth`.
  Retuning the price ratio without the multiplier makes upgrading strictly better or
  strictly worse than planting wide, and nothing reports it.
- **HP is divided by speed.** Fast mice carry less HP and slow beetles more, so every
  wave has the same pool in slug-speed HP. A pest kind whose speed changes without its
  HP changing breaks that.
- **Income closes the curve only on a full clear.** Committed value grows by `G` per
  wave only if the wave pays its whole bounty. A leak cuts the next wave's compost as
  well as seedlings.
- **Calling it a day is margin the spine does not count.** A gardener who calls every
  wave at once takes the full early share each wave, so committed value runs ahead of
  `value(w)`, and further each plot.
- **The almanac counts only twice.** `effectivePressure` divides by well-fed birds and
  compost bins. Perches, cloches and early rising are margin the spine never sees.
- **Plant prices follow the thrush.** The trap, marigolds and ladybird hotel are priced
  as thrush-equivalents; retuning `thrushCost` reprices all of them together.
- **A worse plot pays nothing.** Experience is the sum of each plot's best, so retuning
  scores moves every unlock level's arrival.
- **The path is never sealed.** Placement legality and pest routing share one route
  cost, so a terrain kind added to one must be added to the other.

## Running a pass

- `balance/defender-projection.ts` prints the spine: each plot's waves and pressure
  before and after a flawless gardener's almanac, a sample of wave sizes, plant prices,
  and the schedule check, each plot's predicted hold against the recorded beat with a
  ±15% tolerance on the plot's own length. `off` means the spine no longer predicts
  the plot.
- `balance/arc-probe.ts` plays every plot under the reference gardener, up to three
  attempts each, and prints the beats and a per-wave spine diff. Its header lists the
  columns' flags: `--no-early` stops calling it a day, and `--set anchor=value` pushes
  an override. Read the diff by column:
  - `ratio` is measured over predicted committed value;
  - `W real` against `W pred` checks the wave sizing;
  - `depth` is how far along the path pests die;
  - `D/Dref` is launch damage over the reference planting's;
  - `util` and `expo` are the two anchors measured.

## Known thin

- **The reference gardener holds every plot first time.** The Old Orchard is priced past
  the reference planting, and still holds with no leak on 17 of its 18 waves. Most of
  its pests die within a tenth of the path. The plots set no pressure on this player.
- **The damage term is the weakest part of the spine.** Measured route exposure per
  plant is ≈2–7 s against the 5.3 s `mazeFold` assumes, and utilization runs 0.1–0.9
  against 0.5.
- **The schedule misses two plots of three.** The Bean Rows hold ≈60% later than
  predicted, the Orchard ≈25% sooner.
- **Compost outruns the gardener.** On the Bean Rows the reference gardener ends with
  three full-grown thrushes and ≈2,800 compost it found nowhere to spend. The sinks,
  four levels and the board's cells, run out before income does.
- **The trap is never planted.** The reference gardener ranks plants by route coverage
  times damage, and a trap deals none.
