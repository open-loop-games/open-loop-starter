# Survivor — domain language

A containment breach on a scrolling floor. Two geometric curves race: device DPS compounds through the draft, specimen HP and annulus density compound on minute marks. Income is a risk transaction — kills land at the edge of the kill radius, motes land where the specimen died, and the collect radius is smaller — so how much threat a seat chooses to meet is an economic term, not a survival tactic.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **DeviceShape** _(string-literal union)_ — `bolt` · `pulse` · `cone` · `lance`
- **ReagentEffect** _(string-literal union)_ — `cooldown` · `damage` · `reach` · `toughness` · `collect` · `moveSpeed`
- **MetaSide** _(string-literal union)_ — `survival` · `income`
- **MetaEffect** _(string-literal union)_ — `damage` · `toughness` · `moveSpeed` · `collectRadius` · `moteYield` · `revive`
- **SeatDriver** _(string-literal union)_ — `policy` · `player`

## Definitions

`ArenaBalance`, `CollectorBalance`, `DeviceDef`, `EvolutionDef`, `MetaUpgradeDef`, `ReagentDef`, `ScheduleBalance`, `SeatDef`, `SpecimenDef`, `ThreatBalance`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **EvolutionDef** → `device`, `reagent`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ArenaBalance`, `ThreatBalance`, `CollectorBalance`, `MetaUpgradeDef`, `ScheduleBalance`, `SeatDef`, `SpecimenDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **mote** — The XP a specimen drops where it dies. Motes PERSIST, so the floor behind the operator accumulates uncollected income and deferring collection is a coherent gamble paid for against the beat schedule.
- **η** — Collection efficiency — motes banked over motes dropped. A POLICY output, never predicted by the closed form, which is why the probe reports measured against assumed: a run that misses its schedule is either badly balanced or badly piloted, and nothing else separates those.
- **the orbit** — The distance from the nearest specimen a seat tries to hold — inside the kill radius, outside contact. Dancing on the edge. A high-engage seat orbits closer, banks more, and eats more contact; the single number that makes a seat’s movement policy differ.
- **the annulus** — Spawns only appear in a ring around the operator, so threat is always local and always escapable. That is what makes disengagement possible — and what makes it cost everything, since distance is zero damage and zero income.
- **beat** — A draft. Fires on banked motes rather than on the clock, against a ladder DERIVED so the authored 30–90s schedule lands under expected income. Never authored beside the schedule it is meant to satisfy.
- **seat** — A personality: simultaneously the character-select roster, the AI policy bundle driving the operator, and the balance sweep axis. Bundles a movement bias (engage, η) and a draft bias (defenseShare), never a stat block.
- **σ / defenseShare** — The share of draft picks a seat spends on survivability — this archetype’s guns-versus-butter term. Picks spent defensively are picks not spent on DPS, so σ feeds back into what each remaining offensive pick must deliver to hold time-to-kill flat.
- **collector** — A rare drop that pulls every mote on screen. One or two a run, signposted by an edge arrow — which is what turns routing to one through your own uncollected field into a decision. Amortized into the ladder derivation, never modelled as a point impulse.
- **traversal collapse** — The loss condition density produces: no gap wide enough to move through, and carving one needs the DPS a disengaged run never built. Reachability over a crowding threshold, not distance.
- **notes** — The cross-run currency. A continuous accumulator — notes bank on EVERY run end including death, which is what makes a failed run progress rather than a wasted one.
