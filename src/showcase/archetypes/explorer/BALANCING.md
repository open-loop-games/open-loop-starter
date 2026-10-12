# Explorer — balancing

A territory economy: the lodge earns while the huntsman is out, and the huntsman earns
only what he carries home. Each band's quarry pays a constant multiple of the band
before, and every price is sized from the budget a stay in the band before banks. The
bucket and its closed form are in `IDENTITY.md` § Rate-function spine.

The numbers come from the anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: gear prices, pack and satchel capacities, rack
throughput and the Hart's trail are all derived from it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `trip/stepSeconds`, `trip/huntSeconds` | 0.5, 3 | The walk's and the hunt's clock. A slower step lengthens every trip, and deep bands most. |
| `trip/supplyPerStep`, `trip/supplyPerHunt` | 1, 1 | Jerky per tile and per hunt. This sets the tether's radius for a given satchel. |
| `lodge/<producer>/rate` | 0.2, 0.15 | Wood or meat per second per woodcutter or snare line. |
| `lodge/<producer>/baseCost`, `lodge/costRatio` | from the spine, 1.15 | The producers' price ladder. |
| `racks/jerkyRate` | 0.57 | Jerky per second per rack at full feed: the meadow's jerky demand. |
| `racks/woodPerJerky` | 0.11 | Wood burned per jerky. Higher starves the racks of wood before meat. |
| `racks/baseCost`, `racks/costRatio` | 20, 1.6 | The rack's price ladder in wood. |
| `hounds/pack`, `hounds/prowess`, `hounds/supplyPerStep` | 0.2, 0.25, 0.25 | What each hound adds to the pack and to prowess, and what it costs per tile. |
| `herds/<band>/regrowSeconds` | one reference trip | Seconds a depleted herd takes to regrow one head. |
| `hunt/skillStep` | 1.08 | Yield and prowess per Huntcraft level. |
| `hunt/bestiaryBonus` | 1.25 | A species' yield once ten are taken. |
| `hunt/hartTrailKills` | 58 | Deepwood kills before the Hart shows itself. |

**Not perturbable, on purpose:**
- Gear prices and camp prices are band budgets, not knobs. A price set apart from the
  budget it is bought from desyncs the ladder; move an anchor instead.
- Quarry yields and threats are the ladder itself (`Y₀·Gᵏ`, `2ᵏ`). They are read from
  `data/wold.ts` at construction.
- The map is generated from `MAP_SEED`. A different seed is a different map, and every
  save made on the old one breaks.

## Couplings

- **The tether is jerky, not distance.** Every term that changes jerky per tile —
  `trip/supplyPerStep`, a hound — shrinks the reachable map for the same satchel. A hound
  pays for itself in pack and prowess only if the walker still reaches the band.
- **The pack banks only at the lodge.** A camp moves the restock point outward but not
  the bank, so deep trips are bounded by the walk home, not by the satchel alone.
  `loss-on-failure` depends on this: a camp that banked would remove it.
- **Racks are throughput-bounded by both inputs.** A rack smokes the minimum its meat
  and its wood can feed. Raising `racks/jerkyRate` without wood to burn does nothing.
- **Gear prices come from the band before.** Terrain gear for band k is a share of band
  k−1's hide budget. A band that runs slow therefore delays the next band twice: once in
  its own stay, once in the price that stay was meant to pay.
- **The bestiary and Huntcraft are inside the solve.** `yieldMult(k)` assumes ten kills
  of the band's species early in the stay. A band whose quarry is scarce misses the
  bonus, and its rate falls below the spine's twice over.

## Running a pass

- `balance/explorer-projection.ts` prints the reference trip per band, its rates and
  budgets, every gear price against the budget it is bought from, and the predicted
  beats.
- `balance/arc-probe.ts [seeds] [maxSeconds]` plays the shipping game to the Hart once per
  seed. Read § Beats against the prediction, then § Bands: the time split into walking,
  hunting and waiting at a restock point, the kills, and the hide rate against the
  spine. A long wait is a jerky shortage; a low rate at full hunting time is thin quarry.

A healthy pass: every seed takes the Hart with no stuck streak, and each band's hide
rate is near `hideRate(k)`.

## Known thin

- **The arc runs about 47% long.** The Hart falls at 2637–2794s against 1800s. Almost
  all of it is the forest: it banks hides at about half the spine's rate and lasts more
  than twice its stay, because the walker waits at the lodge for jerky for 19% of it
  and meadow hares dilute its kills. The Fen runs at 70%; the Snowfield and Deepwood at
  76–106%.
- **The spine has no kill-supply term.** It assumes quarry is waiting at every band's
  middle. Herd density and regrowth set what the map can actually yield, and the probe
  is the only measure of it.
- **One walker.** The probe's greedy walker is one policy. A player who camps earlier or
  over-builds racks runs a different arc, and nothing measures the spread.
