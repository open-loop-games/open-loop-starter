# Cycler — archetype identity

> Phase alternation — a calm phase and a pressure phase sharing one state — which no
> pattern names. Dome Keeper carries the rest: `wave` + `scheduled-event` + `run-setup` +
> `held-output` + `positional-effect`, an `offered-draft` between waves, and
> `meta-progression` keeping unlocks across runs. Build during the calm, survive the
> pressure, repeat with escalating stakes.

Genres: `build-and-defend` and `roguelike`, whose documents in the studio's research
library list the games in them. Dome Keeper, Thronefall and Kingdom Two Crowns show the
research composition ships, as a set; none is a lift target.

## What this archetype is

*Skerry Light.* You keep the light on a bare rock in the North Atlantic. By day tide nets
catch salvage and hold it until you haul it in, and salvage buys breakwaters, nets,
buttresses, spray screens and winches on a 5×5 rock with the tower at its centre. Each dawn
forecasts tonight's quarter, whether the gale carries spray, and from the middle of a watch
the quarter it may back to. Taking a piece up refunds it in full, so every calm is a
re-siting puzzle: walls to windward and round the corner it may back to, nets to the lee,
buttresses behind the wall on a plain gale and screens there on a spray night, when the
share that goes over the walls is not known until dusk. Some dawns a wreck is sighted, and
rowing out to strip it leaves the rock untended; out at dusk, the keeper shelters at the
wreck and the night runs without shoring.

By night the breakers land, each on tonight's side or the one it backed to, and what walls
and screens cannot turn goes into the tower. Shoring up a side, at a price that doubles, is
the night's one verb. When the tower falls the light goes out and the logbook pays entries,
which buy the keeper's knowledge and charters for harder postings. The last charter opens
the Flannans, whose storms do not grow with the keeper. There the keeper chooses a dawn to
signal the relief: the tower is made whole and the final gale comes that night. Holding
the light closes the career; the light going out is a lesser close, and the Flannans can
be taken again.

## Rate-function spine

**Bucket: piecewise phase alternation**, a saturating ward against a geometric storm
([rate functions § composition](https://open-loop-games.github.io/incremental-math/rate-functions/composition/)). A side built on its own five shore
cells, with three buttresses behind, saturates at C_max; its corners are braced once.
Night n's storm is W₀·g^(n−1), a pure function of the night, and W₀ is pegged at the
watch's start to C_max / H from permanent power. So the crossing night is 1 + log_g(H)
whatever the keeper owns: Dressed stone adds reach, and only the Storm almanac, which bends
g toward 1, lengthens a watch. Integrity is sized to outlast the crossing by a night and a
half at the reference g. Spray and backing move where the force lands, not how much of it
there is: screens are sized so a side hedged against spray still turns about C_max.

On the closing posting the peg is released on purpose: W₀ is authored at three levels of
stone, so a keeper below that crosses early and one above it holds longer. The final gale
is 2.4 × the larger of tonight's storm and the crossing night's, so a saturated side and a
whole tower hold it from four levels of stone.

**Where the closed form stops:**
- *the build.* The spine assumes a saturated side; the keeper reaches it over the first
  nights, and the backing side and the spray hedge share the same salvage.
- *the night.* Spray shares and backed breakers are drawn. Shoring adds ward the peg does
  not see, and so does Brass fittings.
- *the dawn.* The forecast, the finds and the wrecks are drawn; a wreck's salvage arrives
  only if the keeper goes, and costs the day's work while away.
- *the finale.* When to signal is the keeper's: a built board and a forecast without
  spray, against a storm that grows past the crossing.

**What measures the remainder:** the reference keeper (`balance/_keeper.ts`) plays the
shipping game; `watch-probe.ts`, `career-probe.ts` and `posting-probe.ts` print what it
measures beside `cycler-projection.ts`.

## The arc

| Beat | Recorded |
|---|---|
| Night one: the first gale | 2:00 |
| The first spray: screens behind the struck side | night 3, 7:40 |
| The gale backs: walls round the corner | night 4, 10:30 |
| The light goes out: the logbook pays | 25:08, 8 nights |
| Posted to the Flannans | watch 6, 1:54:52 |
| The relief signalled: a lesser close | 2:08:59 |
| The light holds through the final gale: the end beat | watch 8, 2:37:10 |

A watch runs 22–25 minutes and 7–8 nights. The keeper buys three levels of stone and the
charters by about 1:55; over ten seeds the light holds between 2:09 and 2:38, seven times on
the first watch at the Flannans. Play goes on after either close. `manifest.ts` holds the
recorded beats.

## Growth ports

- **A keeper's mate.** Player automation that re-sites pieces to the forecast, behind an
  automation tier, executing a siting rule the player writes, which a spray night or a
  backed gale can prove wrong.
- **An inherited board.** The next watch on the same posting starts with part of the last
  board standing, sited to the last watch's quarters, as Kingdom Two Crowns' heir inherits.
- **Challenge flags.** A posting run without refunds or without shoring, paid in a
  permanent reward, as Thronefall's challenge conditions are.

## Engine fit

| Component | Engine primitive |
|---|---|
| salvage, integrity, the payout's sources, logbook entries | `createResource` |
| the watch: count, clock, the reset at the light going out | `createCycle`, paused between watches |
| day and night ticks | one `onTick` guarded on the saved phase |
| pieces and knowledge | `createPurchasableCategory`, `Formula.exponential` costs |
| the board | `createSpatialGrid`, rebuilt from the placed list |
| the tideline | `createInventory`, one slot per shore cell |
| the posting | `createLoadout` |
| ward and wrack | `createModifierChain` |
| the finds, the forecast, spray shares, backing, wrecks | `weightedPick`, `random` |
| the payout | `integerRoot` per source |

Two hand-rolls carry `TODO(expansion)` markers in `modules/watch.ts`: held output per net
and the offered draft. The phase clock is game code by the engine's design, and its comment
says why.

## Balance model

The spine is `data/spine.ts`; `balance/cycler-projection.ts` runs it, with the spray hedge
and the finale by stone. The probes play the shipping game under the reference keeper and
print beside it. `BALANCING.md` covers the tunables and couplings.
