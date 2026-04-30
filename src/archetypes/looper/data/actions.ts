import type { ActionDef } from './types';

// ─── Skeleton ───
// 9 actions across 2 zones, discriminated over `type: 'progress' | 'regular' |
// 'basic'`. Reground per OL-802 to vanilla idle-loops town 0 (Hearth) and town
// 1 (Wilds) — every numerical claim cites
// `open-loop-research/reference-code/idle-loops-omsi/loops/actionList.js:line`.
//
// Action-type mix:
//   - 4 progress (roam, acquaint, trail, mark)         — drive progressVar XP
//   - 4 regular  (crack, slip, drink, gather)          — drain regularVar pools
//   - 1 basic    (trade)                               — gold↔mana exchange
//
// Cost shape: weight-coupled per canonical (see types.ts § ActionDef.weights).
// Same weight controls cost contribution AND XP gain. Sums of weights are
// nominally ≈ 1 (vanilla every action sums weights to 1.0), giving a clean
// per-mana XP-yield interpretation.
//
// `expMult: 1` uniform across the entire action set — matches vanilla town 0
// and town 1 baselines (vanilla reserves expMult > 1 for explicit
// stat-trainer actions, e.g. Train Strength at 2000 mana behind `met ≥ 5`,
// which the slim demo doesn't include).
//
// Prereq web (post-reground):
//   Roam ≥ 3            → Slip    visible  (Hearth gold pool entry)
//                                            [vanilla `wander ≥ 3` visibility,
//                                             actionList.js:266]
//   Roam ≥ 3            → Trade   visible  (Hearth gold-spend exchange)
//                                            [vanilla `wander ≥ 3` visibility,
//                                             actionList.js:337]
//   Roam ≥ 5            → Trail   visible  (Hearth → Wilds zone-gate)
//                                            [slim-demo invention; vanilla
//                                             gates on `wander ≥ 60` via
//                                             WalkOldRoad which we don't model]
//   Roam ≥ 5            → Drink   visible  (Wilds zone-gate)
//   Roam ≥ 10           → Acquaint visible (Hearth late-progress)
//                                            [vanilla `wander ≥ 10` visibility
//                                             on Meet People, actionList.js:380]
//   Roam ≥ 5
//     AND Trail ≥ 1     → Mark    visible  (Wilds secondary progress)
//   Roam ≥ 5
//     AND Vigor Talent ≥ 1
//     AND loops ≥ 3     → Gather  visible  (Wilds late-game multi-prereq)
//
// Variants exercised: progress-var-level (most), capability-tier-level (Gather),
// loop-count (Gather). Always-implicit (no `prereqs`): Roam, Crack. The
// action-completion-count and always-explicit variants are implemented in the
// engine but unexercised by the slim demo's prereq web; forks adding content
// can use them.
//
// Roam and Crack are always-visible (always-implicit) so the bootstrap arc has
// a viable mana-positive spine from loop 1 (Crack on the per-loop pots-pool;
// Roam to grow the pool across loops).
//
// ─── Costume ───
// Theme-fresh action set — an everyday-craft adventure stack. Names lean
// short verbs over noun-phrases for queue legibility. Forks rename freely.
//
// ─── Balance ───
// Per-action numbers reground from vanilla (see file references inline).
// These values are canonical and not tunable — perturbing them would deform
// the canonical economy. Solver work targets declared inventions (see
// CONTENT-GROUNDING.md), not these.

