# Interlocker — archetype identity

> `converter` chains over `producer` inputs, opened in an authored order by a
> `prerequisite-graph`, divided by `pool-allocation`, throttled by `upkeep` and
> `storage-capacity`, with `prestige` and `meta-progression` above. Wide, not deep: the
> graph is the content.

Identity line source: `../_identity.md` (Interlocker entry); the line's player experience
and exemplar calls are `../_docs/interlocker.md`. **Core · covered.** Kittens Game,
Industry Idle and Evolve show the composition ships, as a set; none is a lift target.

## What this archetype is

*The Aluminium Empire.* In 1855 Sainte-Claire Deville's aluminium came cheap, forty years
early, and the Second Empire builds aeroplanes. You run the Imperial Aeroworks at Le
Bourget. Timber yards, market gardens, bauxite pits and coal drifts make the raw stock.
Four workshops each turn stock into the next good: spruce into spars at the sawpit,
bauxite and coal into aluminium at the reduction furnace, aluminium and coal into engines
at the engine shop, and spars, aluminium and an engine into an aeroplane at the rigging
hall.

Each workshop opens with a patent from the Académie, and the patents form a lattice:
the Rolling Mill and Monoplane Rigging each need two parents. The compagnons are a fixed
headcount, seated at the trades and freely re-seated. Every one eats bread, seated or
idle, and an empty larder slows every workshop to what the gardens feed. Every stock has
a bin; overflow is lost, and bonded warehouses widen every bin. The hangar is a bin too:
it holds six aeroplanes, and an Exposition needs ten. Staging the Exposition before the
Emperor turns the hangar into renown and clears the works. Renown lifts every raw
building's yield, and buys charters that outlast every Exposition.

## The defining component

**The Works schematic.** The production graph is drawn as a cyanotype: stock on gauge
dials whose arc is bin fill, each workshop a plate the player staffs with − and +, and
each recipe a drafted line. A line is pencilled until its patent is held. Once inked, it
runs verdigris while the workshop works. It breaks vermilion where an input starves the
workshop, and dots aluminium where a full output bin blocks it. Each plate names its
bottleneck (crew-bound, short of an input, bin full, crew hungry). So the question the
line asks, which node binds and which edge is starving, is answered on the drawing.

## Rate-function spine

**Bucket: power-law, linear** (`incremental-math/…/rate-functions/power-law.mdx`): every
raw building adds a constant rate, priced on **exponential-family geometric ladders**
(`…/exponential.mdx`). The unit is one raw building's second of output; every worked good
is valued in raw-equivalents by walking its recipe down (spar 2, aluminium 3, engine 11,
aeroplane 25), and prices, bins and labour rates all key off that valuation.

```
cost growth   m = 2^(K/N) = 2^(5/25)              prices = weight · RHO · T_FIRST
role rate     r = RHO_WORKER / Σ recipe inputs     one compagnon per raw building per stage
bin           cap = RHO · T_FILL / RAW_EQ          the hangar holds 6 < the Exposition's 10
renown        floor(2 · √(P / 10))                 raw output × (1 + 0.1 · lifetime renown)
a run         T = max(T_raw, T_crew)
              T_raw  = raw units drawn / (ρ_R · mean raw buildings, less the ration)
              T_crew = worked goods in crew-seconds / mean crew · labour
```

A run composes two budgets that work at once, and lasts as long as the longer
(`…/composition.mdx`). The raw budget is every raw unit the run draws: prices, and what
the workshops eat to make the worked goods. The crew budget is every worked good, in
crew-seconds. Renown scales raw throughput; Imperial Patronage and the École Centrale
scale the crew; the Patent Pool and Crédit Mobilier's stake take units off the bill.
Across the whole arc the raw budget is the longer: the purse binds, not the crew.

The build each run reaches is derived, not authored (`planFor`): warehouses until the
hangar holds an Exposition, every cité the bins can price, gardens for the ration and the
next cité, and raw producers for the full crew's draw plus the purse. The charters'
strengths and prices are solved from the same model (`CHARTER_SHARE`, `CHARTER_PAYBACK`).
`warehousesNeeded` guards the softlock where a price on the path to Bonded Warehousing
outgrows the base bins.

**Where the closed form stops: the ramp.** How fast raw buildings come online across a run
is measured, not derived: `RAMP_SHARE` is fit on `balance/charter-probe.ts`, 35 runs
over lifetime renown and charter sets, where the model holds to about 6% rms.
`balance/arc-probe.ts` plays the shipping game under the reference foreman, who raises
the planned build, and prints each run beside the spine's arc.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| The first timber yard raised | | 63–64s |
| The Sawpit Guild patented | | 145–148s |
| Les Baux Concession: pits and drifts | | 244–252s |
| Deville's reduction furnace | | 314–318s |
| Bonded Warehousing | | 361–375s |
| The Light Steam Engine | | 393–421s |
| Monoplane Rigging | | 524–537s |
| The first aeroplane | | 527–540s |
| The first Exposition | 526s | 558–572s |
| The third Exposition | 1390s | 1449–1488s |
| The fifth Exposition | 1996s | 2070–2142s |

Ranges are the arc probe at tick sizes 0.25 s to 2 s; the foreman is deterministic.
`manifest.ts` holds the recorded beats.

## Growth ports

- **A layer above the Exposition.** Renown buys four charters and then nothing; a second
  prestige layer, or a renown sink that scales, gives the arc a further shape and an end.
- **Contention.** Coal feeds both the furnace and the engine shop. Sharing out a contested
  input, with priority declared, is the converter's harder case.
- **Placement.** Workshops sited on a grid, buffing their neighbours: `positional-effect`
  turns this line into the factory.

## Engine fit

| Component | Engine primitive |
|---|---|
| raw buildings, the ration draw | `createProducerCategory` (`extraCount` from the estate ladder; a negative rate for rations) |
| the estate, the Académie, the charters | `createPurchasableCategory` with `createCostRequirement` over `Formula.exponential` |
| prerequisite edges, estate visibility | `createGateRequirement` with `active` Gates |
| bins | `createResourceBag` with `capacityPerType` and `discard` overflow, linked to each stock |
| the compagnons | `createResourceBag` with a total capacity and `block` overflow, a stock per trade |
| warehouses, charters, patents as multipliers | `createModifierChain` with `bind` |
| Crédit Mobilier's stake | the charter's `on('purchased')`, and the Cycle's `afterEnd` |
| a workshop's exchange | `createConversion` with a batch sized each tick |
| the Exposition | `createCycle` (count, these works' clock, reset of the works, Patent Pool `retain`) |
| the play clock | `createTimeSystem` |

Three hand-rolls carry `TODO(expansion)` markers in `modules/works.ts`: the continuous
converter (a workshop's throughput is the minimum of crew, inputs and output room; its
drop-spot entry is `candidate-primitives.md` § Continuous converter), the upkeep
shortfall (the share fed, recomputed from the gardens), and the flow ledger (net rate as
the stock delta across a tick, since producer totals miss conversions and bins).

## Balance model

The spine is `data/spine.ts`, printed by `balance/interlocker-projection.ts`.
`balance/arc-probe.ts` plays Expositions under the reference foreman in
`balance/_foreman.ts`, beside the spine's arc; `balance/charter-probe.ts` checks the run
model across renown and charters. `BALANCING.md` covers the knobs and couplings.
