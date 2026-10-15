# Interlocker — archetype identity

> `converter` chains over `producer` inputs, opened in an authored order by a
> `prerequisite-graph`, divided by `pool-allocation`, throttled by `upkeep` and
> `storage-capacity` under a `scheduled-event` clock, with `prestige` and
> `meta-progression` above and `automation` taking the running of the works over. Wide,
> not deep: the graph is the content.

Research composition: **The settlement**. Its composition document in the studio's research
library lists the members and the membership claims. Kittens Game,
Industry Idle and Evolve show the composition ships, as a set; none is a lift target.
This build adds one thing the composition does not name: an `ending`, which all three exemplars
decline.

## What this archetype is

*The Aluminium Empire.* In 1855 Sainte-Claire Deville's aluminium came cheap, forty years
early, and the Second Empire builds aeroplanes. You run the Imperial Aeroworks at Le
Bourget. Timber yards, market gardens, bauxite pits and coal drifts make the raw stock.
Four workshops each turn stock into the next good: spruce into spars at the sawpit,
bauxite and coal into aluminium at the reduction furnace, aluminium and coal into engines
at the engine shop, and spars, aluminium and an engine into an aeroplane at the rigging
hall. The engine shop and the rigging hall run on steam, which Boiler Houses raise from
the same coal; when the boilers fall short, the player's shed order says who goes without.

Each workshop opens with a patent from the Académie, and the patents form a lattice. The
compagnons are a fixed headcount, seated at the trades and freely re-seated. Every one
eats bread, and the gardens yield by the season: half again in spring, a quarter in
winter, with weather either way. Every stock has a bin; overflow is lost, and bonded
warehouses widen every bin.

Staging an Exposition clears the works for renown. The jury scores what the works hold
and what the Ministry of War has bought: once the works have shown, the Ministry offers
orders, filled in consignments before they lapse, and every order delivered counts
toward the medal whole. Renown is concave in the score, and the jury sits at most every
two seasons, so when to stage is a choice. Renown lifts every building and compagnon, and
buys charters, then the foreman's three bureaux, which take over seating, the estate and
the Académie. The Grand Prix of the 1867 Exposition ends the story; play goes on.

## The defining component

**The Works schematic.** The production graph is drawn as a cyanotype: stock on gauge
dials whose arc is bin fill, each workshop a plate the player staffs with − and +, and
each recipe a drafted line. A line is pencilled until its patent is held. Once inked, it
runs verdigris while the workshop works. It breaks vermilion where an input starves the
workshop, and dots aluminium where a full output bin blocks it. Each plate names its
bottleneck (crew-bound, short of an input, short of steam, bin full, crew hungry). So the
question the line asks, which node binds and which edge is starving, is answered on the
drawing.

## Rate-function spine

**Bucket: power-law, linear** (`incremental-math/…/rate-functions/power-law.mdx`): every
raw building adds a constant rate, priced on **exponential-family geometric ladders**
(`…/exponential.mdx`). The unit is one raw building's second of output; every worked good
is valued in raw-equivalents by walking its recipe down, steam at the coal it burns
(spar 2, aluminium 3, engine 12, aeroplane 27.5).

```
cost growth   m = 2^(K/N) = 2^(5/25)              prices = weight · RHO · T_FIRST
role rate     r = RHO_WORKER / Σ recipe inputs     one compagnon per raw building per stage
bin           cap = RHO · T_FILL / RAW_EQ          the hangar holds 5.5 < the Exposition's 10
medal         floor(2 · √(score / 275))            score = worked goods held + orders delivered
lift          × (1 + 0.1 · lifetime renown)        every raw building, boiler and compagnon
a run         T = max(T_raw, T_crew, T_orders, JURY_SITTING)
```

A run composes four budgets that work at once, and lasts as long as the longest
(`…/composition.mdx`): the raw units it draws, the crew-seconds of its worked goods, the
Ministry's clock for the orders its medal needs, and the jury's sitting. The reference
player chooses the build and medal that grow the renown multiplier fastest per second
(`planFor`, `gainRate`). Renown shortens every budget but the jury, so late runs hold
their length and the medal grows with output instead. The charters are solved from the
same model; the bureaux are priced in medals; the Grand Prix is the medal the arc first
stages in the spring of 1867.

**Where the closed form stops: the ramp and the order schedule.** How fast raw buildings
come online (`RAMP_SHARE`) and how late a run's last order fills (`ORDER_FILL`) are
measured, not derived: both are fit on `balance/charter-probe.ts`, where the model holds
to about 10% on gain rate and 5% on the medal. The seasons enter at their mean; the
winter larder and the boilers are the player's, and the probe's runner provisions them.
`balance/arc-probe.ts` plays the shipping automation and prints each run beside the arc.

## The arc

| Beat | Recorded |
|---|---|
| The Sawpit Guild patented | 118–120s |
| The Light Steam Engine; the first Boiler House | 353–380s |
| The first aeroplane | 517–546s |
| The first Exposition | 806–877s |
| The first Ministry order delivered | 912–1178s |
| Every charter held | 1997–2024s |
| Le Contremaître employed | 2409–2434s |
| The tenth Exposition | 4635–4674s |
| The Grand Prix (spine: spring 1867, 7200s) | 6357–7342s |

Ranges are the arc probe at tick sizes 0.25 s to 2 s. `manifest.ts` holds every beat.

## Growth ports

- **A ladder after the ending.** Restricted Expositions (no École, no cités, steam
  halved), each paying a capped, permanent bonus: the bounded ladder all three
  exemplars use in place of an ending.
- **Placement.** Workshops sited on a grid, buffing their neighbours: `positional-effect`
  turns this line into the factory.

## Engine fit

| Component | Engine primitive |
|---|---|
| raw buildings, boilers, the ration draw | `createProducerCategory` (`extraCount` from the estate ladder; a negative rate for rations) |
| the estate, the Académie, the charters, the bureaux | `createPurchasableCategory` with `createCostRequirement` over `Formula.exponential` |
| prerequisite edges, estate and bureau visibility | `createGateRequirement` with `active` Gates; a getter Predicate |
| bins | `createResourceBag` with `capacityPerType` and `discard` overflow |
| the compagnons | `createResourceBag` with a total capacity and `block` overflow |
| renown, seasons, patents, the mill's power as multipliers | `createModifierChain` with `bind` |
| a workshop's exchange | `createConversion` with a batch sized each tick |
| the play clock and the seasons | `createTimeSystem`; the season is a computed over it |
| the Ministry's orders | `persistent` state in a context the Exposition resets; `createSeededRNG` |
| the Exposition | `createCycle` (count, these works' clock, reset of the works and the Ministry, Patent Pool `retain`) |
| the foreman's bureaux | `createAutomationTiers`, each tier unlocked by its bureau |
