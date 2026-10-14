# Tug — balancing

A battle is two flat economies spending into one lane, and the balance question is where
their clashes happen, not how fast either grows. Each clash has a closed form; the line they
add up to does not, so the probes measure it. The bucket and where its closed form stops are
in `IDENTITY.md` § Rate-function spine.

## The tunables

Every key is read through `tunable()` and listed in `modules/tuning.ts`. A probe overrides
one with `perturb()` from `balance/_marshal.ts`.

| Key | Default | What it moves |
|---|---|---|
| `income/base` | 10 silver/s | Both harvests, every squad's price and the tithe's, which are seconds of it. The member stats do not follow: they are derived at load from the anchor. Raising it speeds a battle's economy against the same troops. |
| `horn/seconds` | 10 | The release period, and so the size of a wave. The member stats are derived at one release's budget at load, so this moves pacing, not the equal-value rule. Longer periods widen the leading horn's edge. |
| `clash/counterSharpness` | 1.6 | Damage a troop deals the one it beats, and the inverse it takes back. Higher makes the right answer decisive; at 1 the wheel is gone and mass decides. |
| `cover/atGate` | 0.15 | Damage a defender takes at its own gate; cover ramps from it to none at the middle. This is the spring that pulls the line home. Toward 1 a pushed side collapses; much lower and lines stall short of the gates. |
| `gate/share` | 0.25 | Share of its damage an ordinary troop deals to a gate. It decides whether a breach needs a mangonel. |
| `season/seconds` | 150 | When the last week begins; past it every blow doubles each thirty seconds. It caps how long a stable line can stand, and so battle length. |
| `ladder/rungGrowth` | 1.12 | The rival's harvest per rung, and the multiplier of one strength boon level. One key for both: that is the parity claim. |

**Not perturbable**, because each moves the member stats the spine derives, and a change
means rerunning `tug-projection.ts`: the troops' squad sizes, costs, duel times, reach and
speed (`data/troops.ts`); the files, rank spacing and muster; the yeoman's display hp; the
gate's breach time; the gatehouse; the charge's sight; the mangonel's arrival.

## Couplings

- **The opening horn must sound for both keeps together.** If the first keep's opening wave
  marches alone, the lines first meet in the second keep's half, under its cover, and a
  pike line then wears down there: the second horn won every pikemen mirror. After the
  opening the horns alternate, and the keep that leads still wins about 55% of mirrors.
- **Cover and the season are one mechanism.** The ramp keeps a pushed line alive; the last
  week is what lets a line that stands break. Strengthen cover without bringing the season
  forward and battles run to the time limit.
- **The equal-value rule is read at one release's budget.** Squad sizes, reach and the
  files set how many members fight at once; change any of them and every member's hp × dps
  moves. A mangonel costs more than a release, so its frontage is floored at one member.
- **The muster counts members, not squads.** Yeomen fill it five at a time, so a pike-heavy
  host reaches the cap first, and a capped host replaces every death at once: a standoff.
- **A raider at the gate loots.** Gate damage takes silver from the defender's treasury at
  half its amount, so the side being breached also raises less to stop it.
- **The rival's decision function reads distances from its own gate.** `viewOf` turns the
  line and fronts into the keep's frame; the reference marshal uses the same function from
  Fairhold's side, so a frame error shows as a side lean in `front-probe.ts`.
- **Renown pays every battle.** A defeat pays 40%, so the first boon arrives after three
  defeats if no victory comes first.

## Running a pass

1. `tug-projection.ts` — the spine with no engine: member stats, predicted clashes, the
   gate, the tithe and the Chronicle's ladder. Change an anchor here first.
2. `clash-probe.ts` — the same clashes on the real causeway, beside the prediction. The
   winner must match; the kept share within about ten points.
3. `front-probe.ts [seeds]` — temperament pairings at equal income with every troop open,
   the leading horn alternated by seed. Read mirrors for side symmetry, `middle` and
   `crossings` for the sway, `pushed → back` for recovery, and length against 3–10 minutes.
4. `career-probe.ts [seed] [battles]` — the ladder under the reference marshal: battles a
   rung takes, and the session time to the ending.

Each runs in seconds; the header of each says how to read it.

## Known thin

- **The first lord beats a new Fairhold.** Without bowmen, the marshal loses its first three
  battles to Lord Grubb before the Charter of the Longbow opens.
- **The leading horn wins about 55% of mirrors.** The toss is shown, so it is visible, but it
  is an edge.
- **Bowmen reach the front late.** At double spend the clash probe keeps 56% where the spine
  predicts 78%: the rear ranks walk up out of reach. Knights over bowmen keep 30% against a
  predicted 42%.
- **What ends a battle is not measured.** No probe counts how much gate damage comes from
  mangonels and how much from the last week's fury on ordinary troops.
- **Past the ending nothing is targeted.** The Usurper's heirs grow by the rung forever, and
  the boons cap out.
