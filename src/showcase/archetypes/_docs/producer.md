# Producer

Core · covered. Identity line: the Producer entry in `../_identity.md`. Built
as `../producer/`.

## Player experience

Producer is the archetype every incremental player already understands within thirty seconds. You click a thing. A number goes up. You spend the number on something that increases the number by itself. Before long you stop clicking and watch the number grow, checking in to buy the next producer tier and the next multiplier upgrade. The texture of play is _pacing against a curve_: costs rise faster than production, so each tier feels unreachable until it isn't, and then it's trivial and you're already saving for the next one.

A thirty-minute session is a sequence of threshold moments — _"I can finally afford a farm"_, _"the cursor upgrade doubled my click value"_, _"the first achievement multiplier just kicked in"_. The long-term pull is modifier stacking: six hours in, a player watches their headline multiplier (base × upgrades × achievements × milestones × tier-bonuses) visibly compound into an unfathomable number, and that is the reward. There is no story; the curve is the content.

### At the slow end of its pacing

The same composition, paced for absence, is a game the player does not play so much as _keep_. You open it once in the morning, glance at it while a pot boils, check it on the way back from a meeting, let it run at the edge of a monitor for an afternoon. Resources accumulate whether you are watching or not, and `held-output` banks them until you look. Nothing expires. No cooldown queue is about to waste. The game commits to never punishing a glance not taken — urgency is declined, not merely absent. Whether it also grows while closed splits the set: Chillquarium selects `offline-progress`, while Rusty's Retirement and Tiny Pasture decline it and grow only while they sit open on the desktop. What remains is production that runs on its own, `automation` buying the next thing, and a slowly unfolding unlock tree. The player's relationship to the game is _companionship_, not engagement: the game lives on the desktop the way a plant lives on a desk.

A thirty-minute session is seven three-minute glances distributed across the day. Each glance yields accumulated output, one or two affordable purchases, and occasionally a new visual element revealed — a building appears, an animal wanders in, a zone quietly unlocks. The long-term pull is the pleasant, legible, ongoing state of the game: _my thing is running, it is happy, it grew while I was away._ Anti-Idle made that commitment in the web era and the desktop-companion cluster around Rusty's Retirement remade it; what changes between the two is the visual budget, not the engagement contract.

Pacing is not a line boundary. A slow Producer differs from a fast one in its rate constants and in which urgencies it declines, not in its composition, so it is a configuration of this line. The built `../ambient/` archetype is that configuration.

## Exemplar calls

| Game                  | Call | Progress persists through                                                | Sourced |
| --------------------- | ---- | ------------------------------------------------------------------------ | ------- |
| Cookie Clicker        | in   | a runless save: `escalating-price` buildings, `statistics`-stepped stack | yes     |
| Antimatter Dimensions | in   | a runless save under its reset layers                                    | yes     |
| AdVenture Capitalist  | in   | a runless save with `offline-progress`                                   | yes     |
| Universal Paperclips  | in   | a runless save                                                           | yes     |
| Anti-Idle             | in   | a runless save                                                           | no      |
| Rusty's Retirement    | in   | a runless save with `held-output`; declines `offline-progress`; the slow end | yes     |
| Chillquarium          | in   | a runless save with `offline-progress`; the slow end                     | yes     |
| Tiny Pasture          | in   | a runless save with `held-output`; declines `offline-progress`; the slow end | yes     |
