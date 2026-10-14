# Tug — archetype identity

> The shared lane — two economies feeding one contested path — which no pattern names, over
> `scaled-opposition` + `positional-effect` + `loss-on-failure` + `ending`, with
> `meta-progression` carrying a career across matches, as Warfare 1917 carries them. You
> author pressure against an opponent authoring pressure in the same space; what you earn
> outlasts the match.

Identity line source: `../_identity.md` (Tug entry); the line's player experience and
exemplar calls are `../_docs/tug.md`. **Core · open core.** Warfare 1917 and Minion Masters
show the composition ships; Age of War, Legion TD 2 and Direct Strike are the lane-push
crosses. None is a lift target.

## What this archetype is

*Hold the Causeway.* Fairhold and a neighbouring lord's keep face each other across a
causeway one road wide. Both harvests pay silver at a flat rate, whatever the causeway does.
Silver raises squads into the bailey: five Stout Yeomen, three Bowmen of the Shire, two
Knights, and from the second minute one mangonel. The bailey empties when its keep's horn
sounds, and the wave marches out in ranks three files wide: yeomen in front, knights, bowmen,
engines last. Both keeps sound the opening horn together; after it the horns alternate every
five seconds, so each keep answers the wave the other just sent. Yeomen stop knights, knights
ride past the line to the bowmen, bowmen shoot yeomen. A defender stands stiffer the deeper
it is pushed into its own half, so the line sways about the middle rather than running home.
Only a mangonel ignores the ramparts and batters a gate hard; the last week of the campaign
season hardens every blow until a line breaks. Raiders at a gate loot the treasury.

Each lord's herald boasts in the lord's own voice; Fairhold's chronicler glosses it in ours.
Every battle, won or lost, pays renown into the Chronicle, whose volumes buy Boons of the
Crown: more harvest, drilled levies, a stone curtain, and the Charter of the Longbow. Five
lords stand on the ladder; taking the Usurper's keep is the ending, and his heirs keep coming.

## Rate-function spine

**Bucket: adversarial zero-sum lane over flat income, a frontage-limited Lanchester clash**
(`incremental-math/…/rate-functions/`; strategy-space integration for the battle, closed
form per clash). Income is flat, r₀ per keep times the tithe ladder; ground pays nothing, so
being pushed back costs no income. A clash loses members at (fighters in reach) × dps / hp,
where fighters in reach are three files times the ranks a member's reach covers. Melee
strikes from its front rank and fights by the linear law; a bow wave fights whole, by the
square law. Equal value per silver at one release's budget sets each member's hp × dps, and
the role's duel time splits it; the yeoman's display hp fixes the constant. Counters
multiply damage by 1.6 and take its inverse. The gate falls to two mangonels in 24 seconds.
The rival's harvest grows by one boon level a rung, so a boon a rung keeps pace.

**Where the closed form stops:**
- *where the clash happens.* The line is the sum of releases, the ramp of cover and both
  commanders' choices; a clash's position decides its cover.
- *the walk-up.* Ranks reach the front over time; the spine reads a clash in the open.
- *the rival's choices.* Each wave is drawn from its temperament and the answer to the last
  wave seen.
- *the career.* How many battles a rung takes is the battle's outcome distribution.

**What measures the remainder:** `clash-probe.ts` fights the spine's clashes on the real
causeway; `front-probe.ts` plays temperament pairings at equal income for where the line
stands, how often it crosses and recovers, side symmetry and battle length; `career-probe.ts`
plays the ladder under the reference marshal (`balance/_marshal.ts`), which runs the rival's
own decision function.

## The arc

| Beat | Recorded |
|---|---|
| The opening horn: the lines meet at the middle | 0:20 |
| The engineers arrive: the first mangonel | 2:00 |
| The Charter of the Longbow | 15:10 |
| Lord Grubb's gate falls: the first victory | 19:26 |
| Lady Vesk, who answers every horn | 31:14 |
| The Stolen Throne falls: the ending | 59:57, 12 battles |

A battle runs 4–7 minutes. Over three seeds the marshal takes the Usurper's keep between
1:00 and 1:18, in 12–16 battles. Play goes on after the ending against the Usurper's heirs.
`manifest.ts` holds the recorded beats.

## Growth ports

- **A captain.** Player automation that raises each wave to a rule the player writes, behind
  an automation tier; the rival's decision function is already the shape.
- **Formations.** A wave's rank order as a choice — knights ahead for a charge, a pike
  hedge for a hold — instead of the fixed order.
- **Reading their bailey.** A spyglass boon that shows the lord's waiting squads before its
  horn, trading the second keep's information edge for a price.

## Engine fit

| Component | Engine primitive |
|---|---|
| silver, renown's boon points | `createResource` |
| troops, the tithe, boons | `createPurchasableCategory`, `Formula.exponential` for the tithe |
| the Chronicle's volumes | `createSkill` |
| each keep's harvest, troops and gate | `createModifierChain`, boons and the rung bound in |
| a battle's reset | `createReset` over both keeps and the causeway |
| every perturbable anchor | `createTuningRegistry`, `tunable` |
| the toss, the herald's lines, each wave's draw | `random`, `weightedPick` |

Two hand-rolls carry `TODO(expansion)` markers: the causeway's lane occupancy
(`modules/causeway.ts`) and the two keeps as one per-side factory (`modules/keep.ts`). The
battle that waits in camp is game code by the engine's design (`modules/battle.ts`), and
the temperaments follow the consumer guide's persona-roster composition.

## Balance model

The spine is `data/spine.ts`; `balance/tug-projection.ts` runs it, with the member table,
the clashes it predicts, the gate, the tithe and the Chronicle's ladder. The probes play the
shipping game and print beside it. `BALANCING.md` covers the tunables and couplings.
