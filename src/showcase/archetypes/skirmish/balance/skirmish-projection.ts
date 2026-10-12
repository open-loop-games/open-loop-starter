/**
 * Skirmish — closed-form balance projection (no engine).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/skirmish-projection.ts
 *
 * Projection — pure math (`open-loop-engine/docs/consumer-guide-balance.md`
 * § The spine — a falsifiable prediction). It predicts; the probes verify. The
 * spine is guns-versus-butter over the exponential family (`../IDENTITY.md`
 * § Rate-function spine, `../data/economy.ts` § Balance):
 *
 *     E(t)  = E₀ · e^(φ · r · t)                          workers
 *     Aˢ(t) = ((1−φ)/φ) · c · E₀ · (e^(φ·r·t) − 1)        army supply spent
 *     A(t)  = Aˢ(t) / unitCost                            army units fielded
 *
 * with r = ρ/c. At φ = 0 the economy is flat and A(t) = ρ·E₀·t/unitCost.
 *
 * **This is a BOUND, not a prediction, and deliberately so.** Two discrete
 * facts the continuous model has no term for, both pushing the same way:
 *
 *   1. A worker is a LUMP (`c > unitCost`), so a seat under its target share
 *      reserves the worker cost instead of committing it, and fields less
 *      army than `A(t)` says while it saves.
 *   2. Purchases land on a cadence, not continuously.
 *
 * Both make the real army SMALLER than projected, so `A(t)` is an upper bound
 * a probe must come in under. A probe fielding MORE army than this is not a
 * balance result — it means the model and the shipping policy disagree, and
 * the model is the thing to fix.
 *
 * What this file deliberately does NOT do is pick a winner. Who wins is a
 * best-response question over both seats' φ plus a coupled-state attrition
 * exchange; neither is in the algebra (§ Where the closed form stops). The
 * crossover printed below is the *economic* crossover only — when one seat's
 * cumulative army mass overtakes the other's — which is a necessary condition
 * for winning late, not a sufficient one.
 */

import { ECONOMY_BALANCE, GROWTH_CONSTANT } from '../data/economy';
import { TROOPER } from '../data/tactical';

const { startingWorkers: E0, incomePerWorker: RHO, workerCost: C } = ECONOMY_BALANCE;
const R = GROWTH_CONSTANT;
const UNIT_COST = TROOPER.cost;

/** Workers owned at `t` under a fixed split. */
function workersAt(phi: number, t: number): number {
  if (phi <= 0) return E0;
  return E0 * Math.exp(phi * R * t);
}

/** Cumulative supply directed at army by `t`. */
function armySupplyAt(phi: number, t: number): number {
  if (phi <= 0) return RHO * E0 * t;
  if (phi >= 1) return 0;
  return ((1 - phi) / phi) * C * E0 * (Math.exp(phi * R * t) - 1);
}

/** Cumulative units fielded by `t` — the bound. */
function armyAt(phi: number, t: number): number {
  return armySupplyAt(phi, t) / UNIT_COST;
}

/** Income per second at `t`. */
function incomeAt(phi: number, t: number): number {
  return RHO * workersAt(phi, t);
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e5) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return 'never';
  if (sec < 60) return `${sec.toFixed(0)}s`;
  return `${(sec / 60).toFixed(1)}m`;
}

const SPLITS = [0, 0.25, 0.5, 0.75];
const MARKS = [30, 60, 120, 300, 600];

console.log('# Skirmish — closed-form projection\n');
console.log(
  `E₀ = ${E0} workers · ρ = ${RHO}/s per worker · c = ${C} · unitCost = ${UNIT_COST}\n` +
    `r = ρ/c = ${R.toFixed(4)}/s — the growth constant φ multiplies.\n`,
);
console.log(
  `Economy doubling time at φ=1: ${fmtTime(Math.LN2 / R)}; at φ=0.5: ` +
    `${fmtTime(Math.LN2 / (0.5 * R))}.\n`,
);

// ─── 1. The split, as a table ────────────────────────────────────────────────

console.log('## 1. Army fielded by time t (upper bound, units)\n');
console.log('| φ | ' + MARKS.map((t) => fmtTime(t)).join(' | ') + ' |');
console.log('|---' + MARKS.map(() => '|---').join('') + '|');
for (const phi of SPLITS) {
  console.log(`| ${phi} | ` + MARKS.map((t) => fmt(armyAt(phi, t))).join(' | ') + ' |');
}

console.log('\n## 2. Income per second at time t\n');
console.log('| φ | ' + MARKS.map((t) => fmtTime(t)).join(' | ') + ' |');
console.log('|---' + MARKS.map(() => '|---').join('') + '|');
for (const phi of SPLITS) {
  console.log(`| ${phi} | ` + MARKS.map((t) => fmt(incomeAt(phi, t))).join(' | ') + ' |');
}

// ─── 3. Economic crossover ───────────────────────────────────────────────────

/** First time an investing split's cumulative army overtakes the rush's, if ever. */
function crossoverVsRush(phi: number, maxT = 3600): number {
  if (phi <= 0) return Infinity;
  let lo = 0;
  let hi = maxT;
  if (armyAt(phi, hi) < armyAt(0, hi)) return Infinity;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (armyAt(phi, mid) >= armyAt(0, mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

console.log('\n## 3. Economic crossover against the rush (φ = 0)\n');
console.log('When an investing split has fielded more cumulative army than pure');
console.log('rush. Before its crossover a split is strictly behind on the field.\n');
console.log('| φ | crossover | army there | rush army there |');
console.log('|---|---|---|---|');
for (const phi of SPLITS.filter((p) => p > 0)) {
  const t = crossoverVsRush(phi);
  console.log(
    `| ${phi} | ${fmtTime(t)} | ${Number.isFinite(t) ? fmt(armyAt(phi, t)) : '—'} | ` +
      `${Number.isFinite(t) ? fmt(armyAt(0, t)) : '—'} |`,
  );
}

console.log('\nThis is the archetype in one table. A higher φ is strictly worse');
console.log('until its crossover and strictly better after, so the design question');
console.log('is whether the match is still alive when the crossover arrives —');
console.log('which is what `split-probe.ts` measures and this file cannot.');

// ─── 4. What the bound is worth ──────────────────────────────────────────────

console.log('\n## 4. Reading this against a probe\n');
console.log('- Army counts here are an UPPER bound: the reserve and the purchase');
console.log('  cadence both make the real army smaller. A probe under the bound is');
console.log('  agreement; a probe over it means the model is wrong, not the balance.');
console.log('- Income is NOT bounded the same way — it depends only on workers, and');
console.log('  a seat that hits `maxWorkers` flattens against a cap the closed form');
console.log('  does not carry. Watch for that before trusting a late-game reading.');
console.log('- No winner is predicted here, deliberately: the attrition exchange is');
console.log('  coupled-state and the optimal φ is a best-response fixed point.');
console.log('  See `../IDENTITY.md` § Rate-function spine.');
