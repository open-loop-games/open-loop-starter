# Ambient — domain language

The archetype you keep rather than play: resources accumulate whether watched or not, nothing expires, no run punishes absence.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **UnlockReveal.kind** _(discriminated-union arm)_ — `producer` · `scene-variant` · `ui`

## Definitions

`AchievementDef`, `AutoProducerDef`, `SceneVariantDef`, `UnlockDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **AmbientData** → `unlock`, `achievement`, `sceneVariant`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`AutoProducerDef`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **no-anxiety contract** — Loop 9 (enemy scaling) and Loop 14 (cooldown urgency) are deliberately absent, not merely missing — nothing expires or punishes absence.
- **scene variant** — A revealed visual element (a building appears, an animal wanders in, a zone unlocks) — presentation, distinct from a mechanical unlock.
