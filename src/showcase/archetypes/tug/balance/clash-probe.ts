/**
 * Tug: clash probe. Stages a wave in each bailey, sounds the opening horn and lets the two
 * waves meet at the middle, with nothing else raised, cover off and the season held off.
 * Prints each clash beside the spine's prediction (`tug-projection.ts`). Prints; never
 * asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/clash-probe.ts`
 *
 * How to read it: the winner and the share of its spend it keeps, real against predicted.
 * The spine reads a clash in the open with the shorter reach closing under fire; the real
 * causeway adds ranks walking up behind the front, so expect the real numbers within about
 * ten points of the prediction and the winner always the same.
 */

import { ANCHORS, TROOPS, predictClash, releaseBudget, troop, type TroopId } from '../data';
import { idleCommander } from '../modules';
import { buildGame, openAll, perturb, DT } from './_marshal';

function clash(a: TroopId, sa: number, b: TroopId, sb: number) {
  const g = buildGame(1);
  perturb(g, { 'ladder/rungGrowth': 1, 'cover/atGate': 1, 'season/seconds': 1e9 });
  g.chronicle.rung.value = 1;
  openAll(g);
  g.battle.commanders.player = idleCommander;
  g.battle.commanders.rival = idleCommander;
  g.battle.start('player');
  g.causeway.stage('player', a, sa);
  g.causeway.stage('rival', b, sb);
  const worth = (side: 'player' | 'rival') =>
    g.causeway.members.value
      .filter((m) => m.side === side)
      .reduce((s, m) => s + m.cost * (m.hp / m.maxHp), 0);
  let t = 0;
  let spentA = 0;
  let spentB = 0;
  while (t < 300) {
    g.engine.tickDriver.advanceTime(DT);
    t += DT;
    const any = (side: 'player' | 'rival') => g.causeway.members.value.some((m) => m.side === side);
    if (!spentA && any('player')) {
      spentA = worth('player');
      spentB = worth('rival');
    }
    if (spentA && (!any('player') || !any('rival'))) break;
  }
  const keptA = worth('player') / spentA;
  const keptB = worth('rival') / spentB;
  g.dispose();
  return keptA > 0 ? { winner: a, kept: keptA } : keptB > 0 ? { winner: b, kept: keptB } : null;
}

const spend = 2 * releaseBudget;
const squads = (id: TroopId) => Math.round(spend / (troop(id).costSeconds * ANCHORS.income));
const members = (id: TroopId) => squads(id) * troop(id).squad;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
console.log(`\nTUG clash probe — about ${spend} silver a side, cover off, at the middle\n`);
for (const t of TROOPS) {
  if (!t.beats) continue;
  const real = clash(t.id, squads(t.id), t.beats, squads(t.beats));
  const p = predictClash(t.id, members(t.id), t.beats, members(t.beats));
  const pw = p.winner === 'a' ? t.id : p.winner === 'b' ? t.beats : 'neither';
  console.log(
    `  ${t.id} v ${t.beats}: real ${real ? `${real.winner} keeps ${pct(real.kept)}` : 'both fall'}` +
      ` · spine ${pw} keeps ${pct(p.kept)}`,
  );
}
for (const t of TROOPS) {
  if (t.breaksWalls) continue;
  const real = clash(t.id, 2 * squads(t.id), t.id, squads(t.id));
  const p = predictClash(t.id, 2 * members(t.id), t.id, members(t.id));
  console.log(
    `  ${t.id} at double spend: real keeps ${real ? pct(real.kept) : '—'} · spine ${pct(p.kept)}`,
  );
}
