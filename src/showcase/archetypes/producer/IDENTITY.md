# Producer — archetype identity

> `manual-action` + `producer` + `escalating-price` + `multiplier-stack`, with
> `automation` taking the click over and `statistics` thresholds stepping the stack — the
> automation ladder with its `prestige` declined, which is Scaler's. No adversary, no
> board, no run: the curve is the content.

Identity line source: `../_identity.md` (Producer entry); the line's player experience,
exemplar calls and the slow-end configuration are `../_docs/producer.md`. **Core ·
covered.** Cookie Clicker, AdVenture Capitalist, Antimatter Dimensions and Universal
Paperclips show the composition ships, as a set; none is a lift target. This build also
carries `scheduled-event` and `random-draw` (the tips) and an `ending`, beyond the line.

## What this archetype is

*Consolidated Holdings.* You found a holding company on one pushcart. You close deals by
hand until your carts out-earn you, then buy newsstands, diners, laundromats, print
shops, trucking lines, textile mills and savings banks. Each acquisition of a kind
raises the next seller's asking price. Then you hire people to do it for you, keep an
eye on the wire, and grow the firm until it can buy the tallest building in town.

| Piece | What it does |
|---|---|
| The deal | a button; each press pays cash |
| Eight subsidiaries | each unit earns cash every second; owning one of a tier reveals the next |
| Telephones | the sales desk's lines; each closes a deal a second |
| Management memos | one-shots at 10 to 200 owned: each doubles a subsidiary, or the deal |
| Synergies | memos coupling two subsidiaries: each earns more per unit of the other |
| The referral network | every deal pays more per subsidiary owned, ×5, ×10, ×20 as it grows |
| Certificates and grades | owning 25 to 200 doubles a subsidiary; lifetime revenue steps all income |
| Standing | every achievement counts; press bought with it lifts all income by standing |
| Tips on the wire | a tip comes in every few minutes; caught, it draws a bull market, a closing spree or a windfall deal |
| The executive floor | three hires, each an automation tier with its own duty switch |
| The night bookkeeper | bought once; from then on, time away is played out on return |
| The Consolidated Building | offered at 150 savings banks; buying it ends the firm's story, and play goes on |

- **The desks.** The sales desk comes with the hand's pace in phones and buys more on
  payback. The acquisitions desk buys subsidiaries and phones by payback, twice a second.
  The board signs every memo once the money is there, and the acquisitions desk then
  holds back the cheapest open memo. Sending a desk home is how the player saves.
- **Tips are the attentive player's.** No desk catches a tip. A bull market multiplies
  everything for a while; a closing spree pays the hand ×77; a windfall deal pays a share
  of cash on hand, so a held bank pays more. Catching them all is worth about a seventh
  of the arc.
- **Grades are the chapters.** Each threshold is the lifetime revenue the reference has
  at its share of the arc, so a credit grade lands about every 22 minutes.
- **The arc.** The first hour is dense: every tier opens inside fifteen minutes. After
  it, the thresholds arrive every few minutes: memos, certificates, synergies, press, the
  referral network, a grade at each chapter, and a tip between them. Near four hours the
  building is offered.

## Rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`).
Unit `n` of tier `i` costs `a_i·m^n`, one shared ratio `m` derived from two authored beat
times. Every multiplier is a discrete step on a count or a lifetime total, a splice
point; synergies and the referral network read other holdings' counts, so a tier's rate
is a function of the count vector. The per-tier cost step is solved, not chosen.

**Where the closed form stops:**
- *which holding absorbs the next dollar.* The spine closes on a stated buy order:
  payback-greedy over units and phones, at the acquisitions desk's cadence, with the
  cheapest open memo held back once the board sits. Under synergies this is a heuristic.
- *tips.* They arrive by a hazard ramp and draw an effect at random. The projection
  books each at its expected value, and the solve targets that expected arc.

**What measures the remainder:** `tip-probe.ts` draws tips on seeded streams in closed
form and measures what attention is worth; `arc-probe.ts` plays the shipping game on seeds and diffs
it against the projection; `allocation-probe.ts` swaps the desk's rule.

## The arc

| Beat | Projected | Recorded (seeds 1–3) |
|---|---|---|
| Sales desk hired | 2m19s | 2m31s |
| The top tier: first savings bank | 10m43s | 12m10s – 12m47s |
| The building offered | 3h44m | 3h35m – 3h37m |
| The building bought | 3h57m | 3h48m – 3h50m |

`manifest.ts` holds the recorded windows; the projection's times are its expected arc.

## Growth ports

- **The slow end.** The same composition paced for time away, `../_docs/producer.md`
  § The slow-end profile.

## Engine fit

| Component | Engine primitive |
|---|---|
| cash, lifetime revenue | `createResource` (`.cumulative`) |
| the deal, subsidiaries, phones | `createProducerCategory` (`manual`, `continuous`; the desk's phones as `extraCount`) |
| escalating price | `ProducerPurchaseConfig.costRatio` over `tunable` |
| memos, synergies, the referral network | `createPurchasableCategory`; synergies as live `Grant` multipliers |
| the referral add | `createAdditiveModifier` in a reserved slot of the deal chain, ahead of training |
| certificates, grades, feats | `createAchievementCategory` with Gate goals |
| standing's press | `createPurchasableCategory` with a live `Grant` multiplier |
| bull market, closing spree | `createTemporaryEffectSystem` |
| tip clock and draws | `random`, `randomItem` (seedable) |
| the dispatch ladder | `createAutomationTiers` with `active` Gates |
| the acquisitions desk | `setupPolicyAutoPurchase` over a producer list + `selectionPaybackPeriod`, `reserve` |
| the board | `setupSweepAutoPurchase` |
| offline catch-up | `processOfflineTime` |

The memo reserve carries a `TODO(expansion)` marker in `modules/automation.ts`: priority
between two auto-buyers drawing on one wallet.

## Balance model

The spine is `data/spine.ts`, printed by `balance/producer-projection.ts`.
`balance/arc-probe.ts` plays the shipping game and diffs it against the projection.
`BALANCING.md` covers the tunables and couplings.
