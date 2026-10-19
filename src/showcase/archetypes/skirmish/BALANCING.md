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
| `econ/<id>/rate` | `HUSTLER_RATE`, `TAP_RATE` | income per hustler at that node, aether per tap |
| `econ/<id>/baseCost`, `econ/<id>/ratio` | `hustlerBaseCost`, `hustlerRatio`, `tapBaseCost`, `tapRatio` | how far into a node's slots hiring still pays back; how many taps a seat can feed floors from |
| `econ/<id>/limit` | `START_HUSTLERS + NODE_HUSTLERS` at the safehouse, `NODE_HUSTLERS` per district, `TAP_LIMIT` | how much income the safehouse alone carries, and what taking a district is worth |
| `floors/baseCost`, `floors/ratio` | `buildingBaseCost`, `buildingRatio` | the one ladder every floor climbs, tech floors included: how many floors convert income, and what a tech floor delays |
| `floors/trainRate` | `1 / TRAIN_S` | units of value per floor per second, before research; an enforcer takes `ENFORCER_VALUE` of them |
| `units/<kind>/dps`, `units/<kind>/hp` | `UNIT_DPS`, `unitHp`, `enforcerDps`, `enforcerHp` | fight length; with the pairing table, who wins it |
| `units/<kind>/scrip`, `units/<kind>/aether` | `unitValue`, split at `AETHER_PRICE` | what a unit costs, and how much of the army leans on taps |
| `squats/baseCost`, `squats/ratio` | `squatBaseCost`, `squatRatio` | when the bunks stop binding |
| `squats/supplyBase`, `squats/supplyPer` | `SUPPLY_BASE`, `SUPPLY_PER_SQUAT` | the army a seat can field before and per squat |
| `hq/integrity` | `hqIntegrity` | how long a siege takes, and so the match length |
| `hq/turretDps` | `turretDps` | the smallest squad that can raze a safehouse |
| `districts/captureRate` | `captureRate` | how fast an unopposed squad takes a district |
| `districts/refPresence` | `REF_PRESENCE` | the squad size control drift is scaled to |
| `research/<id>/scrip`, `research/<id>/aether` | multiples of `unitValue` | when each upgrade lands |
| `charter/cost` | `charterCost` | when the second tier opens: the black clinic and the tier-two research |
| `hq/turretLevels` | `TURRET_LEVELS` | the largest siege a safehouse can demand, `MIN_SIEGE_FORCE · √levels` |
| `districts/nestCost`, `districts/nestDps`, `districts/nestHp` | `districtTurretCost`, `districtTurretDps`, `districtTurretHp` | what holding a district against a raid costs, and how big a raid a nest outlasts |

Not perturbable: the pairing table (`data/units.ts` `EFFECTIVENESS`), whose cells are design
choices the square law is solved against; the floors the charter waits for (`CHARTER_FLOORS`); the contract income terms and personas
(`data/contracts.ts`); the lieutenants' prices (`data/crew.ts`, from `LIEUTENANT_UNITS`); and
the scout's duration, cooldown and cost. A gate gun level's price and the siege it demands
(`turretLevelCost`, `minSiegeAt`) are solved from the spine's turret and integrity, not from
the tunables: overriding `hq/turretDps` or `hq/integrity` moves the fire but not the
assault threshold, the siege the safehouse card shows, or the price.

## Couplings

- **Every price is a multiple of `unitValue`.** It is the army-side spend of the reference
  walk at `MID_S`, so any change to the node ladders and limits, `REF_TAKE_S`, `ECON_SHARE` or
  `PAYBACK_HORIZON_S` reprices floors, squats, research and units together. Perturbing one price key alone moves
  it off the spine.
- **`killRate` is solved from `COUNTER`, `RESIST` and `FIGHT_S`.** Changing a pairing cell
  without re-solving changes every fight's length, not only who wins it.
- **`turretDps` is solved from `MIN_SIEGE_FORCE` and `hqIntegrity`.** Raising integrity
  alone makes small sieges viable; the two move together.
