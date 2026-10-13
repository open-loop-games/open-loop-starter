# Defender — balancing

A plot is a short adversarial economy: compost buys plants, plants see off pests, and
pests seen off pay the compost for the next wave. A plot's run is not saved and nothing
in it outlasts the plot except its score. Between plots, the gardener's level and the
almanac carry margin forward. The bucket and its closed form are in `IDENTITY.md`
§ Rate-function spine.

The numbers come from `ANCHORS` at the top of `data/spine.ts`, and from two per-plot
measurements beside them. To retune, change an anchor and let the derivations follow:
wave sizes, bounties, plant prices and the schedule are all solved from them.

## The tunables

Every anchor is a key, `spine/<anchor>`, read once in `modules/garden.ts`; the registry
is in `modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `spine/thrushCost` | 50 | The currency unit. Every plant price is a ratio of it, and so is the HP a wave carries per compost. |
| `spine/thrushDps` | 10 | The damage unit. Wave HP scales with it, so raising it alone changes nothing but a thrush's share against the other plants. |
| `spine/thrushRange` | 2.5 | A thrush's reach. The spine reads reach through each plot's measured dwell, so re-measure after changing it. |
| `spine/pestSpeed` | 1.5 | Cells per second for a slug. Faster pests shorten dwell and tails, both measured, so re-measure after changing it. |
| `spine/spawnGap` | 0.8 | Seconds between arrivals. Longer spreads a wave, so the board fires at it longer and its HP grows with it. |
| `spine/startCompost` | 200 | Compost at the start of a plot, and the base of the whole value curve. |
| `spine/damageShare` | 0.95 | The share of committed compost the spine counts in hunting plants; the rest is hedge. Every wave's HP scales with it. |
| `spine/land` | 0.36 | The share of the reference board's capacity at which the gardener loses a plot. Every wave's HP scales with it; pressure 1 is that threshold. |
| `spine/waveGrowth` | 1.22 | Growth of committed value per wave: ≈3.5 waves per doubling. Income per wave is `value · (G − 1)`. |
| `spine/basePressure` | 0.55 | The first plot's pressure. `1 / pressure` is the margin the reference gardener has before it loses the plot. |
| `spine/pressureStep` | 1.5 | Pressure between plots: 0.55 → 0.83 → 1.24. The third plot is past the reference gardener without the almanac, ≈0.9 with the level 8 a flawless pass earns. |
| `spine/baseWaves`, `spine/wavesStep` | 10, 4 | Waves per plot: 10, 14, 18. |
| `spine/earlyCallShare` | 0.3 | The share of a wave's income that calling it a day at once pays. It scales with the daylight given up. |
| `spine/upgradeGrowth` | 1.5 | A plant's level price ratio, and its damage multiplier at the same total, so damage per compost is level-flat. |
| `spine/buildSeconds` | 25 | Daylight between waves. Only a gardener who does not call it a day feels it. |

**Not perturbable, on purpose:**
- **`PLOT_DWELL` and `PLOT_TAIL`** are measurements of each map under the reference
  gardener: how long a pest stays in a plant's reach, and how long a wave runs past its
  last arrival. They change only when a map, the gardener or a pest's speed does, and
  `capacity-probe.ts` prints the new means.
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
- **Calling it a day is in the curve.** `committedValue` counts the early share of
  every wave from the second, as a gardener who calls at once takes it. A gardener who
  waits out the day commits less, and meets each wave at a higher pressure than the
  spine prints.
- **`land` belongs to the reference gardener.** It is where this gardener loses a plot,
  and the HP of every wave scales with it. A change to `_gardener.ts` moves the
  threshold silently: rerun `threshold-probe.ts` and reset `land`.
- **Dwell and HP move together.** Capacity, and so HP, scales with `n·gap + dwell`, and
  dwell is measured off the reference gardener's hedges. A map whose maze runs longer
  has bigger waves, so mazing better than the reference is margin, mazing the same is
  not.
- **The almanac counts three times.** `effectivePressure` reads well-fed birds,
  compost bins and early rising, at the plot's last wave. Perches and cloches are
  margin the spine never sees.
- **Plant prices follow the thrush.** The trap, marigolds and ladybird hotel are priced
  as thrush-equivalents; retuning `thrushCost` reprices all of them together.
- **A worse plot pays nothing.** Experience is the sum of each plot's best, so retuning
  scores moves every unlock level's arrival.
- **The path is never sealed.** Placement legality and pest routing share one route
  cost, so a terrain kind added to one must be added to the other.

## Running a pass

- `balance/defender-projection.ts` prints the spine: each plot's waves and pressure
  before and after a flawless gardener's almanac, a sample of wave sizes, plant prices,
  and the schedule check: each plot's predicted span against its recorded span, with a
  ±15% tolerance per plot. `off` means the spine no longer predicts the plot.
- `balance/capacity-probe.ts` measures, wave by wave, what the capacity model reads
  off the board: committed value against the closed form, the damage share, dwell, the
  board's capacity against the reference, and each wave's tail. Its plot lines print
  the means `PLOT_DWELL` and `PLOT_TAIL` are set from.
- `balance/threshold-probe.ts` bisects, plot by plot with no almanac, the wave size at
  which the reference gardener first leaks and first loses. The loss threshold is
  `land`.
- `balance/arc-probe.ts` plays every plot under the reference gardener, up to three
  attempts each, and prints the beats and a per-wave spine diff. Its header lists the
  columns' flags: `--no-early` stops calling it a day, and `--set anchor=value` pushes
  an override. Read the diff by column:
  - `ratio` is measured over predicted committed value;
  - `W real` against `W pred` checks the wave sizing;
  - `depth` is how far along the path pests die;
  - `D/Dref` is launch damage over the reference planting's;
  - `util` and `expo` are each hunting plant's busy share and route seconds in reach.

## Known thin

- **Pressure is uneven inside a plot.** A plot's loss threshold is set by its hardest
  waves: the beetles, the mice and the badger. On the rest of the Orchard, most pests
  still die within a third of the path.
- **The Bean Rows are easier than their pressure says.** The reference gardener loses
  them only at 0.59 of capacity, against 0.36 on the other two plots: their stone
  folds the path further than the measured dwell credits.
- **Perches and cloches are uncounted margin.** At the level-8 almanac the Orchard
  still holds with every wave 22% heavier than the spine sizes it.
- **The trap is never planted.** The reference gardener ranks plants by route coverage
  times damage, and a trap deals none. So `land` is measured on boards with no slow.
