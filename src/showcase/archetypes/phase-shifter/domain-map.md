# Phase-shifter — domain language

The one-way mechanic lifecycle: a short ladder of doors, each opened by hand once its record holds, each retiring the mechanisms before it. Night Clerk reads a box, pins a board, then replays a night until six alibis hold.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **DoorId** _(string-literal union)_ — `pin-board` · `reconstruct` · `accuse`
- **MechanismId** _(string-literal union)_ — `read` · `clerk-hire` · `clerk-read` · `xref` · `clerk-xref` · `tipline` · `canvass` · `second-shift` · `night` · `witness` · `clerk-file` · `eliminate` · `insomnia`

## Defs

`DoorDef`, `MechanismDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`DoorDef`, `MechanismDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **door** — The progress that moves the game to its next phase. Opened once, by hand, when its record holds; nothing closes it. The phase is the count of doors opened.
- **record** — What a door reads: a quantity spending never lowers — pages read, lifetime leads, suspects cleared — so a door can never be priced out of reach.
- **mechanism** — Anything the player meets: a verb, a hire, a producer, an automation. Each is live from the door that installs it until the door that retires it.
- **retired** — A mechanism past its retiring door: its chains read zero and its buttons hide. It is filed away, stamped, and never comes back.
- **replaces** — A mechanism that takes over another one's role at the same door: the clerks read, then cross-reference, then file. Stamped REASSIGNED.
- **night** — One replay of 18:00 to 06:00 in the model. What it turns up is unfiled until dawn, when it banks as contradictions.
- **fidelity** — The night model's multiplier: the square root of the board's lifetime leads over the door's threshold.
