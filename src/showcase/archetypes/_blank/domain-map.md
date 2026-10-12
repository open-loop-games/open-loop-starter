# Blank — domain language

The neutral base: one tracked amount rising at a tunable rate, with one automation tier that ships locked. Replace this with your game.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

_(no enums or string-literal unions in scope)_

## Defs

`GameBalance`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`GameBalance`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **amount** — The one tracked number, amount(t) = ratePerSecond · t. A placeholder for your economy; rename it to the noun your game uses.
