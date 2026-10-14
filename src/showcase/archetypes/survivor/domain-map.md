# Survivor — domain language

One More Take: the stunt double on an action set that never wraps. Extras pour onto the soundstage, the effects crew fires the rigs on their own clocks, and the double only chooses where to stand. Two geometric curves race: rig damage compounds through the rewrites, extra hp and arrivals compound scene by scene.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ChainId** _(string-literal union)_ — `damage` · `fireRate` · `maxHp` · `moveSpeed` · `pickup`
- **ExtraId** _(string-literal union)_ — `grunt` · `biker` · `bruiser` · `henchman`
- **PerkId** _(string-literal union)_ — `stamina` · `cardio` · `boom-mic` · `crew-call` · `bigger-charges`
- **RigShape** _(string-literal union)_ — `nearest` · `ring` · `heading-cone` · `heaviest` · `orbit`
- **RigId** _(string-literal union)_ — `prop-pistol` · `squib-ring` · `pyro-gag` · `dolly-rifle` · `breakaway`
- **Driver** _(string-literal union)_ — `player` · `instinct`

## Defs

`AgencyDef`, `ExtraKind`, `PerkDef`, `RatingDef`, `RigDef`, `StarDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **StarDef** → `rig`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`AgencyDef`, `ExtraKind`, `RatingDef`, `PerkDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **take** — One run: from Action! to CUT at seven minutes or a wipeout. Either way the reels banked pay clout.
- **scene** — The opposition’s content ordinal: it advances once a minute, and a rating starts the take deeper into it.
- **extra** — A body on the floor. Its hp is a factor on the scene’s; a downed extra drops a reel where it fell.
- **rig** — An auto-firing effect the double wears: up to four, each a shape that asks a different place to stand. Fires on its own clock and holds at ready while nothing qualifies.
- **reel** — What a downed extra drops. Reels stay on the floor until walked over; banked reels fill the rewrite bar and pay clout at the wrap.
- **rewrite** — The offered draft: the writers’ pages at each level of the reel ladder. Take one; the rest go in the bin for this offer only.
- **the shot** — A camera frame that drifts round the double. An extra downed inside it drops a gold reel worth double.
- **rating** — The take’s danger, chosen at the call sheet: G, PG, PG-13, R. Each starts deeper into the scene curve; CUT at one opens the next.
- **clout** — The currency between takes, paid by every take, a wipeout included. It buys agency perks and signs stars.
- **agency** — The perks clout buys. Each multiplies one chain the rewrite perks also feed.
- **star** — The character select: a body (opening rig, health, speed) and an instinct, the policy parameters the shipping movement and draft policies read when the star improvises.
- **driver** — Who calls the moves in a take: the player (input and picked pages) or the star’s instinct. The mechanics are the same either way.
- **η** — Reels banked over reels dropped. A driver output: the spine assumes it, the probes measure it.
- **the orbit** — The distance from the nearest extra an improvising star tries to hold: inside the loadout’s reach, outside contact, pulled in by its engage.