- **A gate gun costs the siege it adds.** Level k needs `MIN_SIEGE_FORCE · √k` units, and is
  priced at the units it adds over level k − 1, so each level costs less than the last and
  demands less. The assault threshold reads the rival's level (`assaultAt` in the policy),
  so a turret bought is an assault delayed, not only a siege survived.
- **A sentry nest is presence.** A district with an enemy nest is a fight, so nobody captures
  it and no siege leaves it until the nest falls. Spread fire treats a nest as
  `DISTRICT_TURRET_VALUE` units; focused fire skips it. Its value is protecting the
  hustlers working the district, so it matters as much as `NODE_HUSTLERS` does.
- **Defence waits behind a floor's save unless the seat is threatened.** The seat buys gate
  guns and nests from the same purse as floors. While saving for a floor it buys defence
  only once the enemy army it knows of could already siege its current level, or it is
  besieged.
- **The Enforcer's stats are `ENFORCER_VALUE` units for one bunk.** The bag counts every
  unit as one, so a higher value per unit is a higher value per bunk once the bunks bind.
- **Every floor climbs one ladder.** A tech floor is the next floor's price, so opening a
  kind delays the next plain floor, and a late tech costs more than an early one.
- **The charter is saved for like a floor, ahead of the next one.** It delays every floor
  after the second. Once it is bought, the clinic is still the next floor on the ladder and
  waits on the draw rule, so a cheaper charter brings the charter forward but hardly moves
  the clinic.
- **A seat charters only for something behind it.** The policy saves for the charter when
  the persona's mix wants a tier-two kind or its research list names a tier-two line. A
  persona with neither, such as the street gang, never buys it.
- **The counter bend moves only the kinds that counter something.** A generalist keeps its
  persona share, so the persona's enforcer weight is what decides whether the seat opens
  the clinic. A bend over every kind starves the generalist under the share that buys a
  tech floor.
- **The queue answers a counter at once.** Floors split their time by the seat's mix the moment
  its intel changes, so the counter edge is bounded by what the seat sees and how mixed the
  rival fields, not by the floors. A seat bent fully toward counters scores no better than the
  shipped three-quarters.
- **The landmarks come from a walk of the policy, not of the spend.** `walkArmy` saves for
  floors and the charter ahead of hustlers and converts one triangle unit per floor per `TRAIN_S`, so its army at
  `MID_S` is well short of `MID_ARMY`. `MID_ARMY` defines a unit's value; changing it reprices
  everything without moving the walk's army much.
- **District hustlers follow ownership, not control.** A seat owns a district from its capture
  until the rival's (`match.owner`), so a raid that dents control costs nothing until it
  flips the district; then that district's hustlers scatter. A node's limit is what taking
  ground is worth, and so whether the first seat to take it snowballs.
- **A node's ratio decides whether its slots fill.** The fifth hire pays back in
  `FIRST_PAYBACK_S · 2^NODE_DOUBLINGS`. Under the horizon, every slot fills and the node is
  a cap; past it, the ladder stops a seat first. A persona with a shorter horizon (the
  street gang's 90 s, the cabal's 120 s) stops one hire short in every node.
- **The safehouse ladder starts past the hustlers it opens with.** Its base is divided by
  `ratio^START_HUSTLERS`, so its first hire costs what a district's first does. The engine
  prices a purchase from the count, initial hustlers included.
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

- **Above parity the counter edge does not save the player.** Below it, reading the rival
  wins matches a blind or table-flat seat loses; against rivals at 1.1–1.2× income the
  shipped and blind seats win equally few. Rivals that field mixed armies leave little to
  counter.
- **Enforcers arrive late.** The charter lands on the walk's mark, but the clinic waits on
  the floor ladder and opens about when the bunks begin to bind. The reference player fields
  about one enforcer before the match ends.
- **Taking ground moves income, not the player's wins.** Under the reference player the
  district gap shows up in hustlers (about 16 against the rival's 13 at 300 s), yet a variant
  with no district slots wins as often. One won fight decides more matches than the income.
- **Repeated attempts are not identical.** Each policy throttle keeps its phase across
  matches.
