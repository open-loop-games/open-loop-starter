# Skirmish

Adjacent · claim. Identity line: the Skirmish entry in `../_identity.md`. Built
as `../skirmish/`.

## Player experience

Skirmish is real-time strategy. Each faction runs an economy, spends it building an army, and sends that army across a shared continuous field to break its rivals' bases — all of it at once, in real time, with no turn boundary to hide behind. The classic RTS tension is the whole game: income spent on the economy compounds and income spent on the army does not, so a faction that over-invests is defenceless when pressure arrives and one that under-invests wins the first engagement and loses the war. Build order, army composition and when to commit are the decisions, and they are decisions _because_ rivals are making them at the same time against you.

The field holds **N factions**. Three armies can meet, the weakest two can be left alone to bleed each other while the third expands, and a faction that wins an engagement can still emerge too thin to survive the next arrival. Threat is directional and unevenly distributed, so _who to fight_ sits alongside how much to build. Free-for-all is the base case; teams and alliances are the same substrate with a friend/foe relation over it.

Combat resolves on an open field rather than a lane or a grid. Units acquire targets, close, and fight; a front forms wherever armies happen to meet. Position is consequential without being authored — a stream of arrivals is defeated piecemeal by a mass that arrived together, so _when_ an army is committed matters as much as how large it is.

A session is a match, and a match is an argument between build orders. The early minutes are quiet and economic; first contact tells you whether your split was right; the recovery — or the failure to recover — is the rest of the match. The long-term pull is the strategy space: economy-versus-army is one axis, composition another, target selection a third, and against rivals adapting on the same axes there is no single correct answer to converge on. Nothing carries from one match to the next. Skirmish ships with AI on every seat, which makes it fully playable and fully balanceable before a human seat exists; a player seat is a policy swapped for input.

## Why adjacent

The engine surface Skirmish exercises and the core lines do not is the policy seat: every faction is a persona-driven policy shipped as game code, swappable mid-match, drawn from the adjacent game-AI collection (`open-loop-research/patterns/adjacent/ai-rosters.md`). No exemplar is cited, so the line is a claim. Tug is the core line nearest to it — see `tug.md` § Against Skirmish for the boundary.

## Folded in: player as director

A player who steers rather than commands is a Skirmish player seat, not a separate line. The player occupies a handful of goal slots with strategic intents — _"claim the north hotspot," "defend the east sector," "pressure the blue faction"_ — and the seat's persona policy carries them out. The pull is _"I am learning a system"_: round one feels chaotic; by round eight the player can predict where their frontier will stall and reshapes the goal stack to compensate. A between-match currency spent on permanent upgrades is deliberately not part of this seat, because progression across matches is what makes Tug core; giving it to Skirmish would collapse the two lines.
