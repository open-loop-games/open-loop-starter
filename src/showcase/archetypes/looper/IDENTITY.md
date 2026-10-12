# Looper — archetype identity

> The loop game (`authored-policy` + `prestige` + `automation` + `game-speed`) over a
> `run-budget`, with `compounding-production`, `meta-progression`, `multiplier-stack`
> and `softcap` carrying what survives a run. The per-action duration and the parallel
> skill track have no pattern. A run is a rehearsal; the game is the diff between two
> runs.

Identity line source: `../_identity.md` (Looper entry); the line's player experience and
exemplar calls are `../_docs/looper.md`. **Core · open core.** The defining component,
per-action duration with a parallel skill track, has no research pattern, so this build
designs it (§ The defining component). Increlution, Idle Loops, Cavernous II and
Progress Knight 2 show the composition ships, as a set; none is a lift target.

## What this archetype is

*Lights Out.* Inmate 4471 relives the same night. At lights-out you write a plan — bend
a wire into a pick, pick the cell lock, slip the patrol, bribe the trustee, badge into
the yard, scale the wall, catch the milk truck, cross the woods, pick the rail-yard
padlock, board the freight — and the plan runs. Every second of the night costs
**Nerve**. When it breaks, you wake at lights-out again. What carries over is
**mastery**, the part of each skill's level the night taught it; **Intel**, which buys
longer nights, faster moves, a faster clock and two automation rungs; and what you
learned of the **patrol**.

The plan is the only decision. The night has two zones. The prison is re-run every
night: it is the toll on the way out, and the plan's job there is to get through it
faster. Past the wall, the second zone spends what the first produced. The truck takes
a pack of smokes and pays out Nerve, less the later you reach it. The rail-yard padlock
takes a second pick. So the prison plan has to make more than the prison needs, and every
second it saves inside is Nerve outside. The freight is the last landmark; after it,
every night ends on the train, and the game is the splits board.

## The defining component

- **Four skills** (Brawn, Stealth, Finesse, Guile). Every action carries a weight vector
  over them that sums to 1.
- **Duration** is base seconds ÷ speed, and speed is `Π skillMultᵂ` × the global stack.
  A move is fast only when every skill it leans on is. The geometric product makes the
  weak leg cost.
- **The parallel track:** while a move runs, each weighted skill gains xp equal to the
  work done times its weight. Skills train as a side effect of the plan, never as a
  separate choice.
- **Two tiers per skill:** *talent* is the in-night level, `1 + α·L`, reset each night.
  *Mastery* banks at the night's end, `ρ·L` to a knee and `√` past it. A skill's
  multiplier is talent × (1 + mastery).

## Rate-function spine

**Bucket: power-law** (`incremental-math/…/rate-functions/power-law.mdx`). Within a
night, work feeds its own rate through the square root of skill xp:

```
dW/dt = M·g·(1 + α·√(W / 4X))                 M = 1 + mastery, g = Grapevine
t(W)  = (2/b)·[ √W − (a/b)·ln(1 + (b/a)·√W) ]  a = M·g,  b = a·α / (2√X)
```

The first passage `t(W)` closes in elementary form; its inverse, work by a given second,
is the Lambert-W frontier (`…/log-frontier.mdx`). Across nights the spine composes under
`…/composition.mdx`: mastery is a **piecewise splice** at the knee, and mastery ×
Grapevine is a **modifier product** on the night's rate. Two terms couple the zones:

```
ride(t_wall)  = R · max(0, 1 − t_wall / T_truck)     budget past the wall falls with the wall's split
slip(level)   = slip₀ · (1 − s · min(level, cap))    the prison toll falls with the patrol learned
```

The ride makes zone 2's budget a function of zone 1's first passage, so a prison gain
pays twice. The patrol discount is a per-segment track beside mastery, as Idle Loops'
Old Shortcut is.

**The spine generates the route.** `data/spine.ts` predicts the arc night by night under
a reference plan (`REFERENCE_ROUTE`), then sizes each gate so the route through landmark
d sits at a set position between the predicted capacity of the night before and of its
own night. No gate duration is authored. The prison is sized first; zone 2 depends on
when the wall falls, so it is sized from a second prediction.

**Where the closed form stops: the plan.** The reference plan spreads work evenly over
four skills. A real plan leans on the route's skills, and past the wall the long gates
lean on Brawn and Stealth. `balance/arc-probe.ts` measures the shipping game against
the prediction: work per night, and the wall, ride, rail-yard and freight splits.

## The arc

| Beat | Night | Recorded at |
|---|---|---|
| Out of the cell | 1 | 25s |
| First note (Steel Nerves) | after 2 | 150s |
| Into the laundry | 3 | 244s |
| Into the yard; Routine takes the restart | 5 | 485s, 500s |
| Over the wall; Discipline takes the turn-in | 8 | 922s, 929s |
| Into the rail yard | 13 | 1846s |
| On the freight | 17 | 2772s |

The wall falls at 138s on night 8 and under 50s by night 20, and the truck's refill
grows from 7 to 40 Nerve as it does. `manifest.ts` holds the recorded beats.

## Growth ports

- **A second route.** A different way to the freight that leans on other skills, so the
  plan chooses a route as well as an order. The spine would then track each skill.
- **Ground that mastery grows.** Refills and supplies whose per-night limits rise with a
  skill, so training changes what the night can carry.
- **A third zone.** The same coupling again: a budget past the freight priced by the
  freight's split.

## Engine fit

| Component | Engine primitive |
|---|---|
| the plan and its executor | `createActionCategory` in list mode, `canStart`, per-action rate chains |
| talent and mastery | two `createSkillCategory`s: level-driven, and accumulator with `retentionFormula` |
| the night and its reset | `createCycle` (`endCondition`, `resetPersistentContexts`), `createCycleLog` |
| ground | `createZoneSystem` |
| notes, Grapevine | `createPurchasableCategory` with `grants` onto a shared `createModifierChain` |
| Routine, Discipline | `createAutomationTiers`, pure policies in `modules/automation.ts` |
| game speed | `TickDriver.speedMultiplier` |

Hand-rolls carry `TODO(expansion)` markers in `modules/night.ts`: the run budget, the
weighted speed product, one xp stream into two skill tiers, the lowest-wins best splits,
and plan repeat counts.

## Balance model

The spine is `data/spine.ts`, printed by `balance/looper-projection.ts`, which also
checks that every landmark lands on its night. `balance/arc-probe.ts` plays the shipping
game for N nights, with the player's openers in `balance/_engine.ts`. `BALANCING.md`
covers the knobs and couplings.
