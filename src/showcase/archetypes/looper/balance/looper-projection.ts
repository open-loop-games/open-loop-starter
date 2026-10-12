/**
 * Looper — closed-form balance projection (no engine state).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/looper/balance/looper-projection.ts [nights]`
 *
 * The spine in runnable form. It predicts; `arc-probe.ts` measures. Everything
 * here is arithmetic over `../data/spine.ts`:
 * - § 1, the route: each gate's derived duration, and the work the route through
 *   each landmark takes against the capacity of the night it is scheduled for.
 * - § 2, the arc: per night, budget, work capacity, skill level, mastery and
 *   Intel, under the reference policy `predictNights` states.
 * - § 3, the notes: what each costs and when the arc's Intel first covers it.
 */

import {
  ESCAPE_ROUTE_WORK,
  GATE_SECONDS,
  LANDMARK_SCHEDULE,
  LANDMARKS,
  NOTE_PRICES,
  noteCost,
  predictArc,
  predictNights,
  type NoteId,
} from '../data';

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const NIGHTS = Number(argv[2] ?? 14);

console.log('═══ 1. The route is sized from capacity ═══\n');
console.table(GATE_SECONDS);
const capacity = predictNights(Math.max(...LANDMARK_SCHEDULE.map((l) => l.night)));
console.table(
  LANDMARK_SCHEDULE.map((l) => ({
    landmark: LANDMARKS[l.depth],
    night: l.night,
    fill: l.fill,
    capacity: +capacity[l.night - 1].work.toFixed(1),
    routeThrough: +(l.fill * capacity[l.night - 1].work).toFixed(1),
  })),
);
console.log(`Whole escape route: ${ESCAPE_ROUTE_WORK.toFixed(1)} base-seconds of work.\n`);

console.log('═══ 2. The arc under the reference policy ═══\n');
const arc = predictArc(NIGHTS);
console.table(
  arc.map((n) => ({
    night: n.night,
    depth: n.depth,
    budget: +n.budget.toFixed(1),
    work: +n.work.toFixed(1),
    endLevel: n.endLevel,
    mastery: +n.mastery.toFixed(3),
    intel: n.intel,
    escape: n.escapeSeconds === null ? '-' : +n.escapeSeconds.toFixed(1),
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
