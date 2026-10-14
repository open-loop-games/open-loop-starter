# Scripter — archetype identity

> `authored-policy` as the whole player verb — the player writes the rule the executor
> follows — over the automation ladder (`statistics` + `automation` + `prestige` +
> `escalating-price`), `compounding-production` and `producer` beneath it, a
> `prerequisite-graph` opening the command vocabulary, `meta-progression` and `softcap`
> above. The artifact is the policy; the scaling axis is its quality.

Identity line source: `../_identity.md` (Scripter entry); the line's player experience and
exemplar calls are `../_docs/scripter.md`. **Core · covered.** Bitburner, Cavernous II and
Points Progression show the composition ships, as a set; none is a lift target.

## What this archetype is

*Inkfist Dojo.* You are an old master who can no longer fight. You write kata, scrolls of
moves, and your student performs them one line per beat, top to bottom and round again.
Between bouts a strike trains and banks Ki; students meditate more of it; Ki buys
students, senpai, Temper, and the techniques that teach the scroll new words. You never
press "strike". The scroll is the only verb.

Challengers come to the gate as the dojo grows, and a bout cannot be refused. Each has a
pattern the scroll in hand handles badly: a hide the fist cannot pierce, a guard only a
flurry breaks, a wind-up that needs a parry, a shell that opens for three beats, guards
that swap high and low, a mirror that answers any repeated form, three attackers at once.
The arrival puts the answering technique on the shelf, so the problem is seen before the
word that solves it is bought. A win pays more the faster it comes, against the reference
scroll's pace, so a slow scroll earns less than training would have.

The language grows with the challengers: lines, then tests (`if`, `when`), repetition,
rotation (`alternate`), and at the Envoy's Gauntlet, blocks that name the challenger
(`if foe is ma:` … `else:`). Until then the rack of saved scrolls and the gate's
announcement of the next visitor are dispatch by hand; the blocks automate it.

**Graduation** sends the student on pilgrimage: the dojo resets, Insight banks and buys the
old master's scrolls, and the scroll and the rack survive. A student who cannot read the
old scroll falls back to the first one, unless Remembered Forms keeps the words.

## Rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`). The
n-th student costs c·mⁿ with m = 2^(1/5), and every student meditates the same rate under
a multiplier stack (Dan over lifetime Insight, Ancestral Breath, standing per challenger
beaten). A training strike banks (1 + Temper) seconds of that income per beat.

**Where the closed form stops:**
- *the cascade and the strike.* Senpai train students and Temper doubles in price per
  level; the walk integrates them a second at a time.
- *the bouts.* A bout's length in beats is the scroll against the pattern, discrete and
  seeded. Challenger health is counted in blows of the fist, so length does not depend on
  Temper, except for Ox-Hide Ren's hide.
- *the schedule.* Arrival gates, answer prices and the graduation threshold are what the
  reference walk has earned at their slots, recorded in one pass.

**What measures the remainder:** `bout-probe.ts` fights 300 seeded bouts per challenger and
records the reference scroll's median as `PAR`; `arc-probe.ts` plays the shipping game
under the reference sensei against the walk.

## The arc

| Beat | Walk | Recorded |
|---|---|---|
| The Straw Post bows | 1m16s | 1m29s |
| Ox-Hide Ren beaten | 12m05s | 12m35s |
| First graduation | 30m00s | 31m49s |
| Brother Gang parried | 41m18s | 37m30s |
| Iron-Shell Ma beaten | 56m27s | 51m49s |
| Master Lu beaten | 1h27m55s | 1h27m58s |
| The Envoy's Gauntlet, the end beat | 2h02m21s | 2h02m22s |

A challenger arrives every 10–15 minutes from Old Bao on; graduations come every 6–14
minutes after the first. `manifest.ts` holds the recorded beats. Play goes on past the
Gauntlet, the beaten challengers returning in rotation.

## Growth ports

- **Restricted bouts.** A challenger fought under a banned word or a shorter scroll for a
  permanent reward, so the scroll's economy of words is graded.
- **A second scroll.** A senior student who performs their own kata at the gate, so the
  rack holds a scroll per performer.
- **Stillness.** A technique that steps the scroll a beat at a time against a sparring
  challenger, as a debugger.

## Engine fit

| Component | Engine primitive |
|---|---|
| Ki, trained students, Insight | `createResource` |
| students and senpai | `createProducerCategory` (`continuous`), the senpai cascade by `extraCount` |
| Temper | `createScalingPurchasable` |
| techniques | `createPurchasableCategory`, prerequisites as `active` Gates |
| the old master's scrolls | `createPurchasableCategory` with `Formula.exponential` costs and a `Grant` |
| the scroll's executor | `createSequencer` in list mode; tests as its tri-state `canStart`, driven by the module's beat clock |
| the student's hand | `createAutomationTiers` |
| graduation | `createReset` with a `retain` for Remembered Forms |
| Dan, standing | `createModifierChain` |

Two hand-rolls carry `TODO(expansion)` markers: Ki earned this run (`modules/dojo.ts`),
and the scroll's test evaluator (`modules/kata.ts`).

## Balance model

The spine is `data/spine.ts`; its `WALK` is the reference walk. `balance/bout-probe.ts`
measures each challenger's `PAR`; `balance/arc-probe.ts` plays the shipping game and diffs
it against the walk. `BALANCING.md` covers the tunables and couplings.
