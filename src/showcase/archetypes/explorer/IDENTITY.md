# Explorer — archetype identity

> Zone as gameplay — a map whose uncovering is the content — over `converter` +
> `producer` + `statistics`, with `storage-capacity` and `upkeep` forcing the return to
> base, `loss-on-failure` on the expedition out, and an `ending`. Nothing resets and
> nothing compresses: the reward is territory.

Identity line source: `../_identity.md` (Explorer entry); the line's player experience
and exemplar calls are `../_docs/explorer.md`. **Core · open core.** The defining
component, zone as gameplay, has no research pattern, so this build designs it (§ The
defining component). A Dark Room, Level13, Candy Box and Candy Box 2 show the
composition ships, as a set; none is a lift target.

## What this archetype is

*Spoor.* You are the last huntsman of a lodge at the edge of the Hartwold, a fogged
forest said to hold the Pale Hart. You walk the wold one tile at a time, eating jerky as
you go. You hunt what you find and carry the haul home, because the pack banks only at
the lodge. A mauling, or an empty satchel anywhere but a restock point, loses the haul.
The lodge turns what you bring into gear that reaches further: a bow, a pack frame, a
satchel, and one piece of terrain gear for each band past the forest. Smoke racks turn
meat and wood into the jerky that pays for every step. Camps on the waystones restock
the satchel and extend reach, but never bank. After a stay of deepwood kills the Hart's
trail opens, and taking the Hart is the ending.

## The defining component

**The tether.** The chart starts black except for the ground around the lodge. Every
charted tile the huntsman can walk to *and still get home from* is lit:

```
here(tile) + home(tile) ≤ jerky carried
```

- `here` and `home` are two `SpatialGrid.distanceField` calls in jerky per tile, one
  from the huntsman and one from the lodge and every camp.
- A dashed tallow contour, the last light, fences the lit ground. Charted ground past it
  dims, and ground whose terrain needs gear he lacks is hatched.
- The contour shrinks with every step and every hunt. It jumps outward when a camp is
  raised or a satchel bought.

Uncovering is the content because of what surrounds the tether:
- **Bands by depth.** Terrain bands follow a jittered depth from the lodge. Each band's
  quarry pays G× the band before. Bands past the forest need terrain gear, so the map is
  the progression ladder.
- **Two reach levers.** Carry more (a satchel, paid in hides) or restock nearer (a camp,
  paid in wood). One spends what hunting earns, the other what the lodge earns.
- **Escrow you walk home.** A deep, full pack is a long and exposed walk back.
- **Finite features.** Lookouts chart a wide radius once, and caches pay once. Herds
  regrow on a per-band clock, so far herds stay worth the walk.

## Rate-function spine

**Bucket: exponential, geometric** (`incremental-math/…/rate-functions/exponential.mdx`).
Band k's quarry yields `Y₀·Gᵏ`. The spine's unit is the **reference trip**: walk to the
middle of band k, hunt four times, walk home and bank.

```
tripSeconds(k) = 2·(4k + 2)·stepSeconds + 4·huntSeconds        linear in k
hideRate(k)    = 4 · hit(k) · yieldHide(k) · yieldMult(k) / tripSeconds(k)
hideBudget(k)  = hideRate(k) · stay(k) · field(k)
hit(L)         = s / (s + ¼),  s = 1.08ᴸ                          bow matched to the band
```

Across bands the spine composes under `…/rate-functions/composition.mdx`:
- a **piecewise splice**, one constant-rate regime per band;
- a **modifier product**, Huntcraft at the band's middle × the bestiary bonus.

Huntcraft and the hit chance feed each other, so the spine solves them band by band from
the kills before. The meadow is the opening: it lasts until the forest kit — the first
camp and the second rack — is paid for from the opening's wood, net of what smoking
burns. Every price derives from the budget of the stay it is bought from. Terrain gear
for band k costs a share of band k−1's hide budget, and so do the bow, frame and satchel
levels. The pack fits one trip's haul, and racks smoke the band's jerky demand.

**Where the closed form stops: the walk.** The reference trip assumes quarry waits at the
band's middle and jerky is on the shelf. On the map, herds are scattered in threes, early
trips run on the gear the band was entered with, shallower quarry lies on the way, and
the walker waits on the racks. `FIELD_FACTOR` in `data/spine.ts` carries that remainder:
the factor that turns a band's stay into seconds of reference-trip earning. It is
measured, not projected: `balance/field-probe.ts` solves it over seeds against each
band's scheduled stay, and `balance/arc-probe.ts` prints where each stay went — walking,
charting, hunting and waiting.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| First lodge purchase | 125s | 110–116s |
| The forest kit: first camp | 309s | 282–365s |
| Into the Fen | 682s | 563–578s |
| Onto the Snowfield | 1055s | 1030–1061s |
| Under the Deepwood | 1427s | 1396–1428s |
| The Pale Hart | 1800s | 1781–1842s |

The ranges are the probe's default seeds; the map is fixed and the seed drives the hunt
rolls. `manifest.ts` holds the recorded beats.

## Growth ports

- **Found gear.** Items in caches that change reach rather than pay stores: a spyglass
  that widens sight, a canteen that halves jerky per tile.
- **Ground that pushes back.** Weather or night that narrows the tether on a clock, so
  the same trip is long or short depending on when it leaves.
- **A second wold.** Past the Hart, a new map whose first band needs what the first map
  built. It extends the ladder without a reset.

## Engine fit

| Component | Engine primitive |
|---|---|
| the chart, the tether, routing | `createSpatialGrid`: explored mask, FOV, `distanceField`, `bfs` |
| terrain sighted | `createZoneSystem` |
| woodcutters, snare lines | `createProducerCategory` |
| smoke racks | `createScalingPurchasable` |
| the outfitter | `createPurchasableCategory` with cost requirements |
| the pack | `createResourceBag` with a capacity getter and `discard` overflow |
| Huntcraft, prowess, yield | `createSkill`, `createModifierChain` |
| bestiary, Wayfinder | `createAchievementCategory` with `grants` |
| the walk and the hunt | `createTimedProgress` |

The rack's smoking is a hand-roll with a `TODO(expansion)` marker in `modules/lodge.ts`:
a continuous converter whose throughput is the minimum its inputs can feed.

## Balance model

The spine is `data/spine.ts`, printed by `balance/explorer-projection.ts`.
`balance/arc-probe.ts` plays the shipping game to the Hart under a greedy walker, one run
per seed, with the walker in `balance/_engine.ts`; `balance/field-probe.ts` re-solves the
field factor. `BALANCING.md` covers the knobs and
couplings.
