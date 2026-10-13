# Producer — domain language

Consolidated Holdings: a geometric cost ladder under multiplicative stacks, with desks that take the spending over and no adversary, no board, no run and no reset.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **HireId** _(string-literal union)_ — `sales-desk` · `acquisitions-desk` · `board`

## Defs

`BookkeeperDef`, `ExecutiveDef`, `GradeDef`, `ManagementDef`, `MilestoneDef`, `SubsidiaryDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **MilestoneDef** → `subsidiary`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ManagementDef`, `GradeDef`, `ExecutiveDef`, `BookkeeperDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **subsidiary** — A producer tier: each unit earns cash every second, and each acquisition of a kind raises the next seller’s price. Owning one of a tier reveals the next.
- **memo** — A management one-shot, signed on the board: it doubles one subsidiary, or the deal (sales training). Purchased, unlike a certificate or a grade, which are earned.
- **market-leader certificate** — A milestone earned on an owned count (25, 50, 100). Must stay a DISCRETE step on a count: made continuous it takes the spine off the closed form, silently.
- **credit grade** — A global multiplier earned on lifetime revenue, never on the current rate, so spending never takes one back.
- **desk** — An executive hire: one automation tier, with a duty switch. Sending a desk home is how the player saves by hand.
- **night bookkeeper** — The one-time unlock for offline catch-up. Before it, a return replays nothing.
