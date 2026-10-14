# Interlocker — balancing

A wide production graph: raw buildings add constant rates, four workshops turn stock into
the next good at a rate the seated compagnons set, and every stock is capped by its bin.
A run ends when the hangar holds an Exposition, which pays renown and clears the works.
The bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: prices, cost growth, role rates, bins, the ration
and the warehouses an Exposition needs are all derived from it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `works/rho` | 1 | Raw units a second from one raw building, before Coking Ovens and renown. Every raw stock fills faster; the crew does not. |
| `works/workerRate` | 1 | Input units a second one compagnon moves through a workshop. Scales every trade at once, so the balance between trades holds. |
| `works/upkeepPerWorker` | 0.25 | Bread a second each compagnon eats. Above a garden's yield over the crew, the larder empties and every workshop slows together. |
| `storage/fillSeconds` | 150 | Seconds of one raw building a base bin holds. Every bin scales with it, the hangar included, so it moves how many warehouses an Exposition needs. |
| `storage/warehouseStep` | 0.5 | The share of its base each warehouse adds to every bin. |
| `expo/threshold` | 10 | Aeroplanes the hangar must hold to stage an Exposition. Renown is `floor(2·√(P/threshold))`, so it also sets the renown curve's scale. |
| `renown/outputStep` | 0.1 | Raw output added per lifetime renown. |

**Not perturbable, on purpose:**
- Prices are multiples of `C0 = RHO · T_FIRST`, fixed when `data/spine.ts` loads. A price
  set apart from the valuation desyncs the softlock guard; move `T_FIRST` or a weight
  and rerun the projection.
- Recipes are the graph itself, and `RAW_EQ`, the role rates and the bins derive from
  them. Change a recipe in `data/spine.ts` and every derived number follows.
- Charter effects (`PATRONAGE_WORKERS`, `CREDIT_CAP_MULT`, `ECOLE_LABOUR_MULT`) and the
  patent multipliers are constants read at construction.

## Couplings

- **Every price must fit its bins.** A price larger than its stock's bin cannot be paid
  until warehouses widen it. Bonded Warehousing and every patent on its path must fit the
  base bins, or no warehouse can ever be built and the run softlocks. `warehousesNeeded`
  is the guard; the projection prints `SOFTLOCK RISK` when a founding patent outgrows
  the base bins. Raising a price weight or shortening `T_FILL` can trip it silently in
  play: the Académie shows the line item as "exceeds bin", and nothing else complains.
- **The hangar is the prestige throttle.** The Exposition pays on aeroplanes held, and
  the hangar is a bin like any other: `6 · (1 + 0.5·warehouses) · Crédit Mobilier`. So
  warehouses are on the prestige's critical path, and the renown a run can pay is capped
  by storage. At the defaults, 2 warehouses hold 12, and 4 renown needs 40 aeroplanes.
  `storage/fillSeconds`, `storage/warehouseStep` and `expo/threshold` move this together;
  `WAREHOUSES_FOR_EXPO` and `DEFAULT_PLAN` are computed at the default fill, so the
  first-run prediction does not follow a perturbed fill.
- **The crew binds, not the raw stock.** One compagnon per raw building per stage
  balances the chain, and a run houses far fewer compagnons than raw buildings. So raw
  bins sit full and renown, which lifts raw output, mostly lifts a constraint that is
  not binding. What shortens a run is crew: Imperial Patronage and the École Centrale.
- **Rations throttle every workshop at once.** The share fed multiplies every trade's
  rate in the same tick. A larder that empties shows as "crew hungry" on every plate
  together, never on one.
- **The Patent Pool keeps patents, not the crew's seats.** The founding patents survive
  an Exposition, so the Sawpit opens at once and seated sawyers draw the opening spruce
  before the first timber yard is paid for. The foreman seats them anyway, and that run
  opens slower.
- **The works' persistent context is the reset scope.** `createCycle` resets
  `interlocker/works` at each Exposition. State built in the works module is cleared;
  anything that must survive belongs in `modules/empire.ts`. A stock's `best` is
  lifetime, so the ledger keeps a stock inked once it was ever made.
- **The net rate is measured, not summed.** `works.net` is the stock delta across a
  tick, after producers, workshops, rations and the bin clamp. A full bin reads ±0 even
  while its building runs; the ledger shows FULL instead.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/interlocker-projection.ts [yard,farm,mine,pit,warehouse,cite]`:
  the derived numbers, the softlock guard and the first-Exposition prediction, on the
  default plan and on a build you pass. Instant.
- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/arc-probe.ts [expositions] [dt]`:
  Expositions under the foreman (`balance/_foreman.ts`), with every beat, each run's
  length and build, what bound each trade per sampled minute, and the end state. About
  2 s for 5 Expositions. `TRACE=1` adds a line a minute.
- `pnpm test src/showcase/archetypes/interlocker`: the behavioral suites beside the
  modules (bins, the patent graph, seating, workshops, the Exposition, the Patent Pool).

To check the spine, pass the build the arc probe prints at EXPOSITION 1 to the
projection. A gap on the default plan that closes on the probe's build is a plan miss;
one that stays is a model miss. The economy is tick-robust: 0.25 s to 2 s moves an
Exposition by under 3%.

## Known thin

- **Only the first Exposition is in the spine.** Runs after it, the charters and the
  renown curve have no model and no target. Measured: runs shorten from 10:26 to about
  7:30 by the fifth Exposition, every charter is held by about 49 minutes, and runs then
  settle near 5 minutes with nothing further to buy. There is no ending.
- **The renown formula is inert.** The hangar holds 12 at the build a run reaches, so
  every Exposition pays the threshold's 2 renown; the square root never acts.
- **The full graph runs for under a minute a run.** Monoplane Rigging opens about 35 s
  before the Exposition, and the stockpiled spars, aluminium and engines fill the hangar
  in that window. The riggers are locked for most sampled minutes.
- **Upkeep never binds under the foreman.** He keeps gardens ahead of the ration, so no
  run goes hungry; the mechanic only bites a player who neglects the gardens.
- **The default plan is off.** The foreman raises about 16 timber yards against the
  plan's 8, so the default-plan prediction runs about 11% early; on the probe's own
  build it is within 5%.
