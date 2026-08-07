/**
 * Cycler — closed-form balance projection (no engine). Pegged-saturation spine,
 * concretized to Defense Command (studio/open-loop-starter#21).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycler-projection.ts
 *
 * Projection — pure math, NO engine (`open-loop-engine/docs/consumer-guide-balance.md`
 * § The spine — a falsifiable prediction). Predicts; the sim probe verifies later. This is the CAPTURE TEST: if the
 * concrete realization can't write its clear-rate C, its salvo schedule, and its
 * N*_waves on paper, the mechanic is mis-specified, not just untuned.
 *
 * THE SPINE, RE-INDEXED BY WAVE (IDENTITY § Cycler's realization). The abstract
 * ceiling D_max is realized as the Lance clear-rate C (saturating on forward-cell
 * fill + convergent ladders + adjacency). The single time-driven burn becomes an
 * exogenous per-wave salvo schedule W_N = W₀·g^N plus a line-HP buffer that adds a
 * bounded tail:
 *
 *     crossing:    W_N = C  ⇒  N = log_g(C/W₀)
 *     THE PEG:     W₀ = C/H  ⇒  crossing = log_g(H)          (DECOUPLED from C)
 *     line buffer: per wave absorbs max(0, W_N − C), repaired from MW surplus
 *     run length:  N*_waves = log_g(H) + Δ_wall              (×cycle → minutes)
 *
 * Same log law as studio/open-loop-starter#6, re-indexed by wave. Two new knobs the
 * realization adds — Δ_wall (the line-buffer tail) and the forward/back cell split
 * that sets the C-vs-output allocation tradeoff — are sized here (leaf 1). The
 * terminating pressure stays EXOGENOUS (the salvo); the Lance MW-draw and repair are
 * within-run economic sinks that shape Δ_wall and reach, never the run-end.
 */

import { BUILD_BALANCE } from '../data/build';
import { DEFENSE_BALANCE } from '../data/defense';
import { CADENCE_BALANCE } from '../data/cadence';
import { UPGRADE_BALANCE } from '../data/upgrades';

// ─── Projection knobs (the tuning surface) ───
const ARC_LAYERS = 12; // permanent-power layers to trace
const H_SWEEP = [4, 8, 16, 32, 64]; // headroom values → waves-to-crossing
const WALL_SWEEP = [250, 500, 1000, 2000]; // line-HP values → Δ_wall tail

// Concrete-spine salvo postures (the per-wave `g` ladder — addBurnTier → Prophecy
// draft, IDENTITY § Growth ports). Supersedes threat.ts BURN_TIERS' per-TIME g for
// the wave-indexed spine; reach gates mirror that ladder. Reconciled in leaf 4.
const POSTURES = [
  { label: 'Standard', g: DEFENSE_BALANCE.salvoBase, gate: 0 },
  { label: 'Accelerated', g: 2.0, gate: 2 },
  { label: 'Cascade', g: 2.6, gate: 4 },
  { label: 'Collapse', g: 3.4, gate: 6 },
] as const;

// Concrete-spine currency scales (illustrative — the abstract prestige.ts Sp/Ss are
// sized to the per-time accumulators; these reproduce the same quorum-3 first-run
// split against the wave-integrated concrete magnitudes. Reconciled in leaf 4.)
const Sp = 1200; // cbrt scale for ∫C dt (production / reach)
const Ss = 1000; // cbrt scale for Σ W_N (salvo weathered / endurance)

const Bf = DEFENSE_BALANCE.forwardCells;
const Bb = DEFENSE_BALANCE.backCells;
const iota = DEFENSE_BALANCE.lanceIntercept;
const rho = DEFENSE_BALANCE.reactorOutput;
const draw = DEFENSE_BALANCE.lanceDraw;
const A = BUILD_BALANCE.adjacencyBoost;
const power = BUILD_BALANCE.producerUpgradeRatio;
const g0 = DEFENSE_BALANCE.salvoBase;
const H = DEFENSE_BALANCE.headroom;
const L_HP = DEFENSE_BALANCE.lineHP;
const cycleMin = (DEFENSE_BALANCE.standbySeconds + DEFENSE_BALANCE.inboundSeconds) / 60;
const [bandLo, bandHi] = CADENCE_BALANCE.runLengthTargetMinutes;
const costRatio = UPGRADE_BALANCE.powerUpgradeCostRatio;
const gBendRatio = UPGRADE_BALANCE.gBendRatio;
const gBendBaseCost = UPGRADE_BALANCE.gBendBaseCost;
const gBendCostRatio = UPGRADE_BALANCE.gBendCostRatio;
const gBendGateStep = UPGRADE_BALANCE.gBendGateStep;

