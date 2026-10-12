# Explorer — balancing

A territory economy: the lodge earns while the huntsman is out, and the huntsman earns
only what he carries home, on jerky the lodge smokes and water the map gives. Each
band's quarry pays a constant multiple of the band before, every price is sized from
the budget a stay in the band before banks, and each den's trophy changes the trips of
the bands after it. The
bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: gear prices, pack and satchel capacities, rack
throughput, refill detours, the opening's length and the Hart's trail are all derived
from it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `trip/stepSeconds`, `trip/huntSeconds` | 0.5, 3 | The walk's and the hunt's clock. A slower step lengthens every trip, and deep bands most. |
| `trip/supplyPerStep`, `trip/supplyPerHunt` | 1, 1 | Jerky per tile and per hunt. This sets the tether's radius for a given satchel. |
| `water/perStep`, `water/perHunt` | 2, 1 | Water per tile and per hunt. At 2 a tile, water binds the walk before jerky does; lower it and the springs stop shaping paths. |
| `lodge/<producer>/rate` | 0.2, 0.15 | Wood or meat per second per woodcutter or snare line. |
| `lodge/<producer>/baseCost`, `lodge/costRatio` | from the spine, 1.15 | The producers' price ladder. |
| `racks/jerkyRate` | 0.57 | Jerky per second per rack at full feed: the meadow's jerky demand. |
| `racks/woodPerJerky` | 0.11 | Wood burned per jerky. Higher starves the racks of wood before meat. |
| `racks/baseCost`, `racks/costRatio` | 20, 1.6 | The rack's price ladder in wood. |
| `hounds/pack`, `hounds/prowess`, `hounds/supplyPerStep` | 0.2, 0.25, 0.25 | What each hound adds to the pack and to prowess, and what it costs per tile. |
| `herds/<band>/regrowSeconds` | one reference trip | Seconds a depleted herd takes to regrow one head. |
| `hunt/skillStep` | 1.08 | Yield and prowess per Huntcraft level. |
| `hunt/bestiaryBonus` | 1.25 | A species' yield once ten are taken. |
| `hunt/hartTrailKills` | 44 | Deepwood kills before the Hart shows itself. |

**Not perturbable, on purpose:**
- Gear prices and camp prices are band budgets, not knobs. A price set apart from the
  budget it is bought from desyncs the ladder; move an anchor instead.
- Quarry yields and threats are the ladder itself (`Y₀·Gᵏ`, `2ᵏ`). They are read from
  `data/wold.ts` at construction.
- The map is generated from `MAP_SEED`. A different seed is a different map, and every
  save made on the old one breaks.
- The trophy schedule (`TROPHY_FROM`) and the water geography (`SPRINGS_PER_BAND`,
  `REFILL_DETOUR`, the river, the frozen band) are spine inputs. Change them in `data/`
  and re-solve the field factor.
- `FIELD_FACTOR` is a measurement, not a knob. Perturbing it would price the game for a
  walk that does not happen; re-solve it instead (§ Running a pass).

## Couplings

- **The tether is jerky and water, not distance.** Every term that changes jerky or
  water per tile — `trip/supplyPerStep`, `water/perStep`, a hound — shrinks the reachable
  map for the same satchel and skin. A hound pays for itself in pack and prowess only if
  the walker still reaches the band.
- **Water binds first.** The starting skin holds 8 steps against the satchel's 12, and
  each skin level adds 4 against the satchel's 8. So springs and the river shape the
  routes, the frozen Snowfield and dry Deepwood bind hardest, and the waterskin line is
  bought before the satchel.
- **The pack banks only at the lodge until the sledge.** A camp moves the restock point
  outward but not the bank, so deep trips are bounded by the walk home.
  `loss-on-failure` depends on this, which is why a camp banks only once the White Bear
  is taken, late. The notes bank at any camp: a fall costs charting as well as the haul.
- **Trophies change the trips of the bands after their den.** The mattock caps every
  refill detour; the coracle shortens trips across the Fen; the sledge starts and banks
  Deepwood trips at the camp. The sledge more than doubles the Deepwood's hide rate,
  and the Hart's trail is one reference stay of kills, so a player who skips the White
  Bear stays in the Deepwood longer.
- **Racks are throughput-bounded by both inputs.** A rack smokes the minimum its meat
  and its wood can feed. Raising `racks/jerkyRate` without wood to burn does nothing.
- **Gear prices come from the band before.** Terrain gear for band k is a share of band
  k−1's hide budget. A band that runs slow therefore delays the next band twice: once in
  its own stay, once in the price that stay was meant to pay.
- **The bestiary and Huntcraft are inside the solve.** `yieldMult(k)` assumes ten kills
  of the band's species early in the stay. A band whose quarry is scarce misses the
  bonus, and its rate falls below the spine's twice over.
- **The hit chance and Huntcraft feed each other.** A kill trains the skill and the skill
  raises the hit chance, so `hunt/skillStep` moves every band's kills, yields and the
  Hart's trail at once.
- **The opening is paid in wood, net of smoking.** The meadow lasts until the first camp
  and the second rack are affordable, and the racks burn wood while the meadow eats.
  Raising `racks/woodPerJerky` lengthens the opening as well as the forest.
- **`FIELD_FACTOR` is measured under the walker.** The walker in `balance/_engine.ts`
  stands in for the reference player, and its rules are the spine's assumptions. Change
  them, the map or any trip term, and the factors no longer describe the walk.
- **The forest's and the Fen's factors trade.** The Fen's gear is priced from the
  forest's budget. A higher forest factor makes the Fen's gear dearer, so a step that
  fixes one band's stay moves the other's.

## Running a pass

- `balance/explorer-projection.ts` prints the reference trip per band, its rates and
  budgets, every gear price against the budget it is bought from, and the predicted
  beats.
- `balance/arc-probe.ts [seeds] [maxSeconds]` plays the shipping game to the Hart once per
  seed. Read § Beats against the prediction, then § Bands: the time split into walking
  (charting toward the frontier within it), hunting and waiting at a restock point, the
  hit rate and kills, and the hide rate against the spine. A long wait is a jerky
  shortage; a low rate at full hunting time is thin quarry.
- `balance/field-probe.ts [seeds]` measures each band's stay against its schedule and
  prints the next `FIELD_FACTOR` step. Re-solve after any change to the walker, the map
  or a trip term. Keep the step that lands the Hart; a full step overshoots the forest
  and the Fen (§ Couplings).

A healthy pass, over the default seeds: every seed takes the Hart with no stuck streak;
the Hart lands within 5% of `ANCHORS.arcSeconds`; the Snowfield and Deepwood entries land
within 10% of their predictions, and the Fen within 25%.

## Known thin

- **The opening runs long.** The first camp falls at 347–443s against 294s: the walker
  reaches the waystone after the wood is ready. The Fen then opens 3–22% late.
- **Dens fall off schedule.** The mattock comes 30% after the Fen opens, while the
  coracle and the sledge come before their bands open: the walker owns the next bow
  before it owns the next terrain gear. The spine counts each trophy from a band
  boundary.
- **The remainder is a measurement.** `FIELD_FACTOR` carries what the walk does not
  model: herds scattered in threes, early trips on entry gear, shallower quarry on the
  way, rack waits. The spine predicts the arc only for maps and walkers like the ones it
  was solved on.
- **One walker.** The probe's greedy walker is one policy. A player who camps earlier or
  over-builds racks runs a different arc, and nothing measures the spread.
