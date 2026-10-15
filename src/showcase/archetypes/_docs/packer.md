# Packer

Core · covered. Identity line: the Packer entry in `../_identity.md`. Built:
`../packer/IDENTITY.md`.

## Player experience

Packer is the archetype of _arranging a bounded space so that position becomes power_. You acquire pieces — gems, machines, triggers, inventory items — and place them on a grid. Each placement is a small decision about what sits where; the bonus is never in the piece alone but in the relation its position sets up. You hover a piece over an open cell and the board lights up showing "+30% from three matching neighbours"; you try another cell and the bonus halves. A beacon stamps its buff in a knight's-move pattern, so the best cell for it is two over and one up from the thing it feeds. Where pieces have shapes, you rotate one to fit it against the chain you already built — or you stop, pull one piece back, and rearrange three others because you just noticed the better layout. The texture of play is _spatial hypothesis_: a quiet puzzle that rewards looking before committing, where the production or combat tick that follows is the score.

The two configuration axes set how hard the puzzle is. The **relation** runs from plain adjacency (the four or eight cells around a piece) to authored templates — a knight's move, an arrow, a donut — that reach across the board. The **footprint** runs from one cell per piece to the full tetromino set, at which point fitting shapes into the bounded space becomes a budget of its own.

In a runless game the board stays and grows: a play session is a rearrangement prompted by a new piece or a newly opened region, and the long-term pull is a layout that compounds further every time it is re-solved. In a run-based game a play session is one run — arrange, resolve, adjust, repeat for six to twelve rounds — and the long-term pull is what survives between runs: a widening pool of pieces to draft from. Either way the solution space is the content. Every new piece opens new arrangements, and the pool is large enough that exhaustive search is impractical; players genuinely find combinations nobody documented. The player role is _arranger_ — not architect (that's Defender) and not participant (that's Survivor).

## Exemplar calls

| Game                 | Call | How progress survives                                                                              | Sourced |
| -------------------- | ---- | -------------------------------------------------------------------------------------------------- | ------- |
| Calculator Evolution | in   | stacked `prestige` resets; the Singularity layer's 5×5 machine board, eleven machine kinds each facing one of four ways, where an effect counts only when its chain points into the Output | yes     |
| NGU Industries       | in   | a runless save with `offline-progress`, `escalating-price` and `softcap`; beacons stamp box, knight's-move, arrow, wall and donut footprints | yes     |
| Ballionaire          | in   | `meta-progression`: Ploop banked on the profile widens the draftable pool; a plinko board with authored per-slot adjacency, where placement is permanent and a removal spends a counted resource | yes     |

## Lineage

The auto-chess lineage is where the grid-and-relation shape reached the market: Dota Auto Chess, Dota Underlords, Super Auto Pets, and Backpack Battles for footprint packing. Each is out — their runs and matches keep nothing earned by play, beyond ranked standing and cosmetics — but Backpack Battles' grid and packing are representative of this line's footprint axis.

What separates Packer from an auto-battler is the grid. Where pieces affect each other only through a team roster or tribe-count thresholds ("three Knights on the board"), with no position read, the shape is not this line. Two terms from that genre collide with research's: tribe-count "types" are not `type-effectiveness` (a lookup over pairs of kinds), and synergy "combos" are not `combo` (a streak of consecutive acts). The auto-battler shape itself — a gridless tribe-synergy draft resolved without player input — has no line in the set, because no incremental exemplar of it has been called.
