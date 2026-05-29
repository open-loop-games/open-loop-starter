# Looper — domain language

A run is a rehearsal: actions queue against a draining budget, most state resets, a thin layer of mastery carries forward.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ActionPrereq.kind** _(discriminated-union arm)_ — `action-completion-count` · `stat-tier-level` · `progress-var-level` · `loop-count` · `always`
- **RewardEffect.kind** _(discriminated-union arm)_ — `add-mana` · `add-gold`
- **CompletionEffect.kind** _(discriminated-union arm)_ — `add-mana` · `add-gold` · `spend-gold` · `exchange-gold-to-mana`
- **ActionDef.type** _(discriminated-union arm)_ — `progress` · `regular` · `basic`

## Definitions

`ActionDef`, `ProgressVarDef`, `RegularVarDef`, `ResourceDef`, `StatDef`, `ZoneDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **ProgressVarDef** → `zone`
- **RegularVarDef** → `zone`
- **LooperData** → `stat`, `zone`, `progressVar`, `regularVar`, `action`
- **ActionPrereq** → `action`, `stat`, `progressVar`
- **ActionDef** → `zone`, `progressVar`, `regularVar`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ResourceDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **loop** — One run. The action queue replays each loop against a draining mana budget; when it empties the run ends.
- **progressVar vs regularVar** — progressVar persists across loops (Wander-shape); regularVar is a per-loop pool whose total derives from progressVar levels.
- **stat tiers** — A stat has two tiers — Level resets per loop, Talent persists across loops.
- **action types** — ActionDef.type ∈ {progress, regular, basic} is a labelling convention over existing engine primitives, not new engine surface.
