# Explorer — archetype identity

> Zone as gameplay — a map whose uncovering is the content — over `converter` +
> `producer` + `statistics`, with `storage-capacity` and `upkeep` forcing the return to
> base, `loss-on-failure` on the expedition out, and an `ending`. Nothing resets and
> nothing compresses: the reward is territory.

Genre: `incremental`, whose document in the studio's research library lists the games in
it. The defining component, zone as gameplay, has no research pattern, so this build
designs it (§ The defining component). A Dark Room, Level13, Candy Box and Candy Box 2
show the research composition ships, as a set; none is a lift target.

## What this archetype is

*Spoor.* You are the last huntsman of a lodge at the edge of the Hartwold, a fogged
forest said to hold the Pale Hart. You walk the wold one tile at a time on jerky and
water. Jerky comes from the lodge's smoke racks; water is free, but only at the lodge
well, springs, the river and the Fen's meres, and the skin holds fewer steps than the
satchel. So the water decides the path. You hunt what you find and carry it home: the
pack banks only at the lodge, and the ground you chart stays in your notes until you
reach the lodge or a camp. A mauling, or an empty satchel or skin away from help, loses
the haul and the notes.

The lodge turns hides into gear that reaches further: a bow, a pack frame, a satchel, a
waterskin, and terrain gear for each band past the forest. A den in the forest, the Fen
and the Snowfield holds one beast worth the next band's bow, and each one's trophy
changes the ground. The Old Tusker's mattock digs a well at every camp. The Mere Wolf's
coracle opens the meres as water to cross. The White Bear's sledge lets any camp bank
the pack. After a stay of deepwood kills the Hart's trail opens, and taking the Hart is
the ending.

## The defining component

**The tether, in two supplies.** The chart starts black except for the ground around the
lodge. Every charted tile the huntsman can walk to *and still get back from* is lit:

```
here(tile) + home(tile)     ≤ jerky carried      home: the lodge or a camp
hereW(tile) + water(tile)   ≤ water carried      water: the nearest source
```

- Each term is a `SpatialGrid.distanceField` call: jerky or water per tile, from the
  huntsman, from the restock points, from every known water source.
- A dashed tallow contour, the last light, fences the lit ground. Ground past it dims;
  ground whose terrain needs gear he lacks is hatched.
- The contour shrinks with every step and every hunt. It jumps outward at a spring, a
  camp or a satchel, and narrows hardest over the frozen Snowfield and the dry Deepwood.

**The chart is escrowed.** New ground goes into the trip's notes, drawn in a sepia wash.
The notes bank at the lodge or a camp; a fall loses them, and the lookouts used with
them. A push into the frontier risks what it found as well as what it hunted.

Uncovering is the content because of what surrounds the tether:
- **Bands by depth.** Each band's quarry pays G× the band before, and bands past the
  forest need terrain gear, so the map is the progression ladder.
- **Water geography.** The river runs down the west, the Fen drinks from its meres, the
  Snowfield's water is frozen and the Deepwood is dry, so routes differ by side.
- **Trophies.** A den falls to the next band's bow; taking it early is a risk that pays
  in the ground.
- **Finite features.** Lookouts chart a wide radius once, and caches pay once. Herds
  regrow on a per-band clock; dens never do.

## Rate-function spine

**Bucket: exponential, geometric** (`incremental-math/…/rate-functions/exponential.mdx`).
Band k's quarry yields `Y₀·Gᵏ`. The spine's unit is the **reference trip**: walk to the
middle of band k, hunt four times, walk back to where the haul banks.

```
walk(k)       = 2·(4k + 2) − coracle(k)         or 2·3 from the camp, with the sledge
refills(k)    = ⌈(2·walk(k) + 4) / skin(k)⌉ − 1
trip(k)       = walk(k) + 2·refills(k)·detour(k)   detour capped at 1 with the mattock
hideRate(k)   = 4 · hit(k) · yieldHide(k) · yieldMult(k) / tripSeconds(k)
hideBudget(k) = hideRate(k) · stay(k) · field(k)
hit(L)        = s / (s + ¼),  s = 1.08ᴸ
```

Across bands the spine composes under `…/rate-functions/composition.mdx`: a **piecewise
splice**, one constant-rate regime per band, and a **modifier product**, Huntcraft ×
the bestiary. Huntcraft and the hit chance feed each other, so the spine solves them
band by band. Each trophy is a regime change: the reference policy takes a den as the
next band opens, and its trophy changes every trip from that band on. The meadow is the
opening: it lasts until the first camp and the second rack are paid from the opening's
wood, net of what smoking burns. Every price derives from the budget of the stay it is
bought from.

**Where the closed form stops: the walk.** The reference trip assumes quarry waits at the
band's middle, water lies a fixed detour off the route, and jerky is on the shelf. On
the map, herds are scattered in threes, early trips run on entry gear, shallower quarry
lies on the way, and the walker waits on the racks. `FIELD_FACTOR` in `data/spine.ts`
carries that remainder, measured, not projected: `balance/field-probe.ts` solves it over
seeds against each band's scheduled stay, and `balance/arc-probe.ts` prints where each
stay went.

## The arc

| Beat | Predicted | Recorded |
|---|---|---|
| First lodge purchase | 119s | 107–109s |
| The forest kit: first camp | 294s | 347–443s |
| Into the Fen | 671s | 692–816s |
| The Old Tusker: the mattock | 671s | 873–915s |
| The Mere Wolf: the coracle | 1047s | 947–1055s |
| Onto the Snowfield | 1047s | 1075–1237s |
| The White Bear: the sledge | 1424s | 1304–1403s |
| Under the Deepwood | 1424s | 1426–1516s |
| The Pale Hart | 1800s | 1784–1987s |

The ranges are the probe's default seeds; the map is fixed and the seed drives the hunt
rolls. `manifest.ts` holds the recorded beats.

## Growth ports

- **A second wold.** Past the Hart, a passage built from the first map's output opens a
  new map whose first band needs what the first one built. The ladder extends without a
  reset.
- **Encounters on the move.** A roll on each step through uncharted ground, so the same
  route plays differently.
- **Camps earned on the map.** A waystone cleared of its beast before a camp can stand,
  so reach follows prowess as well as wood.

## Engine fit

| Component | Engine primitive |
|---|---|
| the chart, the notes, the tether, routing | `createSpatialGrid`: explored mask, FOV, `distanceField`, `bfs` |
| terrain sighted | `createZoneSystem` |
| woodcutters, snare lines | `createProducerCategory` |
| smoke racks | `createScalingPurchasable` for the count; a producer with `inputs` (meat, wood) smokes |
| the outfitter | `createPurchasableCategory` with cost requirements |
| the pack | `createResourceBag` with a capacity getter and `discard` overflow |
| Huntcraft, prowess, yield | `createSkill`, `createModifierChain` |
| bestiary, Wayfinder | `createAchievementCategory` with `grants` |
| the walk and the hunt | `createTimedProgress` |

## Balance model

The spine is `data/spine.ts`, printed by `balance/explorer-projection.ts`.
`balance/arc-probe.ts` plays the shipping game to the Hart under a greedy walker, one run
per seed, with the walker in `balance/_engine.ts`; `balance/field-probe.ts` re-solves the
field factor. `BALANCING.md` covers the knobs and couplings.
