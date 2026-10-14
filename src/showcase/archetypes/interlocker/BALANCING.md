# Interlocker — balancing

A wide production graph: raw buildings add constant rates, four workshops turn stock into
the next good at a rate the seated compagnons set, and every stock is capped by its bin.
A run ends when the hangar holds an Exposition, which pays renown and clears the works.
The bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: prices, cost growth, role rates, bins, the ration,
the build each run reaches, and the charters' strengths and prices are all derived from
it.

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
| `renown/outputStep` | 0.1 | Raw output added per lifetime renown. The purse binds every run, so this is the arc's main lever: it sets how fast runs shorten. |

**Not perturbable, on purpose:**
- Prices are multiples of `C0 = RHO · T_FIRST`, fixed when `data/spine.ts` loads. A price
  set apart from the valuation desyncs the softlock guard; move `T_FIRST` or a weight
  and rerun the projection.
- Recipes are the graph itself, and `RAW_EQ`, the role rates and the bins derive from
  them. Change a recipe in `data/spine.ts` and every derived number follows.
- The patent multipliers and `PATRONAGE_WORKERS` are authored constants. Crédit
  Mobilier's stake, the École's labour and every charter price (`CHARTER_EFFECTS`,
  `CHARTER_COST`) are solved from the run model when `data/spine.ts` loads, against
  `CHARTER_SHARE` and `CHARTER_PAYBACK`. A tunable perturbs the game, not the solve, so
  the charters stay where the default economy put them.

## Couplings

- **Every price must fit its bins.** A price larger than its stock's bin cannot be paid
  until warehouses widen it. Bonded Warehousing and every patent on its path must fit the
  base bins, or no warehouse can ever be built and the run softlocks. `warehousesNeeded`
  is the guard; the projection prints `SOFTLOCK RISK` when a founding patent outgrows
  the base bins. Raising a price weight or shortening `T_FILL` can trip it silently in
  play: the Académie shows the line item as "exceeds bin", and nothing else complains.
- **The hangar is the prestige throttle.** The Exposition pays on aeroplanes held, and
  the hangar is a bin like any other: `6 · (1 + 0.5·warehouses)`. So warehouses are on
  the prestige's critical path, and the renown a run can pay is capped by storage. At the
  defaults, 2 warehouses hold 12, and 3 renown needs 23 aeroplanes.
  `storage/fillSeconds`, `storage/warehouseStep` and `expo/threshold` move this together;
  `WAREHOUSES_FOR_EXPO` and the plan are computed at the default fill, so the prediction
  does not follow a perturbed fill.
- **The purse binds the run; the crew binds the trades.** Minute by minute most trades
  are crew-bound, but every price is paid in raw stock, so a run lasts as long as its raw
  budget across the whole arc. Renown, which lifts raw output, is what shortens runs. A
  crew charter pays only once raw output can feed the larger crew: Imperial Patronage
  breaks even at renown 2 and saves a sixth to a quarter of a run from renown 8.
- **The plan is the reference player's build.** `planFor` derives the build each run
  reaches, and the foreman raises exactly that, so the probes and the model share one
  build. A plan rule that buys too few producers slows the arc sharply; too many costs
  little at high renown. The plan's producers follow the crew's draw and the purse, not
  the run's length, so a change to the run model cannot move the build it is checked on.
- **The charters are a fixed point.** A price sets the renown at which the arc first holds
  a charter. The saving from there sets the price, and Crédit's and the École's strengths.
  `CHARTER_PAYBACK` scales every price; `CHARTER_SHARE` sets the two solved strengths. The
  foreman and `predictArc` petition in listed order, saving for each before the next; a
  player who skips ahead gets a different arc.
- **Crédit Mobilier's stake must fit the base bins.** It is paid into a cleared works,
  whose bins hold `T_FILL` seconds of one raw building. The solve caps it there, and it
  sits at the cap. Shortening `T_FILL` shrinks the stake and its saving with it. The
  stake is also paid on petition, because charters are bought after an Exposition, into
  a run already open.
- **Rations throttle every workshop at once.** The share fed multiplies every trade's
  rate in the same tick. A larder that empties shows as "crew hungry" on every plate
  together, never on one.
- **The Patent Pool keeps patents, not the purse.** The founding patents survive an
  Exposition, so the Sawpit opens at once. Sawyers seated then turn the opening spruce
  into spars before the first timber yard is paid for. The foreman seats a trade only up
  to half a raw stock's yield while its bin is under half full; a player who seats every
  sawyer at once makes the Pool cost time.
- **The works' persistent context is the reset scope.** `createCycle` resets
  `interlocker/works` at each Exposition. State built in the works module is cleared;
  anything that must survive belongs in `modules/empire.ts`. A stock's `best` is
  lifetime, so the ledger keeps a stock inked once it was ever made.
- **The net rate is measured, not summed.** `works.net` is the stock delta across a
  tick, after producers, workshops, rations and the bin clamp. A full bin reads ±0 even
  while its building runs; the ledger shows FULL instead.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/interlocker-projection.ts [expositions] [yard,farm,mine,pit,warehouse,cite]`:
  the derived numbers, the softlock guard, the solved charters, the first run on the
  default plan (and on a build you pass), and the arc with each run's plan and binding
  budget. Instant.
- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/arc-probe.ts [expositions] [dt]`:
  Expositions under the foreman (`balance/_foreman.ts`), each run beside the spine's
  arc, with every beat, what bound each trade per sampled minute, and the end state.
  About 2 s for 5 Expositions. `TRACE=1` adds a line a minute.
- `pnpm exec vite-node src/showcase/archetypes/interlocker/balance/charter-probe.ts`: one
  run for each lifetime renown and charter set, measured against `predictRun`, with the
  model's rms and each charter's saving. About 8 s. Rerun it after touching the run
  model or a charter; `RAMP_SHARE` is fit on it.
- `pnpm test src/showcase/archetypes/interlocker`: the behavioral suites beside the
  modules (bins, the patent graph, seating, workshops, the Exposition, the Patent Pool,
  Crédit's stake).

The economy is tick-robust: 0.25 s to 2 s moves an Exposition by under 3%. The charter
grid's 1 s tick moves a run by about 2% against 0.25 s, 6% at most.

## Known thin

- **There is no ending.** Renown buys the four charters by about the fifth Exposition;
  after that it only lifts raw output, and runs shorten towards two and a half minutes
  with nothing further to buy.
- **The renown formula is inert.** The hangar holds 12 at the planned two warehouses, so
  every Exposition pays the threshold's 2 renown; the square root never acts. Pushing
  past the threshold to 23 aeroplanes for 3 renown breaks even at best.
- **The full graph runs for under a minute a run.** Monoplane Rigging opens about 35 s
  before the Exposition, and the stockpiled spars, aluminium and engines fill the hangar
  in that window.
- **Upkeep never binds under the foreman.** He keeps the gardens a minute of the next
  cité's bread ahead of the ration, so no run goes hungry; the mechanic only bites a
  player who neglects the gardens.
- **The model runs ahead early and behind late.** The arc probe measures runs 1, 2 and 4
  6–11% slower than `predictArc`, and runs from the fifth up to 13% faster: an opening
  stake compounds, and the model counts it at face value.
- **Crédit Mobilier fades.** Its stake is fixed in units, so its share of a run falls as
  renown grows: about a sixth at renown 8, a twentieth past 20.