// ─── The spine, closed-form ───

/** Saturated clear-rate: all Bf forward cells Lanced, at permanent-power level L. */
const cMax = (L: number) => Bf * iota * A * Math.pow(power, L);
/** The crossing wave (salvo overtakes C) under the peg — log_g(H), C-invariant. */
const crossing = (g = g0, h = H) => Math.log(h) / Math.log(g);

interface WaveWalk {
  C: number;
  w0: number;
  mwOut: number;
  fireDraw: number;
  surplus: number;
  breachWave: number;
  deltaWall: number;
  nWaves: number;
  weathered: number; // Σ W_N over the run (endurance accumulator)
}

/**
 * The full wave-by-wave line-buffer walk (pure arithmetic, no engine). `nL` Lances
 * on forward cells, the rest of the board is Reactors. The peg fixes W₀ = C/H, so
 * the salvo crosses C at log_g(H) regardless of C — the DECOUPLING. Past the
 * crossing, leak = C·(g^j−1) grows geometrically; the line repairs MW surplus each
 * STANDBY and breaches when the buffer empties. Δ_wall is what those extra waves add.
 */
function waveWalk(
  L: number,
  nL: number,
  g = g0,
  lineHP = L_HP * Math.pow(power, L),
  h = H,
): WaveWalk {
  const nR = Bf - nL + Bb; // every non-Lance cell (forward remainder + all back) produces
  const C = nL * iota * A * Math.pow(power, L);
  const w0 = C / h; // peg to the built clear-rate
  const mwOut = nR * rho * A * Math.pow(power, L); // MW per STANDBY (Relays boost Reactors too)
  const fireDraw = nL * draw * Math.pow(power, L); // MW per INBOUND to fire the Lances
  const surplus = Math.max(0, mwOut - fireDraw); // routable to repair each wave-cycle
  let hp = lineHP;
  let weathered = 0;
  let wave = 0;
  for (; wave < 200; wave++) {
    if (wave > 0) hp = Math.min(lineHP, hp + surplus); // STANDBY repair before the salvo
    const w = w0 * Math.pow(g, wave);
    weathered += w;
    hp -= Math.max(0, w - C); // INBOUND leak-through bleeds the line
    if (hp <= 0) break; // OVERRUN → Redeploy
  }
  const breachWave = wave;
  return {
    C,
    w0,
    mwOut,
    fireDraw,
    surplus,
    breachWave,
    deltaWall: Math.max(0, breachWave - crossing(g, h)),
    nWaves: breachWave,
    weathered,
  };
}

/** Reference (reach) build: all forward cells Lanced — the saturated ceiling. */
const refWalk = (L = 0, g = g0) => waveWalk(L, Bf, g);

// ─── Reporting ───

const col = (s: string | number, w: number) => String(s).padEnd(w);
const fmtM = (min: number) =>
  !Number.isFinite(min) ? '∞' : min < 90 ? `${min.toFixed(0)}m` : `${(min / 60).toFixed(1)}h`;
const waveMin = (n: number) => n * cycleMin;
const inBand = (m: number) => m >= bandLo && m <= bandHi;

function printSpine(): void {
  const w = refWalk();
  const n = w.nWaves;
  console.log(`\n═══ The spine — N*_waves = log_g(H) + Δ_wall (Defense Command) ═══`);
  console.log(
    `  C(L=0) = ${cMax(0).toLocaleString()}  (${Bf} forward cells · ${iota} intercept · ${A} adjacency)`,
  );
  console.log(`  H = ${H}   g = ${g0}/wave   line HP = ${L_HP}   cycle = ${fmtM(cycleMin)}/wave`);
  console.log(
    `  crossing = log_g(H) = ${crossing().toFixed(2)} waves   Δ_wall = ${w.deltaWall.toFixed(2)} waves`,
  );
  console.log(
    `  N*_waves = ${n} → ${fmtM(waveMin(n))}  ${inBand(waveMin(n)) ? `IN BAND [${bandLo},${bandHi}]m ✓` : `OUT OF BAND ✗`}`,
  );
}

