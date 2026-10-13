# Phase-shifter — domain language

The one-way mechanic lifecycle: a short ladder of doors, each opened by hand once its record holds, each retiring the mechanisms before it. Night Clerk reads a box, pins a board, stakes out a replayed night until six alibis hold, then reads one last page.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **DoorId** _(string-literal union)_ — `pin-board` · `reconstruct` · `box-returns`
- **MechanismId** _(string-literal union)_ — `read` · `clerk-hire` · `clerk-read` · `tipline` · `clerk-write` · `pin` · `board-space` · `strings` · `night` · `watch` · `roster` · `clerk-plan` · `insomnia` · `last-page`
- **PlaceId** _(string-literal union)_ — `mill` · `post` · `church` · `bus` · `hospital` · `ditch`
- **PersonId** _(string-literal union)_ — `varga` · `ames` · `kell` · `ferro` · `ashby` · `pruitt` · `ada`

## Defs

`CardDef`, `DoorDef`, `MechanismDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`DoorDef`, `MechanismDef`, `CardDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **door** — The progress that moves the game to its next phase. Opened once, by hand, when its record holds; nothing closes it. The phase is the count of doors opened.
- **record** — What a door reads: a quantity spending never lowers — pages read, lifetime leads, suspects cleared — so a door can never be priced out of reach.
- **mechanism** — Anything the player meets: a verb, a hire, a producer, an automation. Each is live from the door that installs it until the door that retires it.
- **retired** — A mechanism past its retiring door: its chains read zero and its buttons hide. It is filed away, stamped, and never comes back.
- **replaces** — A mechanism that takes over another one's role at the same door: the clerks read, then cross-reference, then file. Stamped REASSIGNED.
- **card** — One sighting: a person, a place, an hour. The clerks write cards up from notes; the board pins them; the night watches where they point.
- **string** — What runs between two neighbouring cards that share a fact. Its strength is the facts shared, and string earns leads.
- **watch** — A place at an hour on the stakeout. A clerk posted there sees whoever the night puts there, or nobody.
- **hint** — A watch a pinned card points at: the board's hand-off to the night.
- **strain** — Empty watches in one night. Once it reaches what the roster can carry, the model breaks and the night's finds are lost.
- **alibi** — What a suspect says they did. It holds once every hour of it has been seen; six holding open the last door.
