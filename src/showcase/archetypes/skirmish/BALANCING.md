# Skirmish — balancing

Two seats grow a worker economy and convert it into an army that contests three districts.
The economy is a priced ladder with a payback horizon; the army side is a value budget that
every price is a multiple of; the fight is a square-law exchange. `IDENTITY.md` § Rate-function
spine names the buckets. Everything in `data/` is derived in `data/spine.ts` from the named
anchors at its head.

## The tunables

Every key is read through `tunable()` in `modules/tunables.ts`; both seats share one set.

| Key | Default from | What it moves |
|---|---|---|
| `econ/<id>/rate` | `HUSTLER_RATE`, `TAP_RATE`, `turfRate` | income per hustler, aether per tap, scrip per held district |
| `econ/<id>/baseCost`, `econ/<id>/ratio` | `hustlerBaseCost`, `hustlerRatio`, `tapBaseCost`, `tapRatio` | where the hustler plateau falls; how many taps a seat can feed floors from |
| `floors/baseCost`, `floors/ratio` | `buildingBaseCost`, `buildingRatio` | the one ladder every floor climbs, tech floors included: how many floors convert income, and what a tech floor delays |
| `floors/trainRate` | `1 / TRAIN_S` | units per floor per second, before research |
| `units/<kind>/dps`, `units/<kind>/hp` | `UNIT_DPS`, `unitHp`, `enforcerDps`, `enforcerHp` | fight length; with the pairing table, who wins it |
| `units/<kind>/scrip`, `units/<kind>/aether` | `unitValue`, split at `AETHER_PRICE` | what a unit costs, and how much of the army leans on taps |
| `squats/baseCost`, `squats/ratio` | `squatBaseCost`, `squatRatio` | when the bunks stop binding |
| `squats/supplyBase`, `squats/supplyPer` | `SUPPLY_BASE`, `SUPPLY_PER_SQUAT` | the army a seat can field before and per squat |
| `hq/integrity` | `hqIntegrity` | how long a siege takes, and so the match length |
| `hq/turretDps` | `turretDps` | the smallest squad that can raze a safehouse |
| `districts/captureRate` | `captureRate` | how fast an unopposed squad takes a district |
| `districts/refPresence` | `REF_PRESENCE` | the squad size control drift is scaled to |
| `research/<id>/scrip`, `research/<id>/aether` | multiples of `unitValue` | when each upgrade lands |

Not perturbable: the pairing table (`data/units.ts` `EFFECTIVENESS`), whose cells are design
choices the square law is solved against; a tech floor's price in floors (`data/buildings.ts`
`BarracksDef.floors`); the contract income terms and personas
(`data/contracts.ts`); the lieutenants' prices (`data/crew.ts`, from `LIEUTENANT_UNITS`); and
the scout's duration, cooldown and cost.

## Couplings

- **Every price is a multiple of `unitValue`.** It is the army-side spend of the reference
  walk at `MID_S`, so any change to the hustler ladder, `ECON_SHARE` or `PAYBACK_HORIZON_S`
  reprices floors, squats, research and units together. Perturbing one price key alone moves
  it off the spine.
- **`killRate` is solved from `COUNTER`, `RESIST` and `FIGHT_S`.** Changing a pairing cell
  without re-solving changes every fight's length, not only who wins it.
- **`turretDps` is solved from `MIN_SIEGE_FORCE` and `hqIntegrity`.** Raising integrity
  alone makes small sieges viable; the two move together.
- **The Enforcer's stats are `ENFORCER_VALUE` units for one bunk.** The bag counts every
  unit as one, so a higher value per unit is a higher value per bunk once the bunks bind.
- **Every floor climbs one ladder.** A tech floor is the next floor at its multiple of the
  price, so opening a kind delays the next plain floor, and a late tech costs more than an
  early one.
- **The queue answers a counter at once.** Floors split their time by the seat's mix the moment
  its intel changes, so the counter edge is bounded by what the seat sees and how mixed the
  rival fields, not by the floors. A seat bent fully toward counters scores no better than the
  shipped three-quarters.
- **The landmarks come from a walk of the policy, not of the spend.** `walkArmy` saves for
  floors ahead of hustlers and converts one unit per floor per `TRAIN_S`, so its army at
  `MID_S` is well short of `MID_ARMY`. `MID_ARMY` defines a unit's value; changing it reprices
  everything without moving the walk's army much.
- **Turf compounds control.** It is paid per district held, so its rate decides whether the
  first seat to take ground snowballs.
- **Aether is drawn by every kind but razors.** A mix heavy in hexers, riggers and enforcers
  is capped by taps, not scrip, and `TAP_LIMIT` caps taps. The build plan buys a tap before a
  floor its taps and bank cannot feed, and the queue hands aether kinds' time to razors until
  the taps can feed the rest.
- **Both seats pay the same lieutenant prices.** Every scope of the policy a seat runs is
  bought with scrip the army does not get. A price one seat pays and the other does not is
  a handicap the economy has no slack for: with the rival's policy free, a fully hired
  player lost every contract at 1, 2 and 3 units of value.
- **The rival's analysts are not fogged.** `situation('e')` reads the player's whole army,
  so the rival's `counter` persona weight acts on true information.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/skirmish/balance/arc-probe.ts` prints the
  spine's values and landmarks, then plays each contract under the reference player and
  prints every beat, both seats' end state and the roster's results. It takes about two
  seconds. The measured siege beat lands after the walk's: the walk fields no losses.
- `pnpm exec vite-node src/showcase/archetypes/skirmish/balance/counter-probe.ts [--hard]`
  asks whether reading the rival wins matches: wins, ends and counter fit for a shipped,
  blind, fully bent and table-flat player seat. Its header defines counter fit. A healthy
  axis has the shipped seat ahead of the blind one, and the flat table losing above parity.
- A healthy contract ends inside the spine's match length at equal income; earlier against
  the cheaper contracts. A stall to `MAX_MATCH_S` is a structural defect, not a tuning one.
- The probe header says what the reference player is and why it plays with every
  lieutenant hired.

## Known thin

- **The counter edge is modest.** The shipped seat's counter fit leads the blind seat's, but
  the edge decides matches only near parity. Rivals that field mixed armies leave little to
  counter.
- **The reference player never techs to enforcers.** Its bent mix keeps them under the share
  that buys a tech floor; only the megacorp fields them.
- **Below parity the table hardly matters.** Contracts 1–3 sit under the player's income, so
  a flat table still wins them; the counter probe's `--hard` run is where the axis shows.
- **Repeated attempts are not identical.** Each policy throttle keeps its phase across
  matches.
