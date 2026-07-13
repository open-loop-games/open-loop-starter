# Producer — archetype identity

> **A+C Activity + Cost Scaling + Modifier Chains + Achievement multipliers** —
> the classic big-number incremental. You click a thing, a number goes up, and
> the curve is the content.

**Forward-ish composition** (see `../README.md` § Two honest ways to source
numbers): not a 1:1 clone — the Bakery content is **declared invention** (numbers
are perturbation surface, not lifted from an exemplar), balanced against the
closed-form spine by engine-as-oracle (methodology #1+#2). Cookie Clicker is the
genre exemplar that validates the shape ships in the wild; its numbers are not
lifted. Identity line source: `archetypes/_identity.md` (Producer row).

## What this archetype is

You click a thing. A number goes up. You spend the number on something that
increases the number by itself. Before long you stop clicking and watch the number
grow, checking in to buy the next producer tier and the next multiplier upgrade.
The texture of play is *pacing against a curve*: costs rise faster than production,
so each tier feels unreachable until it isn't, then it's trivial and you're already
saving for the next. A thirty-minute session is a sequence of threshold moments —
*"I can finally afford a farm," "the cursor upgrade doubled my click value," "the
first achievement multiplier just kicked in."* The long-term pull is **modifier
stacking**: hours in, the headline multiplier (base × upgrades × achievements ×
milestones × tier-bonuses) visibly compounds into an unfathomable number, and that
is the reward. There is no story; the curve is the content.

## Rate-function spine / bucket

**Bucket: geometric cost-scaling × modifier-product compounding** — the canonical
**Cost-Scaling** family, and Producer is its exemplar. Each producer is a geometric
price ladder (`cost = baseCost · priceRatio^count`), so its count grows
~logarithmically in accumulated resource; the headline rate is a **modifier
product** (base × upgrade chain × achievement multiplier × milestone bonus) that
compounds multiplicatively. Unlike the clone archetypes, Producer's numbers are
*invented* against this spine rather than lifted, and balanced by the engine as
oracle — frozen-state `getCost(1)` / `getTotalRate` queries (methodology #2) plus
bot-driven `runUntil` bisection per beat (methodology #1). The single modeled
subsystem is `continuous-producers` (Pure bucket, triangular multi-resource
composition row); the one optimal-stopping row (prestige timing) is out of first-arc
scope. The automation reads the spine rather than optimizing it: producer's two
levers (buy a producer, sweep the upgrades) don't warrant an optimal-play scorer,
so the policy is the legible "most cost-effective, cheapest cold-start" pairing
gated by a "% spend" reserve — the single-currency analog of the clone archetypes'
trigger buffers.

## The loop — beat map

Seven ordered player-experience phases; the **measured** windows + predicates live in
`balance/beats.ts` (awaiting the deferred Lane-3 lock — see § Balance model), never
authored:

1. **first-click** — onboarding, the core feedback loop confirmed (click → number up).
2. **first-producer** — clicking becomes idling; auto-production begins.
3. **second-producer** — inter-tier pacing cadence established.
4. **first-upgrade** — the modifier chain introduced; the long-term pull revealed.
5. **achievement-moment** — achievements felt as a mechanical multiplier, not decoration.
6. **bulk-buy-moment** — UX shift to "buy 10 / buy max" as the dominant action.
7. **signature-compound** — the stacked rate-chain visible: the compounded multiplier
   scrolling past ~1e6× is the archetype centerpiece.

The phase order and each phase's intent are **fixed identity** — a fork changing them
has forked into a sibling archetype, not retuned. The arc budget is ~90 min
(re-shaping below ~60 or past ~180 changes the archetype).

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| A+C Activity | click affordance + continuous `Producer` | click tapers off; auto-production carries |
| Cost Scaling | `Producer.getCost(n)` geometric price ladder | `cost = baseCost · priceRatio^count` |
| Modifier Chains | `rateChain` (upgrade × achievement × milestone products) | the compounding headline multiplier |
| Achievement multipliers | `AchievementCategory.registerTiered` | earned achievements feed the rate chain |
| Automation | shipping autobuyers (`modules/autobuyers/`) | one `buildProducerPolicy` (payback-period + cheapest cold-start) drives the autobuyer *and* the walker; a `reserveFraction` "% spend" knob holds back part of the bank |
| Perturbation | module `TuningRegistry` (`tunable()`) + `data/overrides.ts` | constants (incl. `balance/producerReserveFraction`) via tuning; data-shape via overrides |

## Balance model — three lanes

Math-first, engine-as-oracle (see `../README.md` § Balance):

```
data/*.ts ─── Balance ───   →   balance/*.ts (vite-node)        →   sim/ (Lane-3 lock — DEFERRED)
closed-form lens                 projection helpers + probes      measured beat-window lock
"what the cost/rate math says"   "what shipping code does"        "what must stay true"
```

1. **Lens** — `// ─── Balance ───` sections in `data/producers.ts` / `data/upgrades.ts`
   carry the geometric-cost + modifier-product closed forms.
2. **Projection** — `balance/spec.ts` + `balance/predict.ts` (frozen-state
   engine-as-oracle + closed-form bot-policy walker, methodology #2): `getCost(1)` /
   `getTotalRate` over the triangular composition.
3. **Probe** — `balance/*-probe.ts` (`arc-probe`, `solve-probe`, `verify-probe`,
   `predict-probe`) drive the real engine + **shipping autobuyers** via `bot.ts`'s
   sim-engine builder + a harness-only click-taper model; solver bisection is
   methodology #1.
4. **Lock — DEFERRED.** `beats.ts` holds the *measured* windows + `ARC_BEATS`
   predicates awaiting a `sim/producer.probe.test.ts` lock. The lock is blocked on an
   arc-health gap: under the current content the arc does not reach beats 4/7 (first
   upgrade, signature-compound), so promoting the windows to a passing lock is real
   balance work, tracked as a follow-up under studio/open-loop-starter#9 — not part of
   this identity-surface migration.

## Cross-references

- Genre exemplar (shape validation, not a lift target): Cookie Clicker
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-producer.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
