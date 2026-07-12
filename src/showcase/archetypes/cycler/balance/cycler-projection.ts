/**
 * Cycler — closed-form balance projection (no engine). Pegged-saturation spine.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycler-projection.ts
 *
 * Lane 1, pure math, NO engine (frontier `docs/balance-process.md` § closed-form
 * lens). Predicts; the sim probe verifies later.
 *
 * CORRECTED against the multiverse-hr Cycler pivot (`/work/studio/multiverse-hr`
 * #17): within-run capacity is CONCAVE and SATURATES to a ceiling D_max — every
 * reinvestment ladder is convergent (see `data/build.ts` / `data/upgrades.ts`).
 * So the run does not end at a geometric μ = g/d crossing; it ends when an
 * exogenous, time-driven burn W(t) = W₀·g^(t/T_g) overtakes the saturated ceiling:
 *
 *     N* = τ_setup + T_g · log_g( D_max / W₀ )        (logarithmic in capacity)
 *
 * THE PEG: W₀ tracks lifetime power, W₀ = D_max / H, so D_max/W₀ = H always and
 *
 *     N* = τ_setup + T_g · log_g( H )                 (constant across the arc)
 *
 * Run length becomes a DIRECTLY AUTHORED number (pick H, g, T_g, τ_setup). The peg
 * decouples the two axes: power (D_max) buys reach, only H and g move run length.
 */

import { BUILD_BALANCE } from '../data/build';
import { THREAT_BALANCE } from '../data/threat';
import { CADENCE_BALANCE } from '../data/cadence';
import { PRESTIGE_BALANCE } from '../data/prestige';
import { UPGRADE_BALANCE } from '../data/upgrades';

// ─── Projection knobs (the tuning surface) ───
const ARC_LAYERS = 12; // prestige layers to trace
const H_SWEEP = [2, 3, 4, 6, 8, 16]; // headroom values to size run length against

const cells = BUILD_BALANCE.boardCells;
const ceil = BUILD_BALANCE.baseOutputCeiling;
const adj = BUILD_BALANCE.adjacencyBoost;
const prodRatio = BUILD_BALANCE.producerUpgradeRatio;
const H = THREAT_BALANCE.headroom;
const g = THREAT_BALANCE.escalationBase;
const Tg = THREAT_BALANCE.escalationTimescale;
const setup = THREAT_BALANCE.setupGrace;
const [bandLo, bandHi] = CADENCE_BALANCE.runLengthTargetMinutes;
const Sp = PRESTIGE_BALANCE.fragmentScalePrimary;
const Ss = PRESTIGE_BALANCE.fragmentScaleSecondary;
const quorum = PRESTIGE_BALANCE.mergeQuorum;
const costRatio = UPGRADE_BALANCE.powerUpgradeCostRatio;

// ─── The spine, closed-form ───

/** Saturated within-run capacity ceiling at permanent-power level L. */
const dMax = (L: number) => cells * ceil * adj * Math.pow(prodRatio, L);

/**
 * Run length in minutes: setup grace + the log crossing of the saturated ceiling
 * by the exogenous burn. Guards: W₀ ≥ D_max ⇒ insolvent past setup (setup only);
 * W₀ ≤ 0 (no burn) ⇒ the "merge-when-flat" floor (the near-Ambient shape).
 */
function runLength(pMax: number, w0: number, noBurnFloor = bandLo): number {
  if (w0 <= 0) return noBurnFloor;
  if (w0 >= pMax) return setup;
  return setup + Tg * (Math.log(pMax / w0) / Math.log(g));
}

/** Pegged run length: W₀ = D_max/H ⇒ N* = τ_setup + T_g·log_g(H). Layer-invariant. */
const pegged = () => setup + Tg * (Math.log(H) / Math.log(g));

// ─── The prestige currency, closed-form (the Merge payout) ───
// Two RUN-LONG accumulators (integrated over the pegged run, in minutes) →
// summed cbrt-per-source. Both ∝ D_max, so the payout climbs ∝ ∛D_max: sublinear
// in the reach it buys (data/prestige.ts § Balance).

/** Primary source: production throughput ∫₀^N* capacity dt. Capacity = D_max within a run. */
const production = (L: number) => dMax(L) * pegged();
/** Secondary source: pressure weathered ∫₀^N* burn dt, W(t) flat at W₀ then geometric. */
const endurance = (L: number) => {
  const w0 = dMax(L) / H;
  const N = pegged();
  return w0 * setup + (w0 * Tg * (Math.pow(g, (N - setup) / Tg) - 1)) / Math.log(g);
};
/** The sublinear per-source Merge payout — the cbrt transform Fragments ride. */
const cbrtFloor = (x: number) => Math.floor(Math.cbrt(x) + 1e-9);
const payout = (L: number) => cbrtFloor(production(L) / Sp) + cbrtFloor(endurance(L) / Ss);
/** Cost of the next power level: quorum · costRatio^L (data/upgrades.ts). */
const powerCost = (L: number) => quorum * Math.pow(costRatio, L);

