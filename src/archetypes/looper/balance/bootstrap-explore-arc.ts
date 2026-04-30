/**
 * Closed-form bootstrap arithmetic — explore-only arc.
 *
 * Discovery script. No engine. Pure state-machine simulation of the
 * canonical Looper bootstrap under an explore-only strategy: roam
 * progression + crack harvest, no acquaint, no gold, no trade.
 *
 * Goal: characterize the manaAdded(loop) curve from first principles so
 * we can identify the breakpoint where there's enough free-mana headroom
 * to extend the plan beyond pure explore.
 *
 * # Constants (mirror data/actions.ts + data/progress-vars.ts)
 *
 *   initialMana       = 250
 *   roam.manaCost     = 150
 *   crack.manaCost    = 200, rewardRatio=10, reward=+100 mana
 *   cache.total       = 5 × roam.level     (perLevel from progress-vars.ts)
 *   xpForLevel(N)     = 4 × N²
 *   roam XP/completion= 1                  (expMult × manaCost/adjustedTicks)
 *
 * # State machine (per loop)
 *
 *   (roam_lvl, roam_xp, lifetimeChecked, totalRoams)  →  plan + manaAdded
 *
 * Plan emission mirrors planner.ts passes 2 + 3 + 6 under explore-only:
 *
 *   Pass 2: if poolCapacity > 0, emit {crack: poolCapacity}
 *   Pass 3: emit {roam: 1}
 *   Pass 6: trim tail until total cost ≤ initialMana + projectedRewardMana
 *
 * # Output
 *
 *   Per-loop table: state vars, plan, cost, manaAdded, freeMana
 *   Summary: phase milestones, reward cadence, breakpoint analysis
 *
 * Run: pnpm exec vite-node src/archetypes/looper/balance/bootstrap-explore-arc.ts
 */

// ─── Constants ────────────────────────────────────────────────────────────

const INITIAL_MANA = 250;
const OVERSUPPLY = 1.0;
const ROAM_COST = 150;
// Vanilla idle-loops Wander: progressAmount=200 per completion (data/actions.ts).
const ROAM_XP_PER_COMPLETION = 200;
const CRACK_COST = 200;
const CRACK_REWARD = 100;
const CRACK_REWARD_RATIO = 10;
const CACHE_PER_ROAM_LEVEL = 5;

// Targets for breakpoint analysis — when manaAdded sustains above each
// threshold, plan can fit the named additional content.
//   freeMana >= 150 → can fit one acquaint progression alongside explore
//   freeMana >= 220 → can fit one slip (gold-emitter) alongside explore
//   freeMana >= 250 → can fit one run (better gold-emitter) alongside explore
//   freeMana >= 300 → can fit one trade alongside explore + gold-emitter
const ACQUAINT_COST = 150;
const SLIP_COST = 220;
const RUN_COST = 250;
const TRADE_COST = 300;

const MAX_LOOPS = 200;

// ─── Math helpers ─────────────────────────────────────────────────────────

function levelFromXp(xp: number): number {
  // Vanilla idle-loops curve: floor((sqrt(8x/100 + 1) - 1) / 2),
  // inverse xpForLevel(N) = 50N(N+1).
  return Math.floor((Math.sqrt((8 * xp) / 100 + 1) - 1) / 2);
}

/** Closed-form rewards in `K` cracks starting at lifetimeChecked = lc. */
function rewardsFired(lc: number, K: number, R: number): number {
  if (K <= 0 || R <= 0) return 0;
  return Math.floor((lc + K) / R) - Math.floor(lc / R);
}

// ─── Plan emission for one loop ──────────────────────────────────────────

interface LoopState {
  roamXp: number;
  roamLevel: number;
  lifetimeChecked: number;
}

interface LoopPlan {
  crackLoops: number;
  roamLoops: number;
  cost: number;
  rewardsFired: number;
  manaAdded: number;
  budgetCap: number;
  freeMana: number;
  poolCapacityAtStart: number;
  cacheTotalAtStart: number;
}

/**
 * Emit + trim the plan for a single loop under explore-only strategy.
 * Mirrors planner.ts passes 2/3/6 logic exactly:
 *
 *   1. Emit {crack: poolCapacity} (Pass 2 explore).
 *   2. Emit {roam: 1} (Pass 3 progression, single chunk per OL-799).
 *   3. budgetCap = initialMana + projectedManaAdded (snapshot once).
 *   4. Tail-shrink until cost ≤ budgetCap. Roam drops first, then crack
 *      chain shrinks one completion at a time.
 *   5. Reward projection unwinds per crack-shrink.
 */