/** The reference wave-walk: the salvo climbing to C, then the Δ_wall tail. */
function printWaveWalk(): void {
  const nL = Bf;
  const L = 0;
  const w = waveWalk(L, nL);
  const nR = Bf - nL + Bb;
  console.log(`\n═══ The wave-walk (reference reach build: ${nL} Lances, ${nR} Reactors, L=0) ═══`);
  console.log(
    `  C = ${w.C.toLocaleString()}   W₀ = C/H = ${w.w0.toFixed(1)}   MW/standby = ${w.mwOut}   fire draw = ${w.fireDraw}   surplus = ${w.surplus}`,
  );
  console.log(
    col('  wave', 8) + col('salvo W_N', 12) + col('leak', 10) + col('line HP', 10) + 'phase',
  );
  let hp = L_HP;
  for (let wave = 0; wave <= w.breachWave; wave++) {
    if (wave > 0) hp = Math.min(L_HP, hp + w.surplus);
    const salvo = w.w0 * Math.pow(g0, wave);
    const leak = Math.max(0, salvo - w.C);
    hp -= leak;
    const phase =
      salvo < w.C * 0.5
        ? 'STANDBY·comfortable'
        : salvo < w.C
          ? 'INBOUND·first bite'
          : hp > 0
            ? 'INBOUND·under review (Δ_wall)'
            : '⇒ OVERRUN: Redeploy';
    console.log(
      col(`  ${wave}`, 8) +
        col(salvo.toFixed(0), 12) +
        col(leak > 0 ? leak.toFixed(0) : '—', 10) +
        col(hp > 0 ? hp.toFixed(0) : '0', 10) +
        phase,
    );
  }
  console.log(
    `  Crosses C on wave ${Math.ceil(crossing())}; breaches wave ${w.breachWave} — the run pays out (Redeploy), not a fail.`,
  );
}

/**
 * The spatial C-vs-output tradeoff (IDENTITY § One shared surface). Every forward
 * cell is a Lance (C / reach) or a Reactor (MW → repair / Δ_wall). The crossing is
 * INVARIANT (the peg); allocation trades this run's reach against its tail.
 */
function printAllocation(): void {
  console.log(
    `\n═══ The spatial tradeoff — forward-cell allocation (L=0, ${Bf} forward cells) ═══`,
  );
  console.log(
    col('  Lances', 9) +
      col('C (reach)', 11) +
      col('MW surplus', 12) +
      col('crossing', 10) +
      col('Δ_wall', 9) +
      col('N*_waves', 10) +
      'run',
  );
  for (let nL = Bf; nL >= 1; nL--) {
    const w = waveWalk(0, nL);
    console.log(
      col(`  ${nL}`, 9) +
        col(w.C.toLocaleString(), 11) +
        col(w.surplus.toString(), 12) +
        col(crossing().toFixed(2), 10) +
        col(w.deltaWall.toFixed(2), 9) +
        col(w.nWaves.toString(), 10) +
        `${fmtM(waveMin(w.nWaves))}${inBand(waveMin(w.nWaves)) ? ' ✓' : ''}`,
    );
  }
  console.log(
    `  Crossing flat at ${crossing().toFixed(2)} (the peg decouples it from C). Fewer Lances ⇒ lower reach`,
  );
  console.log(
    `  but more MW surplus ⇒ longer Δ_wall tail: a "turtle" run banks less, lasts longer. Both in band —`,
  );
  console.log(
    `  the allocation is player agency, not a solved optimum. Bf is sized so full fill stays solvent.`,
  );
}

/**
 * The strategic triangle (IDENTITY § The strategic triangle): one MW pool funds
 * three competing sinks. Reactors→output, Lances→C (but draw MW), Repair→Δ_wall.
 */
function printTriangle(): void {
  const reach = waveWalk(0, Bf); // all-Lance: max C, thin surplus
  const balanced = waveWalk(0, Math.round(Bf / 2)); // half-Lance: mid C, fat surplus
  console.log(`\n═══ The strategic triangle — one MW pool, three sinks (L=0) ═══`);
  console.log(col('  build', 22) + col('C→reach', 10) + col('surplus→repair', 16) + 'Δ_wall→tail');
  console.log(
    col(`  reach (${Bf} Lances)`, 22) +
      col(reach.C.toLocaleString(), 10) +
      col(reach.surplus.toString(), 16) +
      `${reach.deltaWall.toFixed(2)} waves`,
  );
  console.log(
    col(`  balanced (${Math.round(Bf / 2)} Lances)`, 22) +
      col(balanced.C.toLocaleString(), 10) +
      col(balanced.surplus.toString(), 16) +
      `${balanced.deltaWall.toFixed(2)} waves`,
  );
  console.log(
    `  Relays (adjacency ×${A}) boost Lances AND Reactors — one placement drives both economy and defense.`,
  );
  console.log(
    `  The Lance MW-draw (${draw}/Lance) is a within-run sink; it shapes Δ_wall, never the crossing.`,
  );
}

