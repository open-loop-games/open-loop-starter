# Cycler — archetype identity

> Phase alternation — a calm phase and a pressure phase sharing one state — which no
> pattern names. Dome Keeper carries the rest: `wave` + `scheduled-event` + `run-setup` +
> `held-output` + `positional-effect`, an `offered-draft` between waves, and
> `meta-progression` keeping unlocks across runs. Build during the calm, survive the
> pressure, repeat with escalating stakes.

Identity line source: `../_identity.md` (Cycler entry); the line's player experience and
exemplar calls are `../_docs/cycler.md`. **Core · open core.** Dome Keeper, Thronefall and
Kingdom Two Crowns show the composition ships, as a set; none is a lift target.

## What this archetype is

*Skerry Light.* You keep the light on a bare rock in the North Atlantic. By day the sea is
calm: tide nets catch salvage and hold it until you haul it in, and salvage buys
breakwaters, nets, buttresses and winches on a 5×5 rock with the tower at its centre. Each
dawn forecasts the quarter tonight's gale will come from, and taking a piece up refunds it
in full, so every calm is a re-siting puzzle: walls to windward, nets to the lee,
buttresses behind the struck side. By night the breakers land on that side, and what its
walls cannot turn goes into the tower. Shoring up, at a price that doubles each time, is
the night's one verb. Nets catch double in the storm and hold it for the morning.

The tide leaves three finds at dawn; one is taken and the rest wash out at dusk. When the
tower falls the light goes out, and the logbook pays entries for force weathered and
salvage gathered. Entries buy the keeper's knowledge and charters for harder postings,
chosen between watches.

## Rate-function spine

**Bucket: piecewise phase alternation**, a saturating ward against a geometric storm
(`incremental-math/…/rate-functions/composition.mdx`). A side built on its own five shore
cells, with three buttresses behind, saturates at C_max; its corners are braced once.
Night n's storm is W₀·g^(n−1), a pure function of the night, and W₀ is pegged at the
watch's start to C_max / H from permanent power. So the crossing night is 1 + log_g(H)
whatever the keeper owns: Dressed stone adds reach, more force weathered and more entries,
and only the Storm almanac, which bends g toward 1, lengthens a watch. Integrity is sized
to outlast the crossing by a night and a half at the reference g.

**Where the closed form stops:**
- *the build.* The spine assumes a saturated side; the keeper reaches it over the first
  nights, with salvage the nets catch and the order it buys in.
- *the night.* Shoring adds ward the peg does not see, and so does Brass fittings. Walls on
  the next sides beside the corners brace them twice, above C_max.
- *the dawn.* The forecast quarter and the finds are drawn; a quarter repeated two nights
  running saves a rebuild.

**What measures the remainder:** the reference keeper (`balance/_keeper.ts`) plays the
shipping game; `watch-probe.ts`, `career-probe.ts` and `posting-probe.ts` print what it
measures beside `cycler-projection.ts`.

## The arc

| Beat | Recorded |
|---|---|
| Night one: the first gale | 2:00 |
| A buttress behind the struck wall | 6:55 |
| A winch: the nets haul themselves | 11:14 |
| The crossing: the tower takes water | night 7, 18:48 |
| The light goes out: the logbook pays | 24:55, 8 nights |
| The Storm almanac: a watch one night longer | watch 4, 1:14:45 |
| A second almanac level: eleven nights | watch 7, 2:38:21 |

A watch at Haven Point runs 22–28 minutes and 7–8 nights at knowledge zero. Over eight
watches run length holds while stone climbs and steps up only at almanac levels: 8, then 9,
then 11 nights. The career has no end beat. `manifest.ts` holds the recorded beats.

## Growth ports

- **A directional screen.** A piece that shelters one quarter, so the forecast decides
  where it stands as it does for walls. A screen that only cuts the leak is more of a
  wall.
- **A campaign close.** A final posting whose last night is the end beat, as the line's
  campaign-closure variants end.
- **A keeper's mate.** Player automation that re-sites pieces to the forecast, behind an
  automation tier.

## Engine fit

| Component | Engine primitive |
|---|---|
| salvage, integrity, the payout's sources, logbook entries | `createResource` |
| the watch: count, clock, the reset at the light going out | `createCycle`, paused between watches |
| day and night ticks | `TickDriver` phases, re-entered after every transition and load |
| pieces and knowledge | `createPurchasableCategory`, `Formula.exponential` costs |
| the board | `createSpatialGrid`, rebuilt from the placed list |
| the tideline | `createInventory`, one slot per shore cell |
| the posting | `createLoadout` |
| ward and wrack | `createModifierChain` |
| the finds | `weightedPick` |
| the payout | `integerRoot` per source |

Two hand-rolls carry `TODO(expansion)` markers in `modules/watch.ts`: held output per net
and the offered draft. The phase clock is game code by the engine's design, and its comment
says why.

## Balance model

The spine is `data/spine.ts`; `balance/cycler-projection.ts` runs it. The probes play the
shipping game under the reference keeper and print beside it. `BALANCING.md` covers the
tunables and couplings.
