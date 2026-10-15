# Interlocker — balancing

A wide production graph: raw buildings add constant rates, four workshops turn stock into
the next good at a rate the seated compagnons set, and every stock is capped by its bin.
A run ends when the jury sits and the player stages an Exposition, which pays a concave
medal of renown on what the works hold and what the Ministry has bought, and clears the
works. The bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: prices, cost growth, role rates, bins, the ration,
order sizes, the build and medal each run reaches, the charters' strengths and prices,
the bureaux' prices and the Grand Prix are all derived from it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `works/rho` | 1 | Raw units a second from one raw building, before Coking Ovens, the season and renown. Every raw stock fills faster; the crew does not. |
| `works/workerRate` | 1 | Input units a second one compagnon moves through a workshop. Scales every trade at once, and with it the steam the engine shop and rigging hall draw. |
| `works/upkeepPerWorker` | 0.25 | Bread a second each compagnon eats. Above what the gardens yield in the season, the larder empties and every workshop slows together. |
| `storage/fillSeconds` | 150 | Seconds of one raw building a base bin holds. Every bin scales with it, the hangar and the larder included, so it moves how many warehouses an Exposition needs and how much of a winter the larder carries. |
| `storage/warehouseStep` | 0.5 | The share of its base each warehouse adds to every bin, and so to the exhibit the bins can show the jury. |
| `expo/threshold` | 10 | Aeroplanes the hangar must hold to stage an Exposition. It gates staging only; the medal is paid on the score. |
| `expo/jurySitting` | 300 | Seconds the jury takes between Expositions: the floor under a run. Late in the arc it is the run's length, so it sets how often the player stages and how many orders a medal holds. |
| `ministry/orderPeriod` | 150 | Seconds between the Ministry's offers. Offers fall halfway between periods, so at the defaults two fall inside every sitting. |
| `renown/outputStep` | 0.1 | Output added per lifetime renown, to every raw building, boiler and compagnon alike. It shortens every budget but the jury, so it sets how fast early runs shorten and how fast late medals grow. |

**Not perturbable, on purpose:**
- Prices are multiples of `C0 = RHO · T_FIRST`, fixed when `data/spine.ts` loads. A price
  set apart from the valuation desyncs the softlock guard; move `T_FIRST` or a weight
  and rerun the projection.
- Recipes are the graph itself, steam included, and `RAW_EQ`, the role rates, the bins
  and the order sizes derive from them. Change a recipe in `data/spine.ts` and every
  derived number follows.
- The seasons' yields, the weather and the mill's load are authored constants in the
  spine; the steam a boiler raises is one coal drift's coal, `STEAM_PER_COAL` steam each.
- Crédit Mobilier's stake, the École's labour, every charter and bureau price and the
  Grand Prix are solved from the run model when `data/spine.ts` loads. A tunable perturbs
  the game, not the solve, so they stay where the default economy put them.

## Couplings

- **Every price must fit its bins.** A price larger than its stock's bin cannot be paid
  until warehouses widen it. Bonded Warehousing and every patent on its path must fit the
  base bins, or no warehouse can ever be built and the run softlocks. `warehousesNeeded`
  is the guard; the projection prints `SOFTLOCK RISK` when a founding patent outgrows the
  base bins. Raising a price weight or shortening `T_FILL` can trip it silently in play.
- **The bins cap the exhibit; the dossier has no cap.** The jury scores worked goods held
  at their raw-equivalent, and every bin holds the same raw-equivalent, so the exhibit is
  `600 · (1 + 0.5·warehouses)`. Past that, the medal grows only through Ministry orders.
  Early medals are the warehouses'; from the mid-arc the dossier is most of the score.
- **The jury is the one budget renown does not shorten.** Renown lifts raw output, steam
  and labour together, so without the sitting every run's fixed costs shrink with output
  and runs collapse towards seconds. With it, late runs hold the sitting's length, and a
  faster works earns a bigger medal instead of a shorter run. Lower the sitting and the
  player stages more often for smaller medals; the Grand Prix re-solves to match.
- **Offers fall between sittings.** The first offer comes half a period into a run, so at
  `orderPeriod` 150 and `jurySitting` 300 two orders fit inside every run and none lands as
  the jury sits. Move one off a multiple of the other and an order can land just as the
  jury sits. Late medals then jump by an order from run to run, and the first medal to
  reach the Grand Prix is a lucky one, well before the arc predicts.
- **Every order is worth the same.** An order's lines share `orderValue` of the full crew
  evenly in raw-equivalents, so composition changes only how long it takes to fill:
  aeroplanes fill fastest, spars slowest. Sizing lines by output instead makes some
  orders worth several times others, and a player who stages as soon as the medal is
  reached takes the big ones and waits out the small, so the medal runs above the plan.
- **Orders land whole.** Consignments leave the bins as they are sent but score only when
  the order completes, and a lapsed order's consignments are lost. A run shows every
  order it fills, so its medal is the exhibit plus whole orders, not the share it needed.
