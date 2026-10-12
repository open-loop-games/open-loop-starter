/**
 * Explorer — arc probe. Plays the shipping game to the Hart under the greedy
 * walker, once per seed, and prints each run beside the spine's prediction.
 * Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/explorer/balance/arc-probe.ts [seeds] [maxSeconds]`
 * `seeds` is a comma list (default `7,11,23`); the seed drives the hunt rolls,
 * never the map.
 *
 * How to read it:
 * - § Beats: each predicted beat against the measured second, per seed.
 * - § Bands: where each band's stay went (walking, and of it charting toward
 *   the frontier; hunting; waiting at a restock point), its hunts and kills, and its hide rate against the spine's
 *   `hideRate(k)` times the band's field factor. `wait jerky` is waiting on a store that cannot fill the
 *   satchel, and `starved` the part of that the racks ran below capacity for
 *   want of meat or wood; the rest is too few racks. `hit %` is kills per hunt; `own band` against `kills`
 *   is how much of the stay went to shallower quarry.
 * - § Run: whether the Hart fell, losses (maulings and starvations), and a stuck
 *   streak at the end, which is the walker finding nothing in reach.
 */

import { ANCHORS, FIELD_FACTOR, hideRate, predictBeats } from '../data';
import { runArc, type ArcRecord } from './_engine';

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const SEEDS = (argv[2] ?? '7,11,23').split(',').map(Number);
const MAX = Number(argv[3] ?? 3600);

const t0 = performance.now();
const runs: ArcRecord[] = [];
for (const seed of SEEDS) runs.push(await runArc(seed, MAX));

console.log('\n=== Beats: spine (predicted) vs probe (measured), per seed ===');
console.table(
  predictBeats().map((p) => {
    const row: Record<string, string | number> = { beat: p.label, predicted: p.seconds };
    for (const r of runs) {
      const at = r.beats.find((b) => b.label === p.label)?.at;
      row[`seed ${r.seed}`] = at ?? '-';
    }
    return row;
  }),
);

console.log('\n=== Bands: where each stay went, and the hide rate against the spine ===');
for (const r of runs) {
  console.log(`seed ${r.seed}`);
  console.table(
    r.ledger.map((L, k) => {
      const prev = k > 0 ? r.ledger[k - 1].hides : 0;
      const span = L.walk + L.hunt + L.wait;
      return {
        band: k,
        secs: Math.round(span),
        walk: Math.round(L.walk),
        chart: Math.round(L.chart),
        hunt: Math.round(L.hunt),
        wait: Math.round(L.wait),
        'wait jerky': Math.round(L.waitJerky),
        starved: Math.round(L.waitStarved),
        'hit %': Math.round((100 * L.kills) / Math.max(1, L.hunt / ANCHORS.huntSeconds)),
        kills: L.kills,
        'own band': L.killsDeep,
        hides: Math.round(L.hides - prev),
        'hides/s': +((L.hides - prev) / Math.max(1, span)).toFixed(2),
        'spine/s': +(hideRate(k) * FIELD_FACTOR[k]).toFixed(2),
      };
    }),
  );
}

console.log('\n=== Run ===');
console.table(
  runs.map((r) => ({
    seed: r.seed,
    won: r.won,
    simSeconds: Math.round(r.simSeconds),
    losses: r.losses,
    stuckSeconds: r.stuckSeconds,
  })),
);
console.log('final snapshot per seed:');
for (const r of runs) console.log(`  seed ${r.seed}: ${r.snapshots.at(-1)}`);
console.log({ wallMs: Math.round(performance.now() - t0) });
