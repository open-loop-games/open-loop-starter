# Tug — archetype identity

> The shared lane — two economies feeding one contested path — which no pattern names, over
> `scaled-opposition` + `positional-effect` + `loss-on-failure` + `ending`, with
> `meta-progression` carrying a career across matches, as Warfare 1917 carries them. You
> author pressure against an opponent authoring pressure in the same space; what you earn
> outlasts the match.

Genre: lane push, which has no genre document in the studio's research library. Warfare
1917 and Minion Masters show the research composition ships; Age of War, Legion TD 2 and
Direct Strike are the lane-push crosses. None is a lift target.

## What this archetype is

*Hold the Causeway.* Fairhold and a neighbouring lord's keep face each other across a
causeway one road wide. Both harvests pay silver at a flat rate, whatever the causeway does.
Silver raises squads into the bailey: five Stout Yeomen, three Bowmen of the Shire, two
Knights, and from the second minute one mangonel. The bailey empties at its keep's horn, in
ranks three files wide. Both keeps sound the opening horn together; after it the horns
alternate, and a keep may sound early for a fee to answer a wave at once. Yeomen stop
knights, knights ride past the line to the bowmen, bowmen shoot yeomen. A defender stands
stiffer the deeper it is pushed into its own half, so the line sways about the middle. A
mangonel is brought up through its own ranks and throws at the gate from sixty paces: a
line held past the middle is what scores. Each keep's walls mount a trebuchet or fire-pots.
In the season's last week harvests and musters surge; when it closes, the keep whose gate
lost more yields.

The march is fifteen fields, three for each of five lords: two outlying holdings, then the
lord's keep, where his champions ride out. A field sets which troops either side may raise,
the fords and stakes on the road, and the lord's purse; Grubb's Ford is yeomen against
yeomen. Camp draws one twist a battle: rain, fog, flood, a feast, camp fever or frost. Each
lord's herald boasts in his own voice; Fairhold's chronicler glosses it in ours. Every
battle pays renown into the Chronicle, whose volumes buy Boons of the Crown. Taking the
Usurper's throne is the ending. After it his heirs keep coming, and camp opens skirmishes:
any field, twist and lord, for no renown.

## Rate-function spine

**Bucket: adversarial zero-sum lane over flat income, a frontage-limited Lanchester clash**
([rate functions](https://open-loop-games.github.io/incremental-math/rate-functions/); strategy-space integration for the battle, closed
form per clash). Income is flat; ground pays nothing. A clash loses members at (fighters in
reach) × dps / hp, three files times the ranks a member's reach covers: melee fights by the
linear law, a bow wave by the square law. Equal value per silver at one release's budget sets
each member's hp × dps; duel times are short enough that losses at a held line spend about a
whole harvest. Cover at the gate outlasts any advantage the march hands out, so engines'
throw, not strength, carries a line to a gate. The lords grow in vigor by a share of a boon
level a field.

**Where the closed form stops:**
- *where the clash happens.* The line is the sum of releases, cover, the field's bands and
  both commanders' choices.
- *the close.* Whether engines breach before the season closes, and by what margin.
- *the rival's choices.* Each wave is drawn from its temperament, its spend profile and the
  answer to the last wave seen.
- *the career.* How many battles a field takes is the battle's outcome distribution.

**What measures the remainder:** `clash-probe.ts` fights the spine's clashes on the real
causeway; `front-probe.ts` and `end-probe.ts` play temperament pairings at equal income for
the sway and the close; `career-probe.ts` plays the march under the reference marshal
(`balance/_marshal.ts`), which runs the rival's own decision function.

## The arc

| Beat | Recorded |
|---|---|
| The opening horn: Fairhold tithes, and the Mire's yeomen pin the line | 0:22 |
| The engineers arrive: the first mangonel | 2:10 |
| Grubb's Ford falls: the first victory | 3:13 |
| The bowmen take the field at the Mudhole | 16:07 |
| Fire-pots on the walls | 35:21 |
| Lady Vesk, who answers every horn | 47:26 |
| The Stolen Throne falls: the ending | 1:58:39, 35 battles |

A battle runs 3–4½ minutes. Over eight seeds the marshal takes the Stolen Throne between
1:22 and 2:05, in 24–37 battles: outlying fields in one to five, keeps in one to eight.
`manifest.ts` holds the recorded beats.

## Growth ports

- **A captain.** Player automation that raises each wave, fires the walls and sounds early to
  a rule the player writes, behind an automation tier; the rival's decision functions are
  already the shape.
- **Formations.** A wave's rank order as a choice — knights ahead for a charge, a pike
  hedge for a hold — instead of the fixed order.
- **Reading their bailey.** A spyglass boon that shows the lord's waiting squads before his
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
| the toss, the twist, the herald's lines, each wave's draw | `random`, `weightedPick` |

Two hand-rolls carry `TODO(expansion)` markers: the causeway's lane occupancy
(`modules/causeway.ts`) and the two keeps as one per-side factory (`modules/keep.ts`). The
battle that waits in camp is game code by the engine's design (`modules/battle.ts`), and
the temperaments follow the consumer guide's persona-roster composition.

## Balance model

The spine is `data/spine.ts`; `balance/tug-projection.ts` runs it, with the member table,
the clashes it predicts, the gate and the throw, the season, the tithe and the march. The
probes play the shipping game and print beside it. `BALANCING.md` covers the tunables and
couplings.