- **Steam is valued at coal.** `RAW_EQ` counts each cycle's steam at the coal its boiler
  burns, so engines and aeroplanes cost the coal of their steam, and coal is contended
  three ways: the furnace, the engine shop and the boilers. The rolling mill draws a fixed
  load; unpowered, its smelters lose the lift. Boilers take renown's lift, or the steam
  load, which grows with labour, would outrun a geometric boiler ladder.
- **A season is one bin's fill.** `SEASON_SECONDS` is `T_FILL`, so winter's shortfall,
  `0.75 · crew · upkeep · 150`, is what the larder must hold. The plan's gardens cover the
  ration at the mean season and at least a winter on a full larder. L'Intendance builds
  neither winter's gardens nor boilers: the seasons and the shed order stay the player's.
- **The bureaux are a ladder.** Each bureau unlocks the next automation tier, and a tier
  implies those below it, so the bureaux are bought in order. Le Contremaître seats no
  compagnon at a trade short of steam or of bin room, so a works with no boilers shows
  idle machinists rather than a stalled engine shop.
- **The plan is the reference player's run.** `planFor` picks the warehouses and the medal
  that grow the renown multiplier fastest per second (`gainRate`), and derives the rest of
  the build from rules. The probe's runner stages at the medal `medalFor` predicts and the
  bureaux raise the planned build, so the probes and the model share one run.
- **The charters are a fixed point.** A price sets the renown at which the arc first holds
  a charter, and the gain-rate lift from there sets the price and Crédit's and the École's
  strengths. `CHARTER_PAYBACK` scales every price; `CHARTER_SHARE` sets the two strengths.
- **The bureaux and the Grand Prix are read off the arc.** A bureau costs one, two or three
  medals of the run that could first afford it; the Grand Prix is the medal the arc first
  stages at `ARC_SECONDS`, the spring of 1867 on the calendar. Anything that moves the arc
  moves both.
- **Rations throttle every workshop at once.** The share fed multiplies every trade's rate
  in the same tick, so a hungry winter shows on every plate together.
- **The reset scope is two persistent contexts.** `createCycle` resets `interlocker/works`
  and `interlocker/ministry` at each Exposition, so the dossier and standing orders clear
  with the works. Anything that must survive belongs in `modules/empire.ts`; the calendar
  keeps no state of its own and reads the play clock.
- **The net rate is measured, not summed.** `works.net` is the stock delta across a tick,
  after producers, workshops, boilers, rations and the bin clamp.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/interlocker-projection.ts [expositions] [yard,farm,mine,pit,warehouse,cite,boiler,renown]`:
  the derived numbers, the softlock guard, the solved charters, bureaux and Grand Prix,
  the first run, and the arc with each run's plan, binding budget, score and medal.
  Instant.
- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/arc-probe.ts [expositions] [dt]`:
  Expositions under the shipping automation, forced to its top tier, with a thin runner
  for the player's part (`balance/_foreman.ts`). Each run beside the spine's arc, every
  beat and order, what bound each trade per sampled minute, and the end state. About
  9 s for 24 Expositions. `TRACE=1` adds a line a minute.
- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/charter-probe.ts`: four
  runs for each lifetime renown and charter set, the last three measured against the
  spine, with the rms on gain rate and on the medal and each charter's lift. About 13 s.
  Rerun it after touching the run model, orders or a charter; `RAMP_SHARE` and
  `ORDER_FILL` are fit on it.
- `pnpm test src/showcase/archetypes/interlocker`: the behavioural suites beside the
  modules: bins, the patent graph, seating, workshops, steam and the shed order, the
  seasons, the Ministry, the medal and the jury, the Grand Prix, the Patent Pool,
  Crédit's stake, the bureaux and the telegraph.

The economy is tick-robust: 0.25 s to 2 s moves an early beat by a few seconds. The
Grand Prix's window is wider, about 15 minutes, because late medals rise a renown at a
time and a tick can carry a run across one.

## Known thin

- **Seasons and steam bind the player, not the reference.** The probe's runner raises a
  garden whenever a winter would outrun the larder and a boiler whenever steam falls
  short, so the arc goes hungry or short of steam for a few sampled minutes in two
  hours. The mechanics bite a player who neglects them, and the spine models neither cost.
- **The first run is long.** The reference stages its first Exposition at 14 minutes, for
  a medal of 5: a concave payout makes waiting for a fuller exhibit pay, and orders open
  only after it.
- **Late medals are the Ministry's.** From the mid-arc the dossier is about nine tenths
  of the score, so warehouses and the exhibit stop mattering in the second hour.
- **Charter lifts are measured wider than planned.** The charter probe's lifts swing
  between cells by more than the model's, Imperial Patronage most, because one more
  order inside a run moves its gain rate by a fifth.
- **Crédit Mobilier is cheap and fades.** Its stake is fixed in units at the base bins'
  cap, so the solve prices it at a renown or two, and its share of a run falls as
  renown grows.