export const ACTIONS: ActionDef[] = [
  // ─── Hearth ───
  {
    // vanilla canonical: Wander (actionList.js:155-194) — manaCost 250,
    // expMult 1, multi-stat weights {Per:0.2, Con:0.2, Cha:0.2, Spd:0.3,
    // Luck:0.1} sum 1.0, finishProgress(varName, 200).
    id: 'roam',
    name: 'Roam',
    description: 'Walk the village edges. Pots in the brush, paths into the wood.',
    zoneId: 'hearth',
    type: 'progress',
    progressVarId: 'roam',
    progressAmount: 200,
    manaCost: 250,
    expMult: 1,
    weights: { vigor: 0.4, lore: 0.4, aether: 0.2 },
  },
  {
    // vanilla canonical: Meet People (actionList.js:349-388) — manaCost 800,
    // expMult 1, weights {Int:0.1, Cha:0.8, Soul:0.1}, finishProgress(varName,
    // 200), visible: wander ≥ 10.
    id: 'acquaint',
    name: 'Acquaint',
    description: 'Sit with neighbours. Names settle, errands surface.',
    zoneId: 'hearth',
    type: 'progress',
    progressVarId: 'acquaint',
    progressAmount: 200,
    manaCost: 800,
    expMult: 1,
    weights: { lore: 0.6, aether: 0.4 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 10 }],
  },
  {
    // vanilla canonical: Smash Pots (actionList.js:202-239) — manaCost 50
    // (vanilla `Math.ceil(50 / (1 + practical/100))`; we use the base 50, the
    // dynamic Practical-skill divisor is fork-extension territory), expMult 1,
    // weights {Str:0.2, Per:0.2, Spd:0.6}, finishRegular(varName, 10, () =>
    // addMana(~100)), pool sizing pots = wander × 5 (actionList.js:195-197 →
    // cache = roam × 5 in regular-vars.ts / progress-vars.ts).
    id: 'crack',
    name: 'Crack',
    description: 'Break open the caches you sniffed out. Manapot harvest.',
    zoneId: 'hearth',
    type: 'regular',
    regularVarId: 'cache',
    manaCost: 50,
    expMult: 1,
    weights: { craft: 0.5, vigor: 0.5 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 100 }],
  },
  {
    // vanilla canonical: Pick Locks (actionList.js:241-284) — manaCost 400,
    // expMult 1, weights {Dex:0.5, Per:0.3, Spd:0.1, Luck:0.1},
    // finishRegular(varName, 10, () => addGold(~10)), visible: wander ≥ 3,
    // pool sizing locks = wander × 1 (actionList.js:198-200 → latch = roam × 1).
    id: 'slip',
    name: 'Slip',
    description: 'Lift unattended latches. Coin on the way out.',
    zoneId: 'hearth',
    type: 'regular',
    regularVarId: 'latch',
    manaCost: 400,
    expMult: 1,
    weights: { craft: 0.7, lore: 0.3 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-gold', amount: 10 }],
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 3 }],
  },
  {
    // vanilla canonical: Buy Mana (actionList.js:325-347) — manaCost 100,
    // expMult 1, weights {Cha:0.7, Int:0.2, Luck:0.1}, finish: addMana(gold ×
    // 50); resetResource(gold). Visible: wander ≥ 3.
    id: 'trade',
    name: 'Trade',
    description: 'Spend everything in your pouch. The hedge-witch refills your mana.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 100,
    expMult: 1,
    weights: { lore: 0.7, aether: 0.2, craft: 0.1 },
    completionEffects: [{ kind: 'spend-gold', amount: 'all' }, { kind: 'exchange-gold-to-mana' }],
    exchangeMult: 50,
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 3 }],
  },

  // ─── Wilds ───
  {
    // vanilla canonical: Explore Forest (actionList.js:1077-1118) — manaCost
    // 400, expMult 1, weights {Per:0.4, Con:0.2, Spd:0.2, Luck:0.2},
    // finishProgress(varName, 100). Vanilla town-1 progress is half the rate
    // of town-0 (200 → 100) — the late-game-progresses-slower curve. Zone-gate
    // prereq `roam ≥ 5` is a slim-demo invention since we don't model
    // vanilla's WalkOldRoad gating on `wander ≥ 60`.
    id: 'trail',
    name: 'Trail',
    description: 'Read the wilds. Each loop another stride of forest learned.',
    zoneId: 'wilds',
    type: 'progress',
    progressVarId: 'trail',
    progressAmount: 100,
    manaCost: 400,
    expMult: 1,
    weights: { vigor: 0.6, aether: 0.4 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 5 }],
  },
  {
    // vanilla canonical: Old Shortcut (actionList.js:1270-1313) — manaCost
    // 800, expMult 1, weights {Per:0.3, Con:0.4, Spd:0.2, Luck:0.1},
    // finishProgress(varName, 100). Vanilla doesn't gate Old Shortcut beyond
    // visibility-by-default; ours gates on trail ≥ 1 to prevent both Wilds
    // progress actions appearing simultaneously (slim-demo readability).
    id: 'mark',
    name: 'Mark',
    description: 'Sense the leylines crossing under the forest floor.',
    zoneId: 'wilds',
    type: 'progress',
    progressVarId: 'mark',
    progressAmount: 100,
    manaCost: 800,
    expMult: 1,
    weights: { aether: 0.6, lore: 0.4 },
    prereqs: [
      { kind: 'progress-var-level', progressVarId: 'roam', value: 5 },
      { kind: 'progress-var-level', progressVarId: 'trail', value: 1 },
    ],
  },
  {
    // vanilla canonical: Wild Mana (actionList.js:1129-1164) — manaCost 150
    // (vanilla `Math.ceil(150 / (1 + practical/100))`; base 150),
    // expMult 1, weights {Con:0.2, Int:0.6, Soul:0.2}, finishRegular(varName,
    // 10, () => addMana(~250)), pool sizing wildMana = forest × 5 + thicket ×
    // 5 (actionList.js:1119-1121 → wellspring = trail × 5; slim demo drops
    // the thicket contributor).
    id: 'drink',
    name: 'Drink',
    description: 'Pull aether from a wellspring. Alt-manapot harvest.',
    zoneId: 'wilds',
    type: 'regular',
    regularVarId: 'wellspring',
    manaCost: 150,
    expMult: 1,
    weights: { aether: 0.6, lore: 0.2, craft: 0.2 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 250 }],
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 5 }],
  },
  {
    // vanilla canonical: Gather Herbs (actionList.js:1166-1198) — manaCost 200
    // (vanilla `Math.ceil(200 * (1 - hermit × 0.005))`; base 200), expMult 1,
    // weights {Str:0.4, Dex:0.3, Int:0.3}, finishRegular(varName, 10, () =>
    // addResource("herbs", 1)), pool sizing herbs = forest × 5 + shortcut × 2
    // + flowers × 13 (actionList.js:1125-1127 → forage = trail × 5 + mark × 2;
    // slim demo drops the flowers contributor).
    //
    // Reward — `add-mana 50 + add-gold 5` is a declared invention. Vanilla
    // grants 1 herb (an inventory resource the slim demo doesn't model). We
    // adapt the multi-axis pool slot to a multi-axis reward instead;
    // magnitudes are slim — half a Crack hit (50 mana) and half a Slip gold
    // (5 gold) per reward firing.
    //
    // Capability-tier-level + loop-count prereqs cover the §5 prereq-graph
    // variant otherwise unexercised by the slim demo.
    id: 'gather',
    name: 'Gather',
    description: 'Fill your satchel. Roots, bark, the right kind of bone.',
    zoneId: 'wilds',
    type: 'regular',
    regularVarId: 'forage',
    manaCost: 200,
    expMult: 1,
    weights: { craft: 0.5, lore: 0.5 },
    rewardRatio: 10,
    rewardEffects: [
      { kind: 'add-mana', amount: 50 },
      { kind: 'add-gold', amount: 5 },
    ],
    prereqs: [
      { kind: 'progress-var-level', progressVarId: 'roam', value: 5 },
      { kind: 'capability-tier-level', capabilityId: 'vigor', tier: 'talent', value: 1 },
      { kind: 'loop-count', value: 3 },
    ],
  },
];