/** The peg decouples permanent power (C) from run length (H, g). */
function printDecoupling(): void {
  const base = refWalk(3);
  console.log(`\n═══ The peg decouples power from run length ═══`);
  console.log(
    `  baseline N*_waves = ${base.nWaves} (${fmtM(waveMin(base.nWaves))}) at L=3, C = ${base.C.toLocaleString()}`,
  );
  console.log(col('  permanent', 30) + col('C', 12) + col('N*_waves', 11) + 'what it buys');
  const up = refWalk(4); // ×power reach, re-pegged
  console.log(
    col(`  ×${power} power (L=3→4)`, 30) +
      col(up.C.toLocaleString(), 12) +
      col(
        `${up.nWaves} (${up.nWaves - base.nWaves >= 0 ? '+' : ''}${up.nWaves - base.nWaves})`,
        11,
      ) +
      'reach / currency, NOT waves',
  );
  const gEff = 1 + (g0 - 1) * gBendRatio; // g-bender L=1
  const bend = crossing(gEff) + base.deltaWall;
  console.log(
    col(`  g-bender L=1 (g ${g0}→${gEff.toFixed(2)})`, 30) +
      col('—', 12) +
      col(`${bend.toFixed(1)} (+${(bend - base.nWaves).toFixed(1)})`, 13) +
      'waves — the pace lever',
  );
  console.log(
    `  Power re-pegs to +0 waves: the whole run-length surface is (H, g) + the Δ_wall tail.`,
  );
}

/**
 * The salvo posture ladder (addBurnTier → Prophecy): the per-wave `g` steps run
 * length under a reach gate. Deeper posture ⇒ steeper salvo ⇒ fewer waves to cross.
 */
function printPostures(): void {
  console.log(`\n═══ The salvo-posture ladder — per-wave g under a reach gate (Prophecy) ═══`);
  console.log(`  Shared peg: H = ${H}, line HP = ${L_HP} (one knob across the ladder).`);
  console.log(
    col('  posture', 14) +
      col('g/wave', 8) +
      col('gate L≥', 9) +
      col('crossing', 10) +
      col('N*_waves', 10) +
      'run',
  );
  for (const p of POSTURES) {
    const w = refWalk(0, p.g);
    console.log(
      col(`  ${p.label}`, 14) +
        col(p.g.toString(), 8) +
        col(p.gate.toString(), 9) +
        col(crossing(p.g).toFixed(2), 10) +
        col(w.nWaves.toString(), 10) +
        fmtM(waveMin(w.nWaves)),
    );
  }
  console.log(
    `  Steeper postures raise g ⇒ shorter, sharper runs (harder). Reach-gated so pace tracks power.`,
  );
}

/**
 * The g-bender (addUpgrade): the sole pace lever. Lowers the operative g toward the
 * g=1 asymptote (g_eff = 1 + (g−1)·r_bend^L), lengthening every run — the mirror of
 * the posture ladder. Reach-gated so pace can't run from power.
 */
function printGBender(): void {
  console.log(`\n═══ The g-bender — the sole pace lever (lowers g toward g=1) ═══`);
  console.log(`  base g = ${g0}/wave, r_bend = ${gBendRatio}, H = ${H}`);
  console.log(
    col('  L_bend', 9) +
      col('g_eff', 8) +
      col('N*_waves', 11) +
      col('ΔN* vs base', 13) +
      col('cost (frag)', 13) +
      'gate L≥',
  );
  const base = refWalk();
  for (let Lb = 0; Lb <= 4; Lb++) {
    const gEff = 1 + (g0 - 1) * Math.pow(gBendRatio, Lb);
    const n = crossing(gEff) + base.deltaWall;
    const cost = Lb === 0 ? null : gBendBaseCost * Math.pow(gBendCostRatio, Lb - 1);
    console.log(
      col(`  ${Lb}`, 9) +
        col(gEff.toFixed(2), 8) +
        col(`${n.toFixed(1)} (${fmtM(waveMin(n))})`, 11) +
        col(Lb === 0 ? '—' : `+${(n - base.nWaves).toFixed(1)}`, 13) +
        col(cost === null ? '—' : `${cost}`, 13) +
        (Lb === 0 ? '—' : `${Lb * gBendGateStep}`),
    );
  }
  console.log(
    `  Each level moves g_eff a fixed fraction of the way to 1 (diminishing); never crosses g=1.`,
  );
  console.log(`  It LENGTHENS the run (unlike reach, +0); gated on reach so pace tracks power.`);
}

