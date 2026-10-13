# Defender — domain language

Maze tower defence in a walled kitchen garden. By day the gardener plants hedges that re-route the pests and plants that see them off; by night the wave walks to the seedbed. Each plot keeps its best score, and the sum is the gardener’s level.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PestKind** _(string-literal union)_ — `slug` · `mouse` · `beetle` · `aphid` · `moth` · `badger`
- **Armour** _(string-literal union)_ — `soft` · `shell` · `swarm` · `wing`
- **PlantId** _(string-literal union)_ — `hedge` · `thrush` · `trap` · `bat` · `marigold` · `ladybird`
- **Form** _(string-literal union)_ — `peck` · `release` · `hawk`
- **LessonId** _(string-literal union)_ — `well-fed` · `bins` · `perches` · `cloches` · `early-riser`

## Defs

`LessonDef`, `PestSpec`, `PlantSpec`, `PlotDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **SpineAnchors** → `pest`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`PlotDef`, `LessonDef`, `PlantSpec`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **plot** — One field: a fixed map and a fixed run of waves. Holding it opens the next. Its run is not saved; only its best score outlasts it.
- **wave** — One night's pests, composed from the spine's closed forms. It resolves as a batch: nothing can be planted until it is over.
- **build phase** — The day between waves, on a timer. Calling it a day ends it early and pays compost for the daylight given up; the first one waits for the gardener.
- **path** — The route the pests walk from the gap to the seedbed: the shortest one through the beds left open. A planting may lengthen it but never seal it.
- **leak** — A pest that reaches the seedbed. It eats seedlings; an empty seedbed loses the plot.
- **committed value** — The compost on the board plus the compost in hand when a wave launches: the spine's prediction of what the gardener has built.
- **pressure** — A plot's HP pool over what the reference planting deals. Below 1 the plot leaves a margin; above 1 the almanac has to carry the gardener.
- **level** — The gardener's level: read from the sum of each plot's best score, so a worse night on a plot pays nothing.
- **almanac** — The lessons the notes buy, one note a level each. They carry into every plot, and can be taken back for free.
- **companion** — A plant touching marigolds, diagonals included: it hunts harder by the marigolds' boost.
- **counter wheel** — Each night sends one kind of pest, each plot in its own rotation, and each attack form meets each armour kind at its own multiplier. The board shows the next three nights, so the gardener plants for the night ahead.
- **answer share** — The share of the reference board's hunting compost that can hurt tonight's kind, weighted by the matrix. A night is sized against that share, not the whole board.
- **the dark** — Nights past a plot's last, offered when the plot is held: the rotation turns on and HP outgrows bounty each night until the seedbed is eaten. Its depth adds to the plot's best score.
- **hold** — The moment a plot's last night is seen off: the plot is held, its victory banked, and the run waits for the gardener to call it a night or go on.
- **toll** — How much of a pool of one kind a board lands before one gets through, against slugs. Measured per kind; a night is sized by it.
