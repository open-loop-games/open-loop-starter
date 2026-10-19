# Skirmish — archetype identity

> Workers fund an army: `producer` hustlers and ley taps feed `converter` training floors,
> gated by a `prerequisite-graph` and capped by `storage-capacity`, whose units meet through
> `type-effectiveness`. Over it, three components no pattern names: real time, direct command
> of squads by district, and a match won by burning the rival's base.

Genre: `rts`. Its document in the studio's research library lists the games in it.

## What this archetype is

*Chrome & Cantrip.* The ley lines have woken under a rain-soaked sprawl, and two crews fight
over three of its districts. Hustlers bring home scrip, ley taps draw aether. Four training
floors turn both into Razorboys, Hexers, Riggers and Enforcers, while their switch is on and
the bunks have room; coffin squats add bunks. Research sits behind the floors it needs.

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

**Bucket: exponential, a geometric worker ladder under a payback horizon; the battle is
coupled-state deterministic** (`incremental-math/…/rate-functions/exponential`,
`…/bifurcations#coupled-state-deterministic`). One scrip is one hustler-second, and the
first hustler pays back in 30 s; the ratio gives three doublings across 24 purchases. A
reference crew walks the ladder, spending half its income on hustlers while one pays back
inside the horizon. A unit's value is the army-side spend at the 240 s mark over a 24-unit
reference army, and every floor, squat, research and unit price is a multiple of it. For
fixed compositions a fight is Lanchester's square law: `k = dps/hp` is solved so an even
ten-unit counter pairing resolves in 20 s. Safehouse integrity is fifteen units' minute of
fire, and the turret is solved so seven units is the smallest siege that razes it.

**Where the closed form stops:** the joint choice of two seats (strategy-space integration),
fog of war, and control flipping between them.

**What measures the remainder:** `balance/arc-probe.ts` plays every contract under the
reference player (`balance/_game.ts`), which hires its lieutenants by the rival's rule and
runs the shipping policy in the player's seat, and prints each beat beside the spine's
landmarks.

## The arc

| Beat | Recorded (contract 1) |
|---|---|
| The fixer hired | 0 s |
| The first training floor | 112 s |
| The first unit trained | 132 s |
| The first district held | 177.5 s |
| The first clash | 201 s |
| The first assault on their safehouse | 321.5 s |
| Their safehouse burns | 383 s |

Each match is a few minutes; the rival's income terms climb to parity by the megacorp.

## Growth ports

- **Per-type supply weight.** An Enforcer worth 2.5 units should cost more than one bunk.
- **A converter input reserve.** A seat saving for a purchase must switch its floors off.
- **More districts, and paths between them,** so a squad's route is a decision.

## Engine fit

| Component | Engine primitive |
|---|---|
| hustlers, ley taps, turf | `createProducerCategory`, turf as `extraCount` |
| training floors | `createProducerCategory` converters, a phase-gated `registerTick` |
| the bunks | `createResourceBag` with a reactive capacity |
| coffin squats | `createScalingPurchasable` |
| research | `createPurchasableCategory` with grants on `createModifierChain` chains |
| the prerequisite graph | gate predicates as `visible` |
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
