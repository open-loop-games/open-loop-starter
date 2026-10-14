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
- **CastId** _(string-literal union)_ — `lead` · `rival` · `strike-crew`
- **PerkId** _(string-literal union)_ — `stamina` · `cardio` · `boom-mic` · `crew-call` · `bigger-charges`
- **RigShape** _(string-literal union)_ — `nearest` · `ring` · `heading-cone` · `heaviest` · `orbit`
- **RigId** _(string-literal union)_ — `prop-pistol` · `squib-ring` · `pyro-gag` · `dolly-rifle` · `breakaway`
- **SetPieceId** _(string-literal union)_ — `ring` · `stampede` · `wall`
- **GuestId** _(string-literal union)_ — `rival` · `mob`
- **Driver** _(string-literal union)_ — `player` · `instinct`

## Defs

`AgencyDef`, `ExtraKind`, `GuestDef`, `LeadDef`, `PerkDef`, `RatingDef`, `RigDef`, `SetPieceDef`, `StarDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **RatingStep** → `agency`
- **CareerModel** → `rating`
- **StarDef** → `rig`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ExtraKind`, `PerkDef`, `LeadDef`, `SetPieceDef`, `GuestDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **take** — One run: from Action! to CUT when the lead falls, a wipeout, or the strike. Whatever the end, the reels banked pay clout.
- **scene** — The opposition’s content ordinal: it advances once a minute, and a rating starts the take deeper into it.
- **extra** — A body on the floor. Its hp is a factor on the scene’s; a downed extra drops a reel where it fell.
- **rig** — An auto-firing effect the double wears: up to four, each a shape that asks a different place to stand. Fires on its own clock and holds at ready while nothing qualifies.
- **reel** — What a downed extra drops. Reels stay on the floor until walked over; banked reels fill the rewrite bar and pay clout at the wrap.
- **rewrite** — The offered draft: the writers’ pages at each level of the reel ladder. Take one; the rest go in the bin for this offer only.
- **the shot** — A camera frame that drifts round the double. An extra downed inside it drops a gold reel worth double.
- **rating** — The take’s danger, chosen at the call sheet: G, PG, PG-13, R. Each starts deeper into the scene curve, stages more and pays more; it opens once enough stars have wrapped the one below.
- **the climax** — Seven minutes into a take: the set clears and the rating’s lead walks on. The scene keeps stepping while the lead stands.
- **lead** — The rating’s staged villain. The take is in the can only when it falls. R’s lead, the Big Bad, wraps the picture.
- **strike crew** — The sweeper: three minutes after the climax it walks on, cannot be downed, and a touch ends the take as struck.
- **chalk mark** — A ring on the floor. Kills inside it fill it, and each filled mark cuts the lead’s hp by a quarter.
- **set piece** — A staged formation rolled into a minute of the take: a stampede, the charge (a wall with a gap), or a ring that surrounds the double. A harsher rating stages more.
- **guest star** — A guest event rolled into a minute: a rival who walks at the scene’s end with its jackpot unless downed first, or a crowd call that brings a wave at once.
- **ledger** — Each star’s harshest rating wrapped. The ratings’ gates read it, so R needs more than one star.
- **clout** — The currency between takes, paid by every take, a wipeout included. It buys agency perks and signs stars.
- **agency** — The perks clout buys. Each multiplies one chain the rewrite perks also feed.
- **star** — The character select: a body (opening rig, health, speed) and an instinct, the policy parameters the shipping movement and draft policies read when the star improvises.
- **driver** — Who calls the moves in a take: the player (input and picked pages) or the star’s instinct. The mechanics are the same either way.
- **η** — Reels banked over reels dropped. A driver output: the spine assumes it, the probes measure it.
- **the orbit** — The distance from the nearest extra an improvising star tries to hold: inside the loadout’s reach, outside contact, pulled in by its engage.
