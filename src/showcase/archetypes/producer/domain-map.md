# Producer — domain language

The classic big-number incremental: a geometric cost ladder under a multiplicative modifier stack, with no adversary, no board, no run and no reset.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ProbeClassId** _(string-literal union)_ — `seed` · `drone` · `foundry` · `hauler` · `ring` · `lathe` · `swarm` · `shell`
- **RefinementScope.kind** _(discriminated-union arm)_ — `class` · `global` · `click`

## Definitions

`ProbeClassDef`, `RefinementDef`, `RevisionDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **ProducerData** → `refinement`, `revision`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ProbeClassDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **the frontier** — Why cost scales. Each launch reaches a further star, so the cost ladder is the expanding shell — the ratio is derived from the premise rather than imposed on it.
- **revision** — A threshold-triggered global multiplier — a firmware push reaching the whole swarm at once. Must stay a DISCRETE step on a count: made continuous in production it takes the spine off the closed form, silently.
- **refinement** — A bought one-shot multiplier, scoped to one class, to every class, or to the hand-launch. Distinct from a revision, which is earned rather than purchased.
- **dispatch** — Handing allocation to the swarm. The automation ladder gates which selection rule applies; the rules themselves are engine primitives, not authored here.
