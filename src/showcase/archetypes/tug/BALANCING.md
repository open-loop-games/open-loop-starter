# Tug — balancing

A battle is two flat economies spending into one lane, and the balance question is where
their clashes happen and what ends them, not how fast either grows. Each clash has a closed
form; the line they add up to, and whether engines breach before the season closes, do not,
so the probes measure them. The bucket and where its closed form stops are in `IDENTITY.md`
§ Rate-function spine.

## The tunables

Every key is read through `tunable()` and listed in `modules/tuning.ts`. A probe overrides
one with `perturb()` from `balance/_marshal.ts`.

| Key | Default | What it moves |
|---|---|---|
| `income/base` | 10 silver/s | Both harvests, every squad's price and the tithe's, which are seconds of it. The member stats do not follow: they are derived at load from the anchor. Raising it speeds a battle's economy against the same troops. |
| `horn/seconds` | 10 | The release period, and so the size of a wave and the early horn's fee. Longer periods widen the leading horn's edge. |
| `clash/counterSharpness` | 1.6 | Damage a troop deals the one it beats, and the inverse it takes back. Higher makes the right answer decisive; at 1 the wheel is gone and mass decides. |
| `cover/atGate` | 0.15 | Damage a defender takes at its own gate; cover ramps from it to none at the middle. The spring that pulls the line home. Toward 1 a pushed side collapses and overruns return. |
| `gate/share` | 0.25 | Share of its damage an ordinary troop deals a gate it stands at. Engines breach; this decides whether a host that reaches a gate adds much. |
| `season/seconds` | 150 | When the last week opens. The season closes `lastWeekSeconds` after it, so this sets the longest battle. |
| `ladder/rungGrowth` | 1.12 | A strength boon level's multiplier, and the base the lords grow by. One key for both: that is the parity claim. |
| `ladder/boonsPerField` | 0.85 | Boon levels a field the lords' men grow by: the march's steepness, and so the arc's length. |

**Not perturbable**, because each moves the member stats the spine derives or a field's
authored row, and a change means rerunning `tug-projection.ts` and the career: the troops'
squad sizes, costs, duel times, reach and speed (`data/troops.ts`); the files, rank spacing
and muster; the yeoman's display hp; the gate's breach time; the engines' throw; the surge
steps; the weapons' charge and strength; champions' strength; the fields and twists.

## Couplings

- **Losses at the line must spend about a harvest.** Duel times are short enough that a held
  yeoman line loses about 60% of a harvest a second to the other's front rank. Lengthen them
  and both hosts fill the muster within a minute: silver piles up, the line freezes where it
  first met, and income, the tithe and Fertile Fields stop mattering.
- **Engines carry a line to the gate; strength never does.** Cover at the gate (×0.15) is a
  spring stronger than any advantage the march hands out, so a line settles short of the
  gate. An engine throws from `engineThrow` paces and is brought up through its own ranks, so
  a line held past the middle puts engines in throw. Shorten the throw and no gate falls;
  stop engines passing their own ranks and a deep host strands them at the back.
- **A host at its muster spends its surplus on engines.** That is what turns the last week's
  surge into breaches. Without it, surge silver banks unspent.
- **Fire-pots answer engines.** Two keeps that both mount them burn each other's engines, and
  the battle closes on the season. One keep without them is breached.
- **The lords grow in vigor, not harvest.** A harvest only buys men until the muster fills;
  grit and blows count at any size. One key, `ladder/rungGrowth`, sizes both a boon level and
  the lords' growth.
- **Strength boons have no limit; the lords stop growing at the Stolen Throne.** A run of
  defeats still pays renown, renown buys strength, so no seed meets a wall. Past the ending
  the heirs stand at the last lord's strength and grow no harder.
- **The opening horn sounds for both keeps together.** If one keep's opening wave marched
  alone, the lines would first meet under the other's cover. After it the horns alternate.
- **An early horn restarts its keep's schedule.** It is open half a period after a horn, and
  costs half the silver the waiting seconds would pay. A lord sounds early only to answer a
  wave an open troop beats.
- **The muster counts members, not squads.** Yeomen fill it five at a time, and the surge
  raises it with the harvest.
- **A raider at the gate loots.** Gate damage takes silver from the defender's treasury at
  half its amount, so the side being breached also raises less to stop it.
- **The rival's decision functions read distances from its own gate.** `viewOf` and the
  battle's watch view turn the line and fronts into the keep's frame; the reference marshal
  uses the same functions from Fairhold's side, so a frame error shows as a side lean in
  `front-probe.ts`.

## Running a pass

1. `tug-projection.ts` — the spine with no engine: member stats, predicted clashes, the gate
   and the throw, the season, the tithe and the march. Change an anchor here first.
2. `clash-probe.ts` — the same clashes on the real causeway, beside the prediction. The
   winner must match; the kept share within about ten points.
3. `front-probe.ts [seeds]` — temperament pairings at equal income on the open field, the
   leading horn alternated by seed. Read mirrors for side symmetry, `middle` and `crossings`
   for the sway, `pushed → back` for recovery.
4. `end-probe.ts [seeds] [twist]` — the same pairings, read for the close: breaches against
   season closes, the tiebreak margin, and whether the side ahead when the last week opened
   won. Both seats mount the open field lord's weapon. Pass a twist id to read its direction.
5. `career-probe.ts [seed] [battles] [perField]` — the march under the reference marshal:
   battles a field takes and the session time to the ending. `perField` sweeps the ladder.
   Run seeds as parallel processes.

Each runs in seconds; the header of each says how to read it.

## Known thin

- **Knights barely beat bowmen on the real causeway.** At 200 silver a side the clash probe
  keeps 7% where the spine predicts 30%; yeomen over knights and bowmen over yeomen match.
  Sturdier knights do not close the gap, and faster ones lose the duel: it is in how a charge
  meets a bow line, not in the members' stats. Bowmen at double spend keep 56% against 78%.
- **The reference marshal never raises the Stone Curtain.** The strength boons have no limit
  and it prefers them, so the curtain's worth is unmeasured.
- **The arc is steep in `ladder/boonsPerField`.** Over eight seeds, 0.8 puts the ending near
  1:49 and 0.85 near 1:54–2:12; the spread across seeds is about ±15 minutes.
- **The lords' keeps take three to four battles,** the Twin Sties and the Spyglass the most.
  Outlying fields take one to three.
- **Fire-pot mirrors close on the season.** On the open field both seats mount fire-pots,
  and only 5 of 72 battles breach; a feast day lifts that to 46. In the career, where the
  weapons differ, almost every battle breaches.
- **Past the ending nothing is targeted.** The heirs stand at the last lord's strength while
  the boons keep growing.
