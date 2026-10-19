# Skirmish — archetype identity

> Workers fund an army: `producer` hustlers and ley taps feed `converter` training floors,
> gated by a `prerequisite-graph` and capped by `storage-capacity`, whose units meet through
> `type-effectiveness`. Over it, three components no pattern names: real time, direct command
> of squads by district, and a match won by burning the rival's base.

Genre: `rts`. Its document in the studio's research library lists the games in it.

## What this archetype is

*Chrome & Cantrip.* The ley lines have woken under a rain-soaked sprawl, and two crews fight
over three of its districts. Hustlers bring home scrip, ley taps draw aether. The safehouse runs ten hustlers; every
district a crew takes runs five more, until the rival takes it back and they scatter. Training floors turn both into
Razorboys, Hexers, Riggers and Enforcers while the bunks have room; coffin squats add bunks.
Each kind is opened by its own floor — a chop shop, a talisman parlor, a drone garage — and
every floor then trains whatever kinds stand open, splitting its time by the crew's queue.
Research sits behind the floors it needs. Once two floors stand, a crew can buy the
syndicate charter, which raises it a tier: the black clinic that opens Enforcers, and the
second tier of research, wait behind it.

Razorboys cut Hexers, Hexers fry Riggers' drones, Riggers brick Razorboys' chrome; Enforcers
hit everything evenly in heavy frames. The player sends whole units into a district by kind,
pulls a squad back, sets its focus, and orders an assault once the district is held. A held,
uncontested district under an assault order fires on the rival's safehouse while its turret
fires back. Units at home hold the gates.

The player sees a district only through a squad in it or control leaning their way. An
astral scout, paid in aether, reveals everything for a while; afterwards each district keeps
its last sighting, dimmed with its age. A match is one contract, picked freely from four: a
street gang, a talismonger cabal, a rival runner crew and a megacorp. Inside it the player may
hire lieutenants in order — a fixer, a quartermaster, a tactician — for scrip the army does not
get; each plays part of the seat with the rival's own policy. The rival hires its crew at the
same prices. Nothing carries from one match to the next.

## Rate-function spine

**Bucket: exponential, a geometric worker ladder per income node under a payback horizon;
the battle is coupled-state deterministic** (`incremental-math/…/rate-functions/exponential`,
`…/bifurcations#coupled-state-deterministic`). One scrip is one hustler-second. Each node —
the safehouse, and every district a crew owns — hires five on its own ladder: the first pays
back in 30 s, and two doublings later the fifth in 120 s. A reference crew owns one district
from 190 s, the first take the probe records, and spends half its income on the cheapest
hire while one pays back inside the horizon. A unit's value is the army-side spend at the 240 s mark over a 24-unit
reference army, and every floor, squat, research and unit price is a multiple of it. Every floor
climbs one price ladder, a tech floor at the next floor's price; the charter is a sink of eight
units of value, saved for like a floor once two stand. For fixed
compositions a fight is Lanchester's square law: a counter pairing hits for double and a
resisted one for half, and `k = dps/hp` is solved so an even ten-unit counter pairing resolves
in 20 s. Safehouse integrity is fifteen units' minute of
fire, and the turret is solved so seven units is the smallest siege that razes it.

**Where the closed form stops:** the joint choice of two seats (strategy-space integration),
fog of war, and control flipping between them.

The army's ramp closes as well: a walk of the reference crew as the policy plays it, saving
for floors and the charter ahead of hustlers and converting one unit of value per floor every 20 s, gives the landmarks.
Its army at the 240 s mark is smaller than the 24 units a unit's value is defined by.

**What measures the remainder:** `balance/arc-probe.ts` plays every contract under the
reference player (`balance/_game.ts`), which hires its lieutenants by the rival's rule and
runs the shipping policy in the player's seat, and prints each beat beside the spine's
landmarks. `balance/counter-probe.ts` measures whether reading the rival wins matches.

## The arc

| Beat | Recorded (contract 1) |
|---|---|
| The fixer hired | 0 s |
| The first training floor | 51 s |
| The first unit trained | 71 s |
| The first district taken | 116.5 s |
| The first clash | 129 s |
| The crew chartered | 228 s |
| The black clinic opens | 271 s |
| The first assault on their safehouse | 312 s |
| Their safehouse burns | 378.5 s |

Each match is a few minutes; the rival's income terms climb to parity by the megacorp.

## Growth ports

- **A converter input reserve.** A seat saving for a purchase must switch its floors off.
- **More districts, and paths between them,** so a squad's route is a decision.

## Engine fit

| Component | Engine primitive |
|---|---|
| hustler nodes, ley taps | `createProducerCategory`, one producer per node; a district's is `visible` while its seat owns it |
| tech floors | `createProducerCategory` converters, each at its kind's share of floor time, a phase-gated `registerTick` |
| plain floors | `createScalingPurchasable` on the tech floors' ladder |
| the bunks | `createResourceBag` with a reactive capacity |
| coffin squats | `createScalingPurchasable` |
| research | `createPurchasableCategory` with grants on `createModifierChain` chains |
| the prerequisite graph | gate predicates as `visible`; a tier-two entry's gate also requires the charter |
| the charter | `createPurchasableCategory` with a `createBooleanRequirement` on standing floors |
| a match's reset | `createReset` over the match context |
| the lieutenants | each seat's hires in `createPurchasableCategory`, unlocking `createAutomationTiers`; a switch each, `createThrottle` |
| every perturbable anchor | `createTuningRegistry`, `tunable` |

Three hand-rolls carry `TODO(expansion)` markers: the pairing table (`data/units.ts`), the
one-bunk-per-unit bag (`modules/side.ts`) and saving against a converter
(`modules/policy.ts`). The district fight is game code by the engine's design
(`modules/battle.ts`), and the rival and the lieutenants are one policy over personas.

## Balance model

The spine is `data/spine.ts`; `describeSpine` and `landmarks` print it at the head of the
arc probe. `BALANCING.md` covers the tunables and couplings.
