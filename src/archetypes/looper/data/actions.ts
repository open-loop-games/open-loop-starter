import type { ActionDef } from './types';

// ─── Skeleton ───
// 9 actions across 2 zones, discriminated over `type: 'progress' | 'regular' |
// 'basic'`. Slim slice of vanilla idle-loops town 0 (Beginnersville) and town
// 1 (Forest Path) — every numerical claim cites the canonical port at
// `idle-loops-ng/src/data/vanilla-actions.ts:line` (the live engine port,
// authoritative over the frozen `reference-code/idle-loops-omsi/`).
//
// Action-type mix:
//   - 4 progress (wander, meet-people, explore-forest, old-shortcut)
//                                                      — drive progressVar XP
//   - 4 regular  (smash-pots, pick-locks, wild-mana, gather-herbs)
//                                                      — drain regularVar pools
//   - 1 basic    (buy-mana)                            — gold↔mana exchange
//
// Cost shape: weight-coupled per canonical (see types.ts § ActionDef.weights).
// Same weight controls cost contribution AND XP gain. Vanilla every action
// sums weights to 1.0 — preserved here.
//
// `expMult: 1` uniform across the entire action set — matches vanilla town 0
// and town 1 baselines (vanilla reserves expMult > 1 for explicit
// stat-trainer actions, e.g. Train Strength at 2000 mana behind `met ≥ 5`,
// which the slim demo doesn't include).
//
// Prereq web (slim slice, vanilla-grounded):
//   wander ≥ 3            → Pick Locks    visible  (vanilla `wander ≥ 3`,
//                                                   vanilla-actions.ts:155)
//   wander ≥ 3            → Buy Mana      visible  (vanilla `wander ≥ 3`,
//                                                   vanilla-actions.ts:237)
//   wander ≥ 5            → Explore Forest visible (Forest Path zone-gate;
//                                                   declared invention — the
//                                                   slim demo doesn't model
//                                                   vanilla's Buy Supplies +
//                                                   Travel zone-bridge gate)
//   wander ≥ 5            → Wild Mana     visible  (Forest Path zone-gate;
//                                                   declared invention as above)
//   wander ≥ 10           → Meet People   visible  (vanilla `wander ≥ 10`,
//                                                   vanilla-actions.ts:93)
//   wander ≥ 5
//     AND forest ≥ 1      → Old Shortcut  visible  (declared invention —
//                                                   prevents both Forest Path
//                                                   progress actions appearing
//                                                   simultaneously, slim-demo
//                                                   readability. Vanilla gates
//                                                   only on `unlocked: forest
//                                                   ≥ 20`.)
//   wander ≥ 5
//     AND Per Talent ≥ 1
//     AND loops ≥ 3       → Gather Herbs  visible  (declared invention —
//                                                   exercises capability-tier-
//                                                   level + loop-count prereq
//                                                   variants the slim slice
//                                                   would otherwise leave
//                                                   unexercised by vanilla's
//                                                   pure progress-var-level
//                                                   web)
//
// Variants exercised: progress-var-level (most), stat-tier-level
// (Gather Herbs), loop-count (Gather Herbs). Always-implicit (no `prereqs`):
// Wander, Smash Pots. The action-completion-count and always-explicit
// variants are implemented in the engine but unexercised by the slim demo's
// prereq web; forks adding content can use them.
//
// Wander and Smash Pots are always-visible (always-implicit) so the bootstrap
// arc has a viable mana-positive spine from loop 1 (Smash Pots on the
// per-loop pots-pool; Wander to grow the pool across loops).
//
// ─── Balance ───
// Per-action numbers are vanilla canonical. Stat weights match
// `idle-loops-ng/src/data/vanilla-actions.ts` per-row exactly — looper
// inherits the full 9-stat (`Dex/Str/Con/Spd/Per/Cha/Int/Luck/Soul`) palette.
// These values are not tunable — perturbing them deforms the canonical
// economy. Solver work targets declared inventions, not these.
//
// Substrate divergences from vanilla, NOT applied here (mechanics-layer
// features the slim demo doesn't yet model — tracked separately):
//   - vanilla `practicalDiscount(50)` on Smash Pots / `practicalDiscount(150)`
//     on Wild Mana — Practical skill not in slim demo, base values used.
//   - vanilla `levelDiscount(200, 'Hermit')` on Gather Herbs — Hermit progress
//     not in slim demo, base value used.
//   - vanilla `practicalScaledGold(...)` on Pick Locks gold reward — Practical
//     skill not in slim demo, base 10 used.
//   - vanilla Gather Herbs reward `+1 herb` — herbs resource not in slim demo.
//     Adapted to multi-axis `+50 mana / +5 gold` reward (declared invention).

