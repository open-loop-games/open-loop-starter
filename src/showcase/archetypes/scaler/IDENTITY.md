# Scaler — archetype identity (Synergism first-arc port)

> **Multi-layer nested Prestige + prestige-integrated Challenge layers + deep
> Modifier Chains at extreme scale** — the layered-compression incremental.
> The game you played an hour ago becomes a footnote.

**Subtractive clone with a declared-invention frontier** (see `../README.md`
§ Two honest ways to source numbers): Synergism ids, names, and numbers are
lifted 1:1 with per-const `Synergism.ts` citations at the module reader sites,
with every substitution recorded below (§ Arc substitutions). Not the forward
model — the older direct-cut-down path. Unlike a pure clone, a small **tunable
frontier** (transcend threshold, offering base gain) is declared-invention
because its canonical compounding sources aren't ported yet; that frontier is
the only surface the solvers perturb. Identity line source:
`archetypes/_identity.md` (Scaler row).

## What this archetype is

You buy producers, they produce, costs scale, a number climbs — familiar
Producer shape. But then you hit a prestige threshold and ascend: everything you
built resets, and in exchange you get a new currency, a new upgrade tree, and a
multiplier that makes your next run minutes instead of hours. A few runs later
there is a *second* layer on top of the first, with its own currency and its own
reset scope that wipes the first layer's upgrades too. Eventually a third. Each
layer compresses the one below it until what took you an hour takes seconds.

A thirty-minute session near the start is a prestige cycle: push the headline
resource past a threshold, click the big button, watch the multipliers compound,
out-perform your previous run within minutes. Mid-game it is a *challenge* run —
you voluntarily take on a nerf inside the outer prestige loop, grinding it out
for a permanent stacking bonus. The long-term pull is watching the headline
multiplier scroll past `1e12×`, then `1e120×`, then into tetration, every digit
the product of layers, challenges, and upgrades you composed yourself.

## Rate-function spine / bucket

