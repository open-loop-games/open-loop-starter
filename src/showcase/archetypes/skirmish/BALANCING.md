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
| `barracks/<id>/baseCost`, `barracks/<id>/ratio` | `buildingBaseCost`, `buildingRatio` | how early a second floor of a kind comes, and so how fast a mix can shift |
| `barracks/trainRate` | `1 / TRAIN_S` | units per floor per second, before research |
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
choices the square law is solved against; the contract income terms and personas
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
- **Turf compounds control.** It is paid per district held, so its rate decides whether the
  first seat to take ground snowballs.
- **Aether is drawn by every floor but the Chop shop.** A build heavy in hexers, riggers and
  enforcers is capped by taps, not scrip, and `TAP_LIMIT` caps taps.
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
  seconds.
- A healthy contract ends inside the spine's match length at equal income; earlier against
  the cheaper contracts. A stall to `MAX_MATCH_S` is a structural defect, not a tuning one.
- The probe header says what the reference player is and why it plays with every
  lieutenant hired.

## Known thin

- **The pairing table decides little.** A seat that trains only Enforcers wins at least as
  often as one that counters what it sees, and flattening the table changes no aggregate
  outcome. Scouting and the counter wheel are present but not yet load-bearing.
- **The reference player can starve its floors of aether.** Its build plan reads the next
  floor's price, not which input binds, so it can stack aether floors on capped taps while
  scrip piles up.
- **The siege-force landmark has no probe beat.** The probe reports the first assault, which
  also waits on holding a district.
- **Repeated attempts are not identical.** Each policy throttle keeps its phase across
  matches.
