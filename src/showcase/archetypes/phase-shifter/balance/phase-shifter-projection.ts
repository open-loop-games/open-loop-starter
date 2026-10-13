/**
 * Phase-shifter — spine projection. Prints what `data/spine.ts` derives: each
 * phase's ladder, what each door hands forward, the night's elimination
 * schedule, and the predicted beats with their schedule check. Runs no
 * engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/phase-shifter/balance/phase-shifter-projection.ts`
 *
 * How to read it:
 * - § Phases: each ladder's base, ratio and funding, and what the greedy walk
 *   holds when the phase's designed length runs out.
 * - § Doors: the record each door reads, and what crosses it.
 * - § Night: contradictions banked per night, witnesses filed and suspects cleared
 *   under the spine's dawn order.
 * - § Schedule: each beat's predicted time against the anchors that set it. A
 *   line marked `off` means a derived value no longer lands on its anchor.
 */

import {
  ANCHORS,
  BOARD_LADDER,
  BOX_LADDER,
  BOX_PAGES,
  CANVASSER_BASE_COST,
  CLERK_XREF_NOTES_PER_S,
  ELIMINATION_BASE_COST,
  ELIMINATION_RATIO,
  INSOMNIA_COST,
  PREDICTED_CLERKS,
  PREDICTED_NOTE_BUFFER,
  RECONSTRUCT_LEADS,
  SECOND_SHIFT_COST,
  WITNESS_BASE_COST,
  eliminationNights,
  ladderAt,
  predictBeats,
  type Ladder,
} from '../data';

const f = (x: number, d = 1) => x.toFixed(d);

function phase(name: string, l: Ladder, seconds: number, unit: string): void {
  const end = ladderAt(l, seconds);
  console.log(
    `  ${name.padEnd(10)} base ${f(l.base)} ×${l.growth}  funded ${f(l.rate0, 2)} + ${f(l.ratePer, 2)}/rung ${unit}/s` +
      `${l.bank0 ? `  opening bank ${f(l.bank0)}` : ''}`,
  );
  console.log(
    `  ${''.padEnd(10)} at ${seconds}s: ${end.count} bought, ${f(end.earned, 0)} earned, ` +
      `first at ${f(end.times[0] ?? NaN)}s`,
  );
}

console.log('\nNight Clerk — spine projection\n');
console.log('Phases');
phase('I. Box', BOX_LADDER, ANCHORS.phaseISeconds, 'notes');
phase('II. Board', BOARD_LADDER, ANCHORS.phaseIISeconds, 'leads');

console.log('\nDoors');
console.log(`  pin-board    opens at ${BOX_PAGES} pages read (the whole box)`);
console.log(
  `               carries ${PREDICTED_CLERKS} clerks (${f(PREDICTED_CLERKS * CLERK_XREF_NOTES_PER_S)} notes/s of cross-referencing) and ${f(PREDICTED_NOTE_BUFFER, 0)} notes`,
);
console.log(
  `  reconstruct  opens at ${RECONSTRUCT_LEADS} lifetime leads; fidelity √(leads / ${RECONSTRUCT_LEADS})`,
);
console.log(`  accuse       opens at ${ANCHORS.suspects - 1} suspects cleared`);
console.log(
  `  prices: canvasser ${f(CANVASSER_BASE_COST)} leads, second shift ${SECOND_SHIFT_COST} leads, witness ${WITNESS_BASE_COST}, ` +
    `elimination ${ELIMINATION_BASE_COST} ×${ELIMINATION_RATIO}, insomnia ${INSOMNIA_COST}`,
);

console.log('\nNight');
const nights = eliminationNights(ELIMINATION_BASE_COST, ELIMINATION_RATIO);
console.log(`  suspects cleared on nights ${nights.join(', ')}`);

console.log('\nSchedule');
const beats = predictBeats();
const anchored: Record<string, number> = {
  'first clerk': ANCHORS.firstClerkSeconds,
  'box empty': ANCHORS.phaseISeconds,
  'reconstruct threshold': ANCHORS.phaseISeconds + ANCHORS.phaseIISeconds,
  'elimination 1':
    ANCHORS.phaseISeconds +
    ANCHORS.phaseIISeconds +
    ANCHORS.firstEliminationNight * ANCHORS.nightSeconds,
  [`elimination ${ANCHORS.suspects - 1}`]:
    ANCHORS.phaseISeconds +
    ANCHORS.phaseIISeconds +
    ANCHORS.lastEliminationNight * ANCHORS.nightSeconds,
};
for (const [name, t] of Object.entries(beats)) {
  const a = anchored[name];
  const mark =
    a === undefined ? '' : Math.abs(t - a) <= 1 ? `  anchor ${a}s ok` : `  anchor ${a}s off`;
  console.log(`  ${name.padEnd(24)}${f(t).padStart(8)}s${mark}`);
}