**Bucket: cascade-reset compression over a multi-subsystem economy** — not a
single closed form but a *composition* of nine subsystems, each in its own
rate-function bucket, coupled through persistent cross-cycle currencies. This is
the layered-compression instance: prestige zeros the coin tier, transcend zeros
the prestige tier, and the multiplier chain compounds *across* the resets via
persistent currencies + rune EXP + transcend boosts, so each cycle is
geometrically shorter than the last. The per-subsystem bucket-walk (Theme-2
vocabulary, the classification a fork's sub-pass reaches for):

| Subsystem | Bucket | Note |
|---|---|---|
| coin · upgrades | Pure | geometric base-cost ladder × modifier chain |
| accelerator · multiplier · challenges (ECC) | Piecewise | cumulative-buy cost splices; ECC softcap linear ≤100 / ÷20 / ÷100 |
| runes | Pure | EXP→level canonical log curve |
| prestige · transcend | Optimal-stopping | when-to-cycle under autobuyer policy; Bellman threshold |
| achievements | Coupled-state | predicate-watch flips feed the AP multiplier chain |

The honest consequence of being a clone in this bucket: the **economy as a whole
has no single closed form** — its pacing is the composition above, which is why
balance here *instruments the canonical math* (§ Balance model) rather than
projecting from a spine. The one structural departure from Producer is the
**zero-click contract**: all income flows through `Producer.getTotalRate`, which
lets the harness read the arc through `stasis-aware-tick`.

## The loop — beat map

Seven ordered beats the player narrates against the ~12h cumulative first-arc;
the **measured** windows + predicates live in `balance/beats.ts`, never authored:

1. **first-coin-producer-purchased** — autobuyer onboarding visible after the
   100-coin starter kit drains.
2. **modifier-chain-first-felt** — first Accelerator/Multiplier bends coin rate.
3. **first-prestige-fires** — coin tier resets, PP unlocks the prestige layer.
4. **first-rune-level-1** — Speed rune's multiplier begins compounding into coin.
5. **first-diamond-owned** — prestige-layer compounding visible post-prestige.
6. **first-transcend-fires** — prestige tier collapses, transcend layer carries
   forward. **Signature-metric climax** (`first-transcend AND transcend-
   multiplier-applied`).
7. **first-mythos-owned** — transcend-layer compounding visible; the second
   prestige cycle accelerates — the arc closes on the compression made legible.

The phase order and the cascade structure are **fixed identity** — a fork
changing the reset cascade or the canonical-port posture has forked into a
sibling. The arc budget is ~12h cumulative through the first few transcend
cycles.

## Canonical exemplar + arc scope (the clone ledger)

**Canonical exemplar:** Synergism, pre-cube/hepteract early arc — through first
transcend + a few prestige/transcend cycles. Source at
`open-loop-research/reference-code/SynergismOfficial/`.

- **Nine subsystems ported:** coin · accelerator · multiplier · upgrades · runes
  · challenges (ECC) · prestige · transcend · achievements. ~20 canonical-port
  constants distributed across five module files, each cited to `Synergism.ts`
  at its reader site.
- **Three producer tiers, three currencies:** coin (base), diamond (prestige),
  mythos (transcend) — each an autobuyer-swept geometric ladder gated on its
  tier-presence landmark.
- **Zero-click, autobuyer-driven:** the full 13-toggle automation surface
  (`modules/autobuyers/`) ships auto-prestige, auto-transcend, auto-sacrifice,
  and challenge sweep — the arc plays hands-off. No manual click affordance.

## Arc substitutions (the declared-invention frontier)

- **Transcend threshold lowered 84 OOMs** — canonical `1e100`
  (`Synergism.ts:3583-3585`) → `5e16` at `modules/transcend.ts`. Structural: the
  canonical threshold requires compounding sources (cube upgrades, hepteract
  effects, shop upgrades) not yet in the arc. Forks porting those raise it *here*
  (a `tunable()` reader site), not in a `data/` constant. This is the primary
  declared-invention knob the solvers perturb.
- **Offering base gain** — a `tunable()` stub standing in for the canonical
  offering formula's cube/shop-upgrade terms; a fork replaces it as those
  compounding sources port in.

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Cost Scaling (geometric) | `Producer.getCost(n)` ladders × 3 tiers | coin / diamond / mythos |
| Cumulative-buy piecewise | accelerator/multiplier cost splices | geometric → ×factorial breakpoints |
| Cascade-reset prestige | `reset(scope)` + `prestigeConversion` `anyOf` gate | prestige zeros coin; transcend zeros prestige |
| Rune EXP → level | canonical log-curve `computeEXPToLevel` | Speed rune feeds the coin chain |
| Challenges (ECC softcap) | piecewise `eccTranscend(count)` | in-tree exemplar for the Piecewise row |
| Auto-everything | shipping autobuyers (`modules/autobuyers/`) | 13 per-system toggles; the arc probe drives these |
| Achievement multipliers | `AchievementCategory` predicate-watch | AP curve binds into free-X aggregators |
| Perturbation | module `TuningRegistry` (`tunable()`) | only the declared-invention frontier |

## Balance model — three lanes

Instrument-the-canonical-math (this is a clone; canonical numbers are immutable,
only the declared-invention frontier is tuned). See `../README.md` § Balance:

```
data/*.ts ─ Balance ─   →   balance/{spec,solve-probe,verify-probe}.ts   →   sim/*-beat.test.ts
canonical-const lens        closed-form predictors + spec-vs-sim diff        measured-anchor lock
"what the canon says"       "what shipping code does"                        "what must stay true"
```

1. **Lens** — the `// ─── Balance ───` sections in `data/*.ts` name each lifted
   value's canonical `Synergism.ts` source.
2. **Probe** — `balance/spec.ts` carries the closed-form predictors (ECC
   piecewise, runes log-curve, prestige/transcend Bellman); `balance/
   solve-probe.ts` runs per-sub-pass discovery against the real engine +
   **shipping autobuyers** via `bot.ts`'s sim-engine builder;
   `balance/verify-probe.ts` diffs spec-vs-sim per beat.
3. **Lock** — `sim/*-beat.test.ts` pins the measured anchor windows
   (`balance/beats.ts`) with tolerance bands; the arc-close lock
   (`transcend-beat.test.ts`) asserts first-transcend + first-mythos cascade.

## Cross-references

- Umbrella: `studio/open-loop-starter#9` (canonical-surface sweep); `#15` (this leaf)
- Sibling clones: `src/showcase/archetypes/interlocker/`, `.../defender/`
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-scaler.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