export const ACTIONS: ActionDef[] = [
  // ─── Beginnersville ───
  {
    // vanilla canonical: Wander (idle-loops-ng/src/data/vanilla-actions.ts:67)
    // — manaCost 250, expMult 1, stats {Per:0.2, Con:0.2, Cha:0.2, Spd:0.3,
    // Luck:0.1} sum 1.0, finishProgress(varName, 200).
    id: 'wander',
    name: 'Wander',
    description: 'Walk the village edges. Pots in the brush, paths into the wood.',
    zoneId: 'beginnersville',
    type: 'progress',
    progressVarId: 'wander',
    progressAmount: 200,
    manaCost: 250,
    expMult: 1,
    weights: { Per: 0.2, Con: 0.2, Cha: 0.2, Spd: 0.3, Luck: 0.1 },
  },
  {
    // vanilla canonical: Meet People
    // (idle-loops-ng/src/data/vanilla-actions.ts:84) — manaCost 800, expMult
    // 1, stats {Int:0.1, Cha:0.8, Soul:0.1}, finishProgress(varName, 200),
    // visible: wander ≥ 10.
    id: 'meet-people',
    name: 'Meet People',
    description: 'Sit with neighbours. Names settle, errands surface.',
    zoneId: 'beginnersville',
    type: 'progress',
    progressVarId: 'met',
    progressAmount: 200,
    manaCost: 800,
    expMult: 1,
    weights: { Int: 0.1, Cha: 0.8, Soul: 0.1 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'wander', value: 10 }],
  },
  {
    // vanilla canonical: Smash Pots
    // (idle-loops-ng/src/data/vanilla-actions.ts:129) — manaCost
    // `practicalDiscount(50)` (slim demo: base 50, no Practical skill),
    // expMult 1, stats {Str:0.2, Per:0.2, Spd:0.6}, rewardEffects [+100 mana]
    // / rewardRatio 10. Pool: Pots = Wander × 5
    // (idle-loops-ng/src/modules/zones.ts:427).
    id: 'smash-pots',
    name: 'Smash Pots',
    description: 'Break open the caches you sniffed out. Manapot harvest.',
    zoneId: 'beginnersville',
    type: 'regular',
    regularVarId: 'pots',
    manaCost: 50,
    expMult: 1,
    weights: { Str: 0.2, Per: 0.2, Spd: 0.6 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 100 }],
  },
  {
    // vanilla canonical: Pick Locks
    // (idle-loops-ng/src/data/vanilla-actions.ts:146) — manaCost 400, expMult
    // 1, stats {Dex:0.5, Per:0.3, Spd:0.1, Luck:0.1}, rewardEffects [+10 gold,
    // vanilla `practicalScaledGold(10)` formula] / rewardRatio 10, visible:
    // wander ≥ 3. Pool: Locks = Wander × 1
    // (idle-loops-ng/src/modules/zones.ts:428).
    id: 'pick-locks',
    name: 'Pick Locks',
    description: 'Lift unattended latches. Coin on the way out.',
    zoneId: 'beginnersville',
    type: 'regular',
    regularVarId: 'locks',
    manaCost: 400,
    expMult: 1,
    weights: { Dex: 0.5, Per: 0.3, Spd: 0.1, Luck: 0.1 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-gold', amount: 10 }],
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'wander', value: 3 }],
  },
  {
    // vanilla canonical: Buy Mana
    // (idle-loops-ng/src/data/vanilla-actions.ts:228) — manaCost 100, expMult
    // 1, stats {Cha:0.7, Int:0.2, Luck:0.1}, finish: addMana(gold × 50);
    // resetResource(gold). Visible: wander ≥ 3.
    id: 'buy-mana',
    name: 'Buy Mana',
    description: 'Spend everything in your pouch. The hedge-witch refills your mana.',
    zoneId: 'beginnersville',
    type: 'basic',
    manaCost: 100,
    expMult: 1,
    weights: { Cha: 0.7, Int: 0.2, Luck: 0.1 },
    completionEffects: [{ kind: 'spend-gold', amount: 'all' }, { kind: 'exchange-gold-to-mana' }],
    exchangeMult: 50,
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'wander', value: 3 }],
  },

  // ─── Forest Path ───
  {
    // vanilla canonical: Explore Forest
    // (idle-loops-ng/src/data/vanilla-actions.ts:481) — manaCost 400, expMult
    // 1, stats {Per:0.4, Con:0.2, Spd:0.2, Luck:0.2}, finishProgress(varName,
    // 100). Vanilla town-1 progress is half the rate of town-0 (200 → 100) —
    // the late-game-progresses-slower curve. Zone-gate prereq `wander ≥ 5` is
    // a declared invention since the slim demo doesn't model vanilla's
    // multi-step zone-bridge (Buy Supplies → Travel).
    id: 'explore-forest',
    name: 'Explore Forest',
    description: 'Read the wilds. Each loop another stride of forest learned.',
    zoneId: 'forest-path',
    type: 'progress',
    progressVarId: 'forest',
    progressAmount: 100,
    manaCost: 400,
    expMult: 1,
    weights: { Per: 0.4, Con: 0.2, Spd: 0.2, Luck: 0.2 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'wander', value: 5 }],
  },
  {
    // vanilla canonical: Old Shortcut
    // (idle-loops-ng/src/data/vanilla-actions.ts:498) — manaCost 1200,
    // expMult 1, stats {Per:0.3, Con:0.4, Spd:0.2, Luck:0.1},
    // finishProgress(varName, 100). Vanilla unlocks at `forest ≥ 20`; the
    // slim demo's `forest ≥ 1` visibility prereq is a declared invention to
    // prevent both Forest Path progress actions appearing simultaneously
    // (slim-demo readability).
    id: 'old-shortcut',
    name: 'Old Shortcut',
    description: 'Sense the leylines crossing under the forest floor.',
    zoneId: 'forest-path',
    type: 'progress',
    progressVarId: 'shortcut',
    progressAmount: 100,
    manaCost: 1200,
    expMult: 1,
    weights: { Per: 0.3, Con: 0.4, Spd: 0.2, Luck: 0.1 },
    prereqs: [
      { kind: 'progress-var-level', progressVarId: 'wander', value: 5 },
      { kind: 'progress-var-level', progressVarId: 'forest', value: 1 },
    ],
  },
  {
    // vanilla canonical: Wild Mana
    // (idle-loops-ng/src/data/vanilla-actions.ts:538) — manaCost
    // `practicalDiscount(150)` (slim demo: base 150, no Practical skill),
    // expMult 1, stats {Con:0.2, Int:0.6, Soul:0.2}, rewardEffects [+250 mana]
    // / rewardRatio 10. Pool: WildMana = Forest × 5
    // (idle-loops-ng/src/modules/zones.ts:439).
    id: 'wild-mana',
    name: 'Wild Mana',
    description: 'Pull aether from a wellspring. Alt-manapot harvest.',
    zoneId: 'forest-path',
    type: 'regular',
    regularVarId: 'wild-mana',
    manaCost: 150,
    expMult: 1,
    weights: { Con: 0.2, Int: 0.6, Soul: 0.2 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 250 }],
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'wander', value: 5 }],
  },
  {
    // vanilla canonical: Gather Herbs
    // (idle-loops-ng/src/data/vanilla-actions.ts:557) — manaCost
    // `levelDiscount(200, 'Hermit')` (slim demo: base 200, no Hermit skill),
    // expMult 1, stats {Str:0.4, Dex:0.3, Int:0.3}, rewardEffects [+1 herb]
    // / rewardRatio 10. Pool: Herbs = Forest × 5 + Shortcut × 2
    // (idle-loops-ng/src/modules/zones.ts:441,445).
    //
    // Reward `add-mana 50 + add-gold 5` is a declared invention. Vanilla
    // grants 1 herb (an inventory resource the slim demo doesn't model). We
    // adapt the multi-axis pool slot to a multi-axis reward instead;
    // magnitudes are slim — half a Smash Pots hit (50 mana) and half a Pick
    // Locks gold (5 gold) per reward firing.
    //
    // Capability-tier-level + loop-count prereqs are declared inventions —
    // they exercise prereq variants the slim slice would otherwise leave
    // unexercised by vanilla's pure progress-var-level web.
    id: 'gather-herbs',
    name: 'Gather Herbs',
    description: 'Fill your satchel. Roots, bark, the right kind of bone.',
    zoneId: 'forest-path',
    type: 'regular',
    regularVarId: 'herbs',
    manaCost: 200,
    expMult: 1,
    weights: { Str: 0.4, Dex: 0.3, Int: 0.3 },
    rewardRatio: 10,
    rewardEffects: [
      { kind: 'add-mana', amount: 50 },
      { kind: 'add-gold', amount: 5 },
    ],
    prereqs: [
      { kind: 'progress-var-level', progressVarId: 'wander', value: 5 },
      { kind: 'stat-tier-level', statId: 'Per', tier: 'talent', value: 1 },
      { kind: 'loop-count', value: 3 },
    ],
  },
];
