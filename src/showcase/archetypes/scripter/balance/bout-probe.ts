/**
 * Scripter: bout probe. Fights seeded bouts on a real engine, every challenger against the
 * reference sensei's template for it and against the template it had before its word,
 * and prints the distribution of beats. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/scripter/balance/bout-probe.ts [seeds]`
 *
 * How to read it: `with` is the reference template once the challenger's answer is
 * known, whose median `PAR` in `../data/spine.ts` records (for the Envoy, the dispatcher);
 * `before` is the template the sensei had the moment the challenger arrived, so the gap is
 * what the new word pays. `dispatch` is the scroll the Envoy's Names allow, against
 * everyone: it should never lose, and should sit near each challenger's own template.
 * Bouts are fought at the reference Temper (`REFERENCE_TEMPER`), which only Ren reads.
 */

import { CHALLENGERS, PAR, TECHNIQUES, type TechniqueId } from '../data';
import { fightBouts } from './_engine';
import { boutLines, referenceScroll } from './_sensei';

const SEEDS = Number(process.argv[2] ?? 300);
const knowsAll = () => true;
/** Every word but the ones learned at or after the challenger's answer. */
function knowsBefore(answer: string | null): (t: TechniqueId) => boolean {
  const order = TECHNIQUES.map((t) => t.id);
  const cut = answer ? order.indexOf(answer as TechniqueId) : order.length;
  return (t) => ['reading', 'lineage', 'thousand-hands'].includes(t) || order.indexOf(t) < cut;
}
const stats = (xs: number[]) => {
  const won = xs.filter(Number.isFinite).sort((a, b) => a - b);
  const pct = Math.round((100 * won.length) / xs.length);
  if (!won.length) return `win ${String(pct).padStart(3)}%`.padEnd(30);
  return `win ${String(pct).padStart(3)}%  median ${String(won[Math.floor(won.length / 2)]).padStart(3)}  p90 ${String(won[Math.floor(won.length * 0.9)]).padStart(3)}`;
};

console.log(`\nSCRIPTER bout probe — ${SEEDS} seeded bouts per row\n`);
console.log(
  'challenger'.padEnd(30) +
    'with its word'.padEnd(36) +
    'before its word'.padEnd(36) +
    'dispatch'.padEnd(30) +
    'PAR',
);
for (const c of CHALLENGERS) {
  const k = knowsBefore(c.answer);
  const scroll = (known: (t: TechniqueId) => boolean, visitor = c.id) =>
    [
      ...(known('breath-reading') ? ['if chi < 15: breathe'] : []),
      ...boutLines(visitor, known),
    ].join('\n');
  const dispatch = fightBouts(c.id, referenceScroll(knowsAll, null, true), SEEDS);
  // The Envoy's answer is the dispatcher itself.
  const withWord = c.id === 'envoy' ? dispatch : fightBouts(c.id, scroll(knowsAll), SEEDS);
  // Before Iron Body there is no Temper: Ren's lesson is the fist, not the scroll.
  const before = fightBouts(c.id, scroll(k), SEEDS, c.answer === 'iron-body' ? 0 : undefined);
  console.log(
    `${c.displayName.padEnd(30)}${stats(withWord).padEnd(36)}${stats(before).padEnd(36)}${stats(dispatch).padEnd(30)}${PAR[c.id]}`,
  );
}
