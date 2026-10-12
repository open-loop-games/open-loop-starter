# Looper — domain language

The loop game: the player writes a plan, a night executes it against a draining budget, and a thin layer of mastery survives each reset. The game is the diff between two nights.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ItemId** _(string-literal union)_ — `picks` · `smokes` · `keycard` · `fence`
- **SkillId** _(string-literal union)_ — `brawn` · `stealth` · `finesse` · `guile`
- **NoteId** _(string-literal union)_ — `steel-nerves` · `grapevine` · `routine` · `discipline` · `deja-vu`
- **GateId** _(string-literal union)_ — `pick-cell` · `slip-patrol` · `badge-door` · `cut-fence` · `wall-climb`

## Defs

`ActionDef`, `NightPrediction`, `NoteDef`, `NotePrice`, `SkillDef`, `ZoneDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **ActionDef** → `zone`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`NoteDef`, `SkillDef`, `NotePrice`, `NightPrediction`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **night** — One run. It ends on empty Nerve, on the wall, or on turning in, and the night module resets. Nothing a night carries survives it except mastery, Intel and the ground discovered.
- **Nerve** — The run budget: seconds of night left, drained by the night clock and refilled only by route content (coffee, the hamper). A refill is work spent to buy time, so it is counted inside a gate's fill.
- **plan** — The authored policy: an ordered list of actions with repeat counts, executed top to bottom. It is the only player decision during play; an action the night cannot do is skipped, not waited on.
- **gate** — An action that opens a landmark. Its duration is derived from the predicted capacity of the night it is scheduled to fall on, never authored.
- **talent** — A skill's in-night level, 1 + α·L. It resets with the night. Contrast mastery.
- **mastery** — The share of a night's talent level a skill banks at the night's end: linear to a knee, square root past it. It multiplies talent, so every later night starts faster.
- **splits** — Night-seconds to each landmark. After the first escape the night ends on the wall, so splits — not depth — are what improves.
