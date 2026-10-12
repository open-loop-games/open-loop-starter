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
a wire into a pick, pick the cell lock, swipe the guard's coffee, slip the patrol, bribe
the trustee, badge into the yard, cut the fence, scale the wall — and the plan runs.
Every second of the night costs **Nerve**. When it breaks, you wake at lights-out again.
What carries over is **mastery**, the part of each skill's level the night taught it,
and **Intel**, which buys longer nights, faster moves, a faster clock and two automation
rungs.

The plan is the only decision. Between nights you read the skills, the splits and the
log, and rewrite the plan for what night N+1 can reach that night N could not. The first
escape is designed for night eight. After it, every night ends on the wall, and the game
becomes the splits board: tonight's time to each landmark against last night's and your
best.

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
Grapevine is a **modifier product** on the night's rate.

**The spine generates the route.** `data/spine.ts` integrates the arc night by night
under a reference policy, then sizes each gate so the route through landmark d fills a
set share of the capacity of the night it is scheduled for. No gate duration is authored.

**Where the closed form stops: the plan.** The reference policy spreads work evenly over
four skills and takes every refill on known ground. A real plan leans on the route's
skills and may skip moves, so the speed product drifts from the even split.
`balance/arc-probe.ts` measures the shipping game against the prediction: work per night
before the first escape, and escape time after it.

## The arc

| Beat | Night | Recorded at |
|---|---|---|
| Out of the cell | 1 | 25s |
| First note (Steel Nerves) | after 2 | 150s |
| Into the laundry | 3 | 242s |
| Into the yard; Routine takes the restart | 5 | 483s, 500s |
| Over the wall; Discipline takes the turn-in | 8 | 920s |

Nights run 60s at first and about 130–145s by the yard. After the first escape the
night shortens: 136s on night 8, about 80s by night 14. `manifest.ts` holds the recorded
beats.

## Growth ports

- **A second route.** A different way over the wall that leans on other skills, so the
  plan chooses a route as well as an order.
- **Ground that mastery grows.** Refills and supplies whose per-night limits rise with a
  skill, so training changes what the night can carry.
- **A layer above nights.** A second reset that compresses the night layer.

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

The spine is `data/spine.ts`, printed by `balance/looper-projection.ts`.
`balance/arc-probe.ts` plays the shipping game for N nights, with the player's openers
in `balance/_engine.ts`. `BALANCING.md` covers the knobs and couplings.
