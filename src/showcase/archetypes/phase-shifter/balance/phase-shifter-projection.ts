/**
 * Phase-shifter — spine projection. Prints what `data/spine.ts` derives: the
 * box's ladder, the board walked by the reference arranger, the night walked
 * by the reference planner, and the predicted beats with their schedule
 * check. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/phase-shifter/balance/phase-shifter-projection.ts`
 *
 * How to read it:
 * - § Box: the clerk ladder, and what crosses the first door.
 * - § Board: when cards reach the inbox, when the board opens, the expansion
 *   prices those openings solve, and the door's lifetime-lead threshold.
 * - § Night: the hints the board hands over, the roster ladder, and the night
 *   each alibi holds.
 * - § Schedule: each beat against the anchor that set it. A line marked `off`
 *   means a derived value no longer lands on its anchor.
 */

import {
  ANCHORS,
  BOARD_PRICES,
  BOX_LADDER,
  BOX_PAGES,
  DECK,
  INSOMNIA_COST,
  NOTES_PER_CARD,
  PREDICTED_CLERKS,
  PREDICTED_NOTE_BUFFER,
  RECONSTRUCT_LEADS,
  REFERENCE_HINTS,
  ROSTER_BASE_COST,
  ROSTER_RATIO,
  SUSPECT_CARDS,
  boardStrength,
  ladderAt,
  predictBeats,
  walkBoard,
  walkNight,
} from '../data';

const f = (x: number, d = 1) => x.toFixed(d);

console.log('\nNight Clerk — spine projection\n');

console.log('Box');
const box = ladderAt(BOX_LADDER, ANCHORS.phaseISeconds);
console.log(
  `  clerks base ${BOX_LADDER.base} ×${BOX_LADDER.growth}; ${BOX_PAGES} pages read by ${ANCHORS.phaseISeconds}s`,
);
console.log(
  `  carries ${PREDICTED_CLERKS} clerks and ${f(PREDICTED_NOTE_BUFFER, 0)} notes; first clerk at ${f(box.times[0])}s`,
);

console.log('\nBoard');
const board = walkBoard(BOARD_PRICES);
console.log(
  `  a card costs ${NOTES_PER_CARD} notes; the deck's ${DECK.length} cards are written by ` +
    `${f(board.written.at(-1) ?? NaN, 0)}s (inbox at the door: ${board.written.length - board.pins.filter(Boolean).length})`,
);
console.log(
  `  opens 4×4 at ${f(board.opened[0] ?? NaN, 0)}s${board.opened[1] === undefined ? '' : `, 5×5 at ${f(board.opened[1], 0)}s`}; ` +
    `prices ${BOARD_PRICES.join(', ')} leads`,
);
const side = 3 + board.opened.length;
console.log(
  `  at the door: ${board.pins.filter(Boolean).length} cards pinned, strength ${boardStrength(board.pins, side)}; ` +
    `threshold ${RECONSTRUCT_LEADS} lifetime leads`,
);

console.log('\nNight');
console.log(
  `  hints ${REFERENCE_HINTS.size} of ${SUSPECT_CARDS.length} suspect hours; each needs ${ANCHORS.sightingsPerHour} sightings`,
);
console.log(
  `  roster ${ANCHORS.rosterStart} + places at ${ROSTER_BASE_COST} ×${ROSTER_RATIO}; insomnia ${INSOMNIA_COST}`,
);
const night = walkNight(REFERENCE_HINTS, ROSTER_BASE_COST, ROSTER_RATIO);
console.log(
  `  alibis hold on nights ${night.alibis.join(', ')}; roster ends at ${night.roster}; insomnia night ${night.insomnia ?? '—'}`,
);
const blind = walkNight(new Set(), ROSTER_BASE_COST, ROSTER_RATIO);
console.log(`  with no hints at all, the sixth holds on night ${blind.alibis.at(-1) ?? '—'}`);

console.log('\nSchedule');
const beats = predictBeats();
const phaseIIIStart = ANCHORS.phaseISeconds + ANCHORS.phaseIISeconds;
const anchored: Record<string, number> = {
  'first clerk': ANCHORS.firstClerkSeconds,
  'box empty': ANCHORS.phaseISeconds,
  'board 4×4': ANCHORS.phaseISeconds + ANCHORS.boardOpensAt,
  'reconstruct threshold': phaseIIIStart,
  'alibi 6': phaseIIIStart + ANCHORS.lastAlibiNight * ANCHORS.nightSeconds,
};
for (const [name, t] of Object.entries(beats)) {
  const a = anchored[name];
  const mark =
    a === undefined ? '' : Math.abs(t - a) <= 1 ? `  anchor ${a}s ok` : `  anchor ${a}s off`;
  console.log(`  ${name.padEnd(24)}${f(t).padStart(8)}s${mark}`);
}