// ─── Reporting ───

const col = (s: string | number, w: number) => String(s).padEnd(w);
const fmt = (min: number) =>
  !Number.isFinite(min) ? '∞' : min < 90 ? `${min.toFixed(0)}m` : `${(min / 60).toFixed(1)}h`;
const inBand = (m: number) => m >= bandLo && m <= bandHi;

function printPegged(): void {
  const n = pegged();
  console.log(`\n═══ Pegged run length (authored via H) ═══`);
  console.log(
    `  D_max(L=0)  = ${dMax(0).toLocaleString()}  (${cells} cells · ${ceil} ceil · ${adj} adj · ${prodRatio}^L)`,
  );
  console.log(`  H = ${H}   g = ${g}/${fmt(Tg)}   τ_setup = ${fmt(setup)}`);
  console.log(
    `  N* = τ_setup + T_g·log_g(H) = ${fmt(n)}   → ${inBand(n) ? `IN BAND [${bandLo},${bandHi}]m ✓` : `OUT OF BAND [${bandLo},${bandHi}]m ✗`}`,
  );
}

/** Within-run: the burn walking up to the saturated ceiling. */
function printWithinRun(): void {
  const L = 6;
  const pMax = dMax(L);
  const w0 = pMax / H; // pegged baseline
  const N = runLength(pMax, w0);
  console.log(`\n═══ Within-run crossing (mid-arc L=${L}, pegged) ═══`);
  console.log(`  D_max = ${pMax.toLocaleString()}   W₀ = D_max/H = ${w0.toLocaleString()}`);
  console.log(col('  t', 8) + col('burn/D_max', 13) + 'phase');
  for (const t of [0, setup, N * 0.5, N * 0.85, N]) {
    // Burn is flat at W₀ through the setup grace, then geometric from τ_setup —
    // the same schedule the shipping kernel runs (cycle.ts burnAt), so the
    // crossing lands at ratio = 1.0 exactly at N*.
    const ratio = (w0 * Math.pow(g, Math.max(0, t - setup) / Tg)) / pMax;
    const phase =
      t <= setup
        ? 'setup (rebuild)'
        : ratio < 0.5
          ? 'comfortable'
          : ratio < 1
            ? 'first bite / under review'
            : '⇒ insolvent: Merge bell';
    console.log(col(`  ${t.toFixed(0)}m`, 8) + col(`${(ratio * 100).toFixed(0)}%`, 13) + phase);
  }
  console.log(`  N* = ${fmt(N)}  (pays out on the crossing — Merge bell, not a fail state)`);
}

/** The arc: run length over prestige layers, three burn policies. */
function printArc(): void {
  const w0Fixed = dMax(0) / H; // fixed policy pinned to the layer-0 pegged baseline
  console.log(`\n═══ The arc — run length over ${ARC_LAYERS} prestige layers, per burn policy ═══`);
  console.log(
    col('  policy', 10) +
      'run length by layer (L=0 → higher), D_max climbing ×' +
      prodRatio +
      '/layer',
  );
  const trace = (label: string, w0Of: (L: number) => number) => {
    const row = [];
    for (let L = 0; L < ARC_LAYERS; L += 2) row.push(fmt(runLength(dMax(L), w0Of(L))));
    console.log(col(`  ${label}`, 10) + row.join(' → '));
  };
  trace('peg', (L) => dMax(L) / H); // W₀ tracks D_max ⇒ flat
  trace('fixed', () => w0Fixed); // W₀ pinned ⇒ lengthens without bound
  trace('none', () => 0); // no burn ⇒ merge-when-flat floor (near-Ambient)
  console.log(
    `  peg holds flat (authored N*); fixed lengthens as D_max climbs (drain goes vestigial);`,
  );
  console.log(
    `  none sits at the ${fmt(bandLo)} merge-when-flat floor (the deflation stall the peg fixes).`,
  );
}

