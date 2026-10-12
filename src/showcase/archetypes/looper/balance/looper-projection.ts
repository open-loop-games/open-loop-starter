/**
 * Looper — closed-form balance projection (no engine state).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/looper/balance/looper-projection.ts [nights]`
 *
 * The spine in runnable form. It predicts; `arc-probe.ts` measures. Everything
 * here is arithmetic over `../data/spine.ts`:
 * - § 1, the route: each gate's derived duration, and whether each landmark lands
 *   on its night. A landmark lands on schedule when the route through it exceeds
 *   the previous night's capacity and fits inside its own night's.
 * - § 2, the arc: per night, budget, work capacity, the ride, the patrol learned,
 *   skill level, mastery and Intel, under the reference policy `predictNights`
 *   states, with each night ending on the freight.
 * - § 3, the notes: what each costs and when the arc's Intel first covers it.
 */

import {
  GATE_SECONDS,
  LANDMARK_SCHEDULE,
  LANDMARKS,
  NOTE_PRICES,
  noteCost,
  predictArc,
  predictNights,
  routeWork,
  type NoteId,
} from '../data';

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const NIGHTS = Number(argv[2] ?? 20);

console.log('═══ 1. The route is sized from capacity ═══\n');
console.table(GATE_SECONDS);
const capacity = predictNights(Math.max(...LANDMARK_SCHEDULE.map((l) => l.night)), {
  gates: GATE_SECONDS,
});
console.table(
  LANDMARK_SCHEDULE.map((l) => {
    const patrolLevel = l.night > 1 ? capacity[l.night - 2].patrolLevel : 0;
    const route = routeWork({ known: l.depth - 1, patrolLevel }, l.depth);
    const here = capacity[l.night - 1].work;
    const before = l.night > 1 ? capacity[l.night - 2].work : 0;
    return {
      landmark: LANDMARKS[l.depth],
      night: l.night,
      position: l.position,
      route: +route.toFixed(1),
      capacity: +here.toFixed(1),
      'night before': +before.toFixed(1),
      lands: route > here ? 'LATE' : route <= before ? 'EARLY' : 'on schedule',
    };
  }),
);

console.log('═══ 2. The arc under the reference policy ═══\n');
const arc = predictArc(NIGHTS);
const at = (v: number | undefined) => (v === undefined ? '-' : +v.toFixed(1));
console.table(
  arc.map((n) => ({
    night: n.night,
    depth: n.depth,
    budget: +n.budget.toFixed(1),
    work: +n.work.toFixed(1),
    wall: at(n.splits[4]),
    ride: +n.ride.toFixed(1),
    railYard: at(n.splits[5]),
    freight: at(n.splits[6]),
    patrol: n.patrolLevel,
    endLevel: n.endLevel,
    mastery: +n.mastery.toFixed(3),
    intel: n.intel,
    nerveLv: n.nerveLevel,
    grapevineLv: n.grapevineLevel,
  })),
);

console.log('═══ 3. The notes against the take ═══\n');
let banked = 0;
const firstAffordable: Partial<Record<NoteId, number>> = {};
for (const n of arc) {
  banked += n.intel;
  for (const id of Object.keys(NOTE_PRICES) as NoteId[])
    if (firstAffordable[id] === undefined && banked >= noteCost(id, 0))
      firstAffordable[id] = n.night;
}
console.table(
  (Object.keys(NOTE_PRICES) as NoteId[]).map((id) => ({
    note: id,
    first: noteCost(id, 0),
    ratio: NOTE_PRICES[id].ratio,
    limit: NOTE_PRICES[id].limit,
    'cumulative take covers it on night': firstAffordable[id] ?? '-',
  })),
);