function emitPlan(state: LoopState): LoopPlan {
  const cacheTotal = CACHE_PER_ROAM_LEVEL * state.roamLevel;
  const poolCapacity = Math.max(0, cacheTotal - state.lifetimeChecked);

  // Initial emission: {crack: poolCapacity, roam: 1}
  let crackK = poolCapacity;
  let roam = 1;
  const projected = CRACK_REWARD * rewardsFired(state.lifetimeChecked, crackK, CRACK_REWARD_RATIO);
  const budgetCap = INITIAL_MANA * OVERSUPPLY + projected;

  // Trim tail: roam first, then shrink crack one at a time.
  const cost = () => CRACK_COST * crackK + ROAM_COST * roam;
  while (cost() > budgetCap) {
    if (roam > 0) {
      roam = 0;
      continue;
    }
    if (crackK > 0) {
      crackK -= 1;
      // Reward projection unwinds per shrink (matches planner shrinkTailByOne).
      // Note: budgetCap is HELD FIXED (planner.ts:788) — we don't recompute
      // it as projection unwinds. Same here.
      continue;
    }
    break;
  }

  const finalCost = cost();
  const finalRewards = rewardsFired(state.lifetimeChecked, crackK, CRACK_REWARD_RATIO);
  const finalMana = CRACK_REWARD * finalRewards;
  const freeMana = budgetCap - finalCost;

  return {
    crackLoops: crackK,
    roamLoops: roam,
    cost: finalCost,
    rewardsFired: finalRewards,
    manaAdded: finalMana,
    budgetCap,
    freeMana,
    poolCapacityAtStart: poolCapacity,
    cacheTotalAtStart: cacheTotal,
  };
}

function applyPlan(state: LoopState, plan: LoopPlan): LoopState {
  const newRoamXp = state.roamXp + plan.roamLoops * ROAM_XP_PER_COMPLETION;
  return {
    roamXp: newRoamXp,
    roamLevel: levelFromXp(newRoamXp),
    lifetimeChecked: state.lifetimeChecked + plan.crackLoops,
  };
}

// ─── Driver + report ─────────────────────────────────────────────────────

interface LoopRow {
  loop: number;
  state: LoopState;
  plan: LoopPlan;
}

function simulate(): LoopRow[] {
  let state: LoopState = { roamXp: 0, roamLevel: 0, lifetimeChecked: 0 };
  const rows: LoopRow[] = [];
  for (let n = 0; n < MAX_LOOPS; n++) {
    const plan = emitPlan(state);
    if (plan.crackLoops === 0 && plan.roamLoops === 0) {
      // Steady-state stuck — no plan possible, abort.
      break;
    }
    rows.push({ loop: n, state, plan });
    state = applyPlan(state, plan);
  }
  return rows;
}

function pad(s: string | number, w: number): string {
  return String(s).padStart(w);
}

function reportTable(rows: LoopRow[]): void {
  console.log('# Looper bootstrap — explore-only arc (closed-form simulation)\n');
  console.log(
    `Constants: initialMana=${INITIAL_MANA} crack.cost=${CRACK_COST} crack.reward=${CRACK_REWARD}`,
  );
  console.log(
    `           roam.cost=${ROAM_COST} cache.perLevel=${CACHE_PER_ROAM_LEVEL} rewardRatio=${CRACK_REWARD_RATIO}\n`,
  );

  const header = [
    'loop',
    'rmLvl',
    'rmXp',
    'lifeChk',
    'cache',
    'poolCap',
    'crack',
    'roam',
    'cost',
    'budget',
    'rewards',
    'manaAdd',
    'freeMana',
  ];
  const widths = header.map((h) => h.length);
  console.log(header.map((h, i) => pad(h, widths[i]!)).join(' | '));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));

  for (const row of rows) {
    const r = [
      row.loop,
      row.state.roamLevel,
      row.state.roamXp,
      row.state.lifetimeChecked,
      row.plan.cacheTotalAtStart,
      row.plan.poolCapacityAtStart,
      row.plan.crackLoops,
      row.plan.roamLoops,
      row.plan.cost,
      row.plan.budgetCap,
      row.plan.rewardsFired,
      row.plan.manaAdded,
      row.plan.freeMana,
    ];
    console.log(r.map((v, i) => pad(v, widths[i]!)).join(' | '));
  }
  console.log();
}