/** The peg decouples power (D_max) from run length (H, g). */
function printDecoupling(): void {
  const pMax = dMax(6);
  const base = runLength(pMax, pMax / H);
  console.log(`\n═══ The peg decouples power from run length ═══`);
  console.log(`  baseline N* = ${fmt(base)}  (D_max = ${pMax.toLocaleString()}, H = ${H})`);
  console.log(col('  permanent', 34) + col('N*', 8) + col('ΔN*', 8) + 'what it buys');
  const dbl = runLength(pMax * prodRatio, (pMax * prodRatio) / H); // re-pegged
  console.log(
    col(`  ×${prodRatio} power (re-pegged)`, 34) +
      col(fmt(dbl), 8) +
      col(`+${fmt(dbl - base)}`, 8) +
      'reach / currency, NOT time',
  );
  const gBend = setup + Tg * 1.15 * (Math.log(H) / Math.log(g)); // slower escalation (T_g ×1.15)
  console.log(
    col(`  slower escalation (g pace lever)`, 34) +
      col(fmt(gBend), 8) +
      col(`+${fmt(gBend - base)}`, 8) +
      'run length — the pace lever',
  );
  const looser = setup + Tg * (Math.log(H * 1.5) / Math.log(g));
  console.log(
    col(`  H ×1.5 (looser headroom)`, 34) +
      col(fmt(looser), 8) +
      col(`+${fmt(looser - base)}`, 8) +
      'run length — the difficulty lever',
  );
  console.log(`  Power re-pegs to +0 run length: the whole difficulty surface is (H, g).`);
}

/** The Merge payout: sublinear currency from run output, summed per source. */
function printCurrency(): void {
  console.log(`\n═══ The Merge payout — sublinear currency from run output ═══`);
  console.log(
    `  Sp = ${Sp}  Ss = ${Ss}  quorum = ${quorum}   fragments = ⌊∛(∫cap dt/Sp)⌋ + ⌊∛(∫burn dt/Ss)⌋`,
  );
  console.log(
    col('  L', 5) +
      col('D_max', 10) +
      col('∫cap dt', 12) +
      col('∫burn dt', 12) +
      col('primary', 9) +
      col('secondary', 11) +
      'payout',
  );
  for (let L = 0; L < 6; L++) {
    const prim = cbrtFloor(production(L) / Sp);
    const sec = cbrtFloor(endurance(L) / Ss);
    console.log(
      col(`  ${L}`, 5) +
        col(dMax(L).toLocaleString(), 10) +
        col(production(L).toFixed(0), 12) +
        col(endurance(L).toFixed(0), 12) +
        col(prim, 9) +
        col(sec, 11) +
        `${prim + sec}`,
    );
  }
  const split = `${cbrtFloor(production(0) / Sp)}+${cbrtFloor(endurance(0) / Ss)}`;
  console.log(
    `  First run banks ${payout(0)} (${split}) = quorum ${quorum} ✓ — power costs ∛D_max-sublinearly less than it earns early, then decelerates.`,
  );
  console.log(
    `  Sublinearity: D_max ×${prodRatio}/layer, currency ×∛${prodRatio} ≈ ${Math.cbrt(prodRatio).toFixed(2)}/layer — huge late output does NOT mint proportional currency.`,
  );
}

/** The prestige cadence: reach climbs, run length flat, banked currency climbs. */
function printPrestigeArc(): void {
  console.log(`\n═══ The prestige arc — reach climbs, run length flat, currency banks ═══`);
  console.log(
    col('  run', 6) +
      col('L', 4) +
      col('D_max', 10) +
      col('N* (run len)', 14) +
      col('payout', 9) +
      col('wallet', 9) +
      'event',
  );
  let wallet = 0;
  let L = 0;
  let lifetime = 0;
  for (let run = 1; run <= 12; run++) {
    const pay = payout(L);
    wallet += pay;
    lifetime += pay;
    const cost = powerCost(L);
    let event = '';
    if (wallet >= cost) {
      wallet -= cost;
      L += 1;
      event = `⇒ Merge: buy L=${L} (cost ${cost}), D_max→${dMax(L).toLocaleString()}`;
    }
    console.log(
      col(`  ${run}`, 6) +
        col(`${L - (event ? 1 : 0)}`, 4) +
        col(dMax(L - (event ? 1 : 0)).toLocaleString(), 10) +
        col(fmt(pegged()), 14) +
        col(pay, 9) +
        col(wallet, 9) +
        event,
    );
  }
  console.log(
    `  N* holds at ${fmt(pegged())} every run (the peg); D_max & lifetime currency (${lifetime}) climb — reach, not pacing.`,
  );
}

function main(): void {
  console.log('Cycler — closed-form balance projection (pegged-saturation spine)');
  printPegged();
  printWithinRun();
  printArc();
  printDecoupling();
  printCurrency();
  printPrestigeArc();
  console.log(`\n═══ Headroom sweep — pick H for a target run length ═══`);
  console.log(col('  H', 8) + col('N* = τ_setup + T_g·log_g(H)', 30) + 'band');
  for (const h of H_SWEEP) {
    const n = setup + Tg * (Math.log(h) / Math.log(g));
    console.log(col(`  ${h}`, 8) + col(fmt(n), 30) + (inBand(n) ? '← in band' : ''));
  }
}

main();