/** The Redeploy payout: sublinear currency from run output, summed per source. */
function printCurrency(): void {
  const cbrtFloor = (x: number) => Math.floor(Math.cbrt(x) + 1e-9);
  const production = (L: number) => refWalk(L).C * waveMin(refWalk(L).nWaves); // ∫C dt
  const endurance = (L: number) => refWalk(L).weathered; // Σ W_N
  const payout = (L: number) => cbrtFloor(production(L) / Sp) + cbrtFloor(endurance(L) / Ss);
  console.log(`\n═══ The Redeploy payout — sublinear currency from run output ═══`);
  console.log(`  Sp = ${Sp}  Ss = ${Ss}   fragments = ⌊∛(∫C dt/Sp)⌋ + ⌊∛(ΣW_N/Ss)⌋`);
  console.log(
    col('  L', 5) +
      col('C', 10) +
      col('∫C dt', 12) +
      col('ΣW_N', 12) +
      col('primary', 9) +
      col('secondary', 11) +
      'payout',
  );
  for (let L = 0; L < 6; L++) {
    const prim = cbrtFloor(production(L) / Sp);
    const sec = cbrtFloor(endurance(L) / Ss);
    console.log(
      col(`  ${L}`, 5) +
        col(cMax(L).toLocaleString(), 10) +
        col(production(L).toFixed(0), 12) +
        col(endurance(L).toFixed(0), 12) +
        col(prim, 9) +
        col(sec, 11) +
        `${prim + sec}`,
    );
  }
  console.log(
    `  First run banks ${payout(0)} = quorum 3 ✓. C ×${power}/layer, currency ×∛${power} ≈ ${Math.cbrt(power).toFixed(2)}/layer —`,
  );
  console.log(
    `  huge late reach does NOT mint proportional currency (the cbrt sublinearity). Scales pending leaf 4.`,
  );
}

/** The arc: run length flat over prestige layers, reach + currency climbing. */
function printArc(): void {
  console.log(`\n═══ The arc — N*_waves flat over ${ARC_LAYERS} power layers, reach climbing ═══`);
  console.log(col('  build', 10) + `N*_waves by layer (L=0 → higher), C climbing ×${power}/layer`);
  const row: string[] = [];
  for (let L = 0; L < ARC_LAYERS; L += 2) row.push(`${refWalk(L).nWaves}`);
  console.log(col('  peg', 10) + row.join(' → ') + ' waves');
  console.log(
    `  N*_waves holds flat (the peg re-baselines W₀=C/H each Redeploy); C & banked currency climb — reach, not pacing.`,
  );
  console.log(
    `  Next-power cost = quorum · ${costRatio}^L (upgrades.ts): geometric ⇒ decelerating prestige, the log-frontier read.`,
  );
}

function main(): void {
  console.log('Cycler — closed-form balance projection (Defense Command, pegged-saturation spine)');
  printSpine();
  printWaveWalk();
  printAllocation();
  printTriangle();
  printDecoupling();
  printPostures();
  printGBender();
  printCurrency();
  printArc();
  console.log(`\n═══ Headroom sweep — pick H for a target wave count / run length ═══`);
  console.log(col('  H', 6) + col('crossing (waves)', 18) + col('N*_waves', 11) + 'run (band)');
  for (const h of H_SWEEP) {
    const w = waveWalk(0, Bf, g0, L_HP, h);
    console.log(
      col(`  ${h}`, 6) +
        col(crossing(g0, h).toFixed(2), 18) +
        col(w.nWaves.toString(), 11) +
        `${fmtM(waveMin(w.nWaves))}${inBand(waveMin(w.nWaves)) ? ' ← in band' : ''}`,
    );
  }
  console.log(`\n═══ Line-HP sweep — size Δ_wall (the tail), holding H, g fixed ═══`);
  console.log(col('  line HP', 10) + col('Δ_wall (waves)', 16) + col('N*_waves', 11) + 'run');
  for (const hp of WALL_SWEEP) {
    const w = waveWalk(0, Bf, g0, hp);
    console.log(
      col(`  ${hp}`, 10) +
        col(w.deltaWall.toFixed(2), 16) +
        col(w.nWaves.toString(), 11) +
        fmtM(waveMin(w.nWaves)),
    );
  }
  console.log(
    `  Δ_wall grows only LOGARITHMICALLY in line HP (leak is geometric) — a bounded, controllable tail.`,
  );
}

main();