function reportMilestones(rows: LoopRow[]): void {
  console.log('## Phase milestones\n');
  const firstCrackLoop = rows.findIndex((r) => r.plan.crackLoops > 0);
  const firstRewardLoop = rows.findIndex((r) => r.plan.rewardsFired > 0);

  console.log(
    `First crack:        loop ${firstCrackLoop} (state at start: ${JSON.stringify(rows[firstCrackLoop]?.state)})`,
  );
  console.log(
    `First reward fires: loop ${firstRewardLoop} (state at start: ${JSON.stringify(rows[firstRewardLoop]?.state)})`,
  );

  // Subsequent reward loops + cadence.
  const rewardLoops = rows.filter((r) => r.plan.rewardsFired > 0).map((r) => r.loop);
  if (rewardLoops.length > 1) {
    console.log(`Reward loops (first 8): ${rewardLoops.slice(0, 8).join(', ')}`);
    const gaps: number[] = [];
    for (let i = 1; i < rewardLoops.length && i < 8; i++) {
      gaps.push(rewardLoops[i] - rewardLoops[i - 1]);
    }
    console.log(`Gaps between rewards: ${gaps.join(', ')}`);
  }
  console.log();
}

function reportFreeManaThresholds(rows: LoopRow[]): void {
  console.log('## Breakpoint analysis (free-mana headroom thresholds)\n');
  console.log('Free mana = budgetCap - planCost. The "could fit one X" answer.');
  console.log('Threshold is the FIRST loop where freeMana ≥ X. (One-shot, not sustained.)\n');

  const thresholds = [
    { label: `≥ ${ACQUAINT_COST} (acquaint progression)`, value: ACQUAINT_COST },
    { label: `≥ ${SLIP_COST} (slip — gold via latch)`, value: SLIP_COST },
    { label: `≥ ${RUN_COST} (run — gold via errand)`, value: RUN_COST },
    { label: `≥ ${TRADE_COST} (trade — gold→mana)`, value: TRADE_COST },
  ];

  for (const t of thresholds) {
    const idx = rows.findIndex((r) => r.plan.freeMana >= t.value);
    if (idx >= 0) {
      const r = rows[idx];
      console.log(
        `  freeMana ${t.label.padEnd(40)} first reached at loop ${r.loop} (freeMana=${r.plan.freeMana}, manaAdded=${r.plan.manaAdded}, rmLvl=${r.state.roamLevel})`,
      );
    } else {
      console.log(`  freeMana ${t.label.padEnd(40)} NEVER reached in ${rows.length} loops`);
    }
  }
  console.log();

  // Sustained crossings (freeMana stays ≥ X for K consecutive loops).
  const SUSTAIN_K = 5;
  console.log(`## Sustained crossings (freeMana ≥ X for ≥ ${SUSTAIN_K} consecutive loops)\n`);
  for (const t of thresholds) {
    let runStart = -1;
    let foundAt = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].plan.freeMana >= t.value) {
        if (runStart < 0) runStart = i;
        if (i - runStart + 1 >= SUSTAIN_K) {
          foundAt = runStart;
          break;
        }
      } else {
        runStart = -1;
      }
    }
    if (foundAt >= 0) {
      console.log(`  ${t.label.padEnd(40)} sustained at loop ${rows[foundAt].loop}`);
    } else {
      console.log(`  ${t.label.padEnd(40)} NEVER sustained for ${SUSTAIN_K} loops`);
    }
  }
  console.log();
}

function reportSummary(rows: LoopRow[]): void {
  console.log('## Final state\n');
  const last = rows[rows.length - 1];
  if (!last) return;
  console.log(`Loops simulated: ${rows.length}`);
  console.log(
    `Final state: roam_lvl=${last.state.roamLevel} roam_xp=${last.state.roamXp} lifetimeChecked=${last.state.lifetimeChecked}`,
  );
  const totalManaAdded = rows.reduce((a, r) => a + r.plan.manaAdded, 0);
  const totalRewards = rows.reduce((a, r) => a + r.plan.rewardsFired, 0);
  const totalCracks = rows.reduce((a, r) => a + r.plan.crackLoops, 0);
  const totalRoams = rows.reduce((a, r) => a + r.plan.roamLoops, 0);
  console.log(
    `Cumulative: roams=${totalRoams} cracks=${totalCracks} rewards=${totalRewards} manaAdded=${totalManaAdded}`,
  );
  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────

function main(): void {
  const rows = simulate();
  reportTable(rows);
  reportMilestones(rows);
  reportFreeManaThresholds(rows);
  reportSummary(rows);
}

main();
