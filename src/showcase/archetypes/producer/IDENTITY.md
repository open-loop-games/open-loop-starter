# Producer — archetype identity

> `manual-action` + `producer` + `escalating-price` + `multiplier-stack`, with
> `automation` taking the click over and `statistics` thresholds stepping the stack — the
> automation ladder with its `prestige` declined, which is Scaler's. No adversary, no
> board, no run: the curve is the content.

Identity line source: `../_identity.md` (Producer entry); the line's player experience,
exemplar calls and the slow-end configuration are `../_docs/producer.md`. **Core ·
covered.** Cookie Clicker, AdVenture Capitalist, Antimatter Dimensions and Universal
Paperclips show the composition ships, as a set; none is a lift target.

## What this archetype is

*Consolidated Holdings.* You found a holding company on one pushcart. You close deals by
hand until your carts out-earn you, then buy newsstands, diners, laundromats, print
shops, trucking lines, textile mills and savings banks. Each acquisition of a kind
raises the next seller's asking price. Then you hire people to do it for you. Nothing
opposes you and nothing resets.

| Piece | What it does |
|---|---|
| The deal | a button; each press pays cash, on its own chain |
| Eight subsidiaries | each unit earns cash every second; owning one of a tier reveals the next |
| Management memos | one-shots: each doubles a subsidiary, or the deal (sales training) |
| Market-leader certificates | owning 25, 50 and 100 of a subsidiary doubles it |
| Credit grades | lifetime revenue steps every subsidiary up ×1.2, B to AAA |
| The executive floor | three hires, each an automation tier with its own duty switch |
| The night bookkeeper | bought once; from then on, time away is played out on return |

- **The desks.** The sales desk closes deals at the hand's pace. The acquisitions desk
  buys the subsidiary that pays itself back soonest, twice a second. The board signs
  every memo the moment the money is there, and once it sits, the acquisitions desk
  holds back the price of the cheapest open memo. Sending a desk home is how the player
  saves by hand.
- **Offline is an unlock.** Before the bookkeeper, a return replays nothing. After it,
  time away replays through the live game loop, desks included, up to a window sized by
  the game's length and the replay's cost.

## Rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`).
Unit `n` of tier `i` costs `a_i·m^n`, one shared ratio `m` derived from two authored
beat times. Within a band the stack is one constant factor; every step (a memo, a
certificate, a grade) is a discrete step on a count or a lifetime total, so each is a
splice point, not a continuous coupling. The per-tier cost step is solved, not chosen:
bisected until the projection opens the top tier at `LADDER_TARGET`.

**Where the closed form stops: which subsidiary absorbs the next dollar.** The spine
closes conditional on a stated buy order: payback-greedy over affordable units, with the
cheapest open memo held back once the board sits. `projectArc` evaluates that order over
the closed-form ladder, the same order the acquisitions desk ships.

**What measures the remainder:** `arc-probe.ts` plays the shipping desks and diffs every
beat against the projection; `allocation-probe.ts` swaps the desk's rule to show what
the stated order carries.

## The arc

| Beat | Projected | Recorded |
|---|---|---|
| First pushcart | 5s | 5s |
| Sales desk hired | 3m20s | 3m27s |
| Acquisitions desk hired | 5m31s | 5m39s |
| Board of Directors hired | 10m45s | 11m25s |
| The top tier: first savings bank | 19m51s | 20m33s |

Content thins past about 40 minutes: memos and certificates keep arriving, minutes
apart. `manifest.ts` holds the recorded windows.

## Growth ports

- **The slow end.** The same composition paced for time away, `../_docs/producer.md`
  § The slow-end profile.

## Engine fit

| Component | Engine primitive |
|---|---|
| cash, lifetime revenue | `createResource` (`.cumulative`) |
| the deal, the subsidiaries | `createProducerCategory` (`manual` and `continuous` triggers) |
| escalating price | `ProducerPurchaseConfig.costRatio` over `tunable` |
| memos, hires, the bookkeeper | `createPurchasableCategory` + `createCostRequirement` |
| certificates, grades | `createAchievementCategory` with Gate goals (`count-gte`, `cumulative-gte`) |
| the stack | `createModifierChain` (deal, operations, each subsidiary's rate chain) |
| the dispatch ladder | `createAutomationTiers` with `active` Gates |
| the acquisitions desk | `setupPolicyAutoPurchase` + `selectionPaybackPeriod`, `reserve` |
| the board | `setupSweepAutoPurchase` |
| offline catch-up | `processOfflineTime` |

Two hand-rolls carry `TODO(expansion)` markers in `modules/automation.ts`: the sales
desk firing a manual producer at a rate, and the memo reserve arbitrating two
auto-buyers on one wallet.

## Balance model

The spine is `data/spine.ts`, printed by `balance/producer-projection.ts`.
`balance/arc-probe.ts` plays the shipping game and diffs it against the projection.
`BALANCING.md` covers the tunables and couplings.
