/**
 * Tug: the spine as a runnable function. No engine. Prints the numbers `../data/spine.ts`
 * derives from its anchors, and the clashes it predicts, for `clash-probe.ts` to measure on
 * the real causeway.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/tug/balance/tug-projection.ts`
 *
 * How to read it:
 * - members: each troop's per-member stats under the equal-value rule. `F` is how many of a
 *   release's members strike at once; melee strikes from its front rank, bows from several.
 * - clashes: each counter pair at two releases' spend apiece, in the open. The counter should
 *   win clearly but not keep everything; the doubled spend shows the combat law (the linear
 *   law keeps 50%, the square law 87%).
 * - the gate, the tithe ladder and the Chronicle's ladder, as the spine sizes them.
 */

import {
  ANCHORS,
  LORDS,
  TROOPS,
  frontage,
  gateHp,
  memberCost,
  memberStats,
  predictClash,
  releaseBudget,
  renownFor,
  titheBaseCost,
  titheCostRatio,
  type TroopId,
} from '../data';

const f = (x: number, d = 1) => x.toFixed(d);
console.log(
  `\nTUG projection — one release is ${releaseBudget} silver (${ANCHORS.hornSeconds}s of harvest)\n`,
);
console.log('members');
for (const t of TROOPS) {
  const m = memberStats(t.id);
  const n = releaseBudget / memberCost(t);
  console.log(
    `  ${t.id.padEnd(6)} cost ${f(m.cost).padStart(5)}  hp ${f(m.hp).padStart(5)}  dps ${f(m.dps, 2).padStart(5)}` +
      `  gate ${f(m.gateDps, 2).padStart(5)}  reach ${t.reach}  speed ${f(m.speed)}  ` +
      `· a release raises ${f(n)} (${t.squad} a squad), F ${frontage(t, Math.max(1, n))}`,
  );
}

const spend = 2 * releaseBudget;
const n = (id: TroopId) => spend / memberCost(TROOPS.find((t) => t.id === id)!);
console.log(`\nclashes in the open, ${spend} silver a side`);
for (const t of TROOPS) {
  if (!t.beats) continue;
  const r = predictClash(t.id, n(t.id), t.beats, n(t.beats));
  const who = r.winner === 'a' ? t.id : r.winner === 'b' ? t.beats : 'neither';
  console.log(`  ${t.id} v ${t.beats}: ${who} keeps ${f(r.kept * 100, 0)}% in ${f(r.seconds)}s`);
}
for (const t of TROOPS) {
  if (t.breaksWalls) continue;
  const r = predictClash(t.id, 2 * n(t.id), t.id, n(t.id));
  console.log(`  ${t.id} at double spend keeps ${f(r.kept * 100, 0)}%`);
}

console.log(
  `\nthe gate: ${f(gateHp, 0)} hp — two mangonels breach it in ${ANCHORS.breachSeconds}s`,
);
const yeomen = memberStats('pike');
console.log(
  `  a full muster of yeomen at the gate breaches it in ${f(gateHp / (ANCHORS.muster * yeomen.gateDps), 0)}s, ` +
    `under the gatehouse bows killing one every ${f(yeomen.hp / ANCHORS.gatehouseDps)}s`,
);

console.log('\nthe tithe');
for (let k = 0; k < ANCHORS.tithesPerSeason; k++) {
  const cost = titheBaseCost * Math.pow(titheCostRatio, k);
  console.log(
    `  raise ${k + 1}: ${f(cost, 0)} silver, pays back in ${f(cost / (ANCHORS.titheStep * ANCHORS.income), 0)}s`,
  );
}

console.log('\nthe Chronicle (a lord beaten every battle)');
let xp = 0;
for (const l of LORDS) {
  xp += renownFor(l.rung, true);
  const volume = Math.floor((Math.sqrt((8 * xp) / ANCHORS.renownBase + 1) - 1) / 2);
  console.log(
    `  ${l.name.padEnd(24)} +${renownFor(l.rung, true)} renown (${renownFor(l.rung, false)} in defeat) → volume ${volume}`,
  );
}
