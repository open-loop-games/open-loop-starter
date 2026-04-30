import type { ActionDef } from './types';

// ─── Skeleton ───
// 15 actions across 2 zones, discriminated over `type: 'progress' | 'regular'
// | 'basic'`. Every capability is granted XP by at least one action in every
// zone (cardinality-cross-check enforced by the smoke-test suite).
// Single-tick actions only — multi-part action support is engine-gap territory
// tracked separately as a candidate primitive.
//
// Cost shape: weight-coupled per canonical (see types.ts § ActionDef.weights).
// Same weight controls cost contribution AND XP gain. Sums of weights are
// nominally ≈ 1 but not enforced — fractional totals scale all derived
// numbers proportionally.
//
// Action-type mix:
//   - 6 basic   (stretch, tend, listen, attune, trade, trek)
//                                                      — capability training (×4 expMult), exchange, bridge
//   - 4 progress (roam, acquaint, trail, mark)         — drive progressVar XP
//   - 5 regular  (crack, slip, run, drink, gather)     — drain regularVar pools
//
// Capability-training basics carry `expMult: 4` per the idle-loops canonical
// shape — training-style activities have a 4-5× XP multiplier so spending
// mana on them is worthwhile vs. progression actions which pay 1×. Drives
// farm-talent's planner Pass 7 (talent overflow) — mana-rich loops soak
// excess into rotating trainer iterations for compounded talent gain.
// Aether gets its own dedicated trainer (Attune) for symmetric four-cap
// coverage; without it the rotation would leave aether's talent track
// trailing the other three.
//
// Prereq web: chains exercising all five `ActionPrereq` variants.
//   Acquaint ≥ 3 done     → Slip    visible  (Hearth gold pool entry,
//                                              action-completion-count)
//   Roam ≥ level 3        → Trade   visible  (Hearth gold-spend exchange,
//                                              progress-var-level)
//   Roam ≥ level 5        → Trek    visible  (Hearth → Wilds bridge,
//                                              progress-var-level)
//   Trail ≥ level 1       → Mark    visible  (Wilds internal,
//                                              progress-var-level)
//   Vigor Talent ≥ 1
//     AND loops ≥ 3       → Gather  visible  (Wilds late-game,
//                                              capability-tier-level + loop-count)
// Actions without `prereqs` are always-visible by default (the implicit
// `always` variant — exercised by stretch/tend/listen/attune/roam/acquaint/
// crack/run/trail/drink).
//
// ─── Costume ───
// Theme-fresh action set — an everyday-craft adventure stack. Names lean
// short verbs over noun-phrases for queue legibility. Forks rename freely.
//
// ─── Balance ───
// `manaCost` magnitudes are vanilla-canonical-shaped placeholders against the
// 250-tick `initialMana` baseline: entry actions 60-150 (multiple completions
// per fresh loop), mid actions 200-450, late actions 400-700. `expMult` is
// uniform 1 — solver tunes per-action in OL-746. Reward magnitudes
// (`rewardEffects.amount`, `completionEffects` exchange rate) likewise are
// solver placeholders.

export const ACTIONS: ActionDef[] = [
  // ─── Hearth ───
  {
    id: 'stretch',
    name: 'Stretch',
    description: 'Wake the body. Shake out the night, find the day.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 60,
    expMult: 4,
    weights: { vigor: 1 },
  },
  {
    id: 'tend',
    name: 'Tend',
    description: 'Mend a fence, sharpen a blade, patch a roof. Small, useful work.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 80,
    expMult: 4,
    weights: { craft: 1 },
  },
  {
    id: 'listen',
    name: 'Listen',
    description: 'Sit by the hearth and let the village talk. Stories settle into you.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 80,
    expMult: 4,
    weights: { lore: 1 },
  },
  {
    id: 'attune',
    name: 'Attune',
    description: 'Sit with the hearth-stone. Listen to what the room remembers.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 80,
    expMult: 4,
    weights: { aether: 1 },
  },
  {
    id: 'roam',
    name: 'Roam',
    description: 'Walk the village edges. Pots in the brush, paths into the wood.',
    zoneId: 'hearth',
    type: 'progress',
    progressVarId: 'roam',
    progressAmount: 200,
    manaCost: 150,
    expMult: 1,
    weights: { vigor: 0.4, lore: 0.4, aether: 0.2 },
  },
  {
    id: 'acquaint',
    name: 'Acquaint',
    description: 'Sit with neighbours. Names settle, errands surface.',
    zoneId: 'hearth',
    type: 'progress',
    progressVarId: 'acquaint',
    progressAmount: 200,
    manaCost: 150,
    expMult: 1,
    weights: { lore: 0.6, aether: 0.4 },
  },
  {
    id: 'crack',
    name: 'Crack',
    description: 'Break open the caches you sniffed out. Manapot harvest.',
    zoneId: 'hearth',
    type: 'regular',
    regularVarId: 'cache',
    manaCost: 200,
    expMult: 1,
    weights: { craft: 0.5, vigor: 0.5 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 100 }],
  },
  {
    id: 'slip',
    name: 'Slip',
    description: 'Lift unattended latches. Coin on the way out.',
    zoneId: 'hearth',
    type: 'regular',
    regularVarId: 'latch',
    manaCost: 220,
    expMult: 1,
    weights: { craft: 0.7, lore: 0.3 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-gold', amount: 10 }],
    // Gold-side gate; mana spine (crack) is unprereq'd so exploration-led
    // mana generation isn't blocked behind side-economy onboarding. Carries
    // the action-completion-count prereq variant for `prereq-graph-shape`
    // coverage.
    prereqs: [{ kind: 'action-completion-count', actionId: 'acquaint', value: 3 }],
  },
  {
    id: 'run',
    name: 'Run',
    description: 'Take an errand from the village board. Coin for the leg work.',
    zoneId: 'hearth',
    type: 'regular',
    regularVarId: 'errand',
    manaCost: 250,
    expMult: 1,
    weights: { vigor: 0.5, lore: 0.5 },
    rewardRatio: 5,
    rewardEffects: [{ kind: 'add-gold', amount: 20 }],
  },
  {
    id: 'trade',
    name: 'Trade',
    description: 'Spend everything in your pouch. The hedge-witch refills your mana.',
    zoneId: 'hearth',
    type: 'basic',
    manaCost: 300,
    expMult: 1,
    weights: { lore: 1 },
    // Doc § 8: gold↔mana exchange. `exchangeMult` is a solver-tunable
    // multiplier; the dispatcher snapshots pre-batch gold for the
    // exchange-gold-to-mana effect, so `spend-gold: 'all'` ordering does not
    // affect the captured amount. Algebraic identity:
    //   manaAdded = goldSpent × exchangeMult
    completionEffects: [{ kind: 'spend-gold', amount: 'all' }, { kind: 'exchange-gold-to-mana' }],
    exchangeMult: 50,
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 3 }],
  },

  // ─── Wilds ───
  {
    id: 'trek',
    name: 'Trek',
    description: 'Walk the deer-paths beyond the village. Real distance, real day.',
    zoneId: 'wilds',
    type: 'basic',
    manaCost: 400,
    expMult: 1,
    weights: { vigor: 0.6, lore: 0.4 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'roam', value: 5 }],
  },
  {
    id: 'trail',
    name: 'Trail',
    description: 'Read the wilds. Each loop another stride of forest learned.',
    zoneId: 'wilds',
    type: 'progress',
    progressVarId: 'trail',
    progressAmount: 200,
    manaCost: 250,
    expMult: 1,
    weights: { vigor: 0.6, aether: 0.4 },
  },
  {
    id: 'mark',
    name: 'Mark',
    description: 'Sense the leylines crossing under the forest floor.',
    zoneId: 'wilds',
    type: 'progress',
    progressVarId: 'mark',
    progressAmount: 200,
    manaCost: 280,
    expMult: 1,
    weights: { aether: 0.6, lore: 0.4 },
    prereqs: [{ kind: 'progress-var-level', progressVarId: 'trail', value: 1 }],
  },
  {
    id: 'drink',
    name: 'Drink',
    description: 'Pull aether from a wellspring. Alt-manapot harvest.',
    zoneId: 'wilds',
    type: 'regular',
    regularVarId: 'wellspring',
    manaCost: 350,
    expMult: 1,
    weights: { aether: 1 },
    rewardRatio: 10,
    rewardEffects: [{ kind: 'add-mana', amount: 250 }],
  },
  {
    id: 'gather',
    name: 'Gather',
    description: 'Fill your satchel. Roots, bark, the right kind of bone.',
    zoneId: 'wilds',
    type: 'regular',
    regularVarId: 'forage',
    manaCost: 320,
    expMult: 1,
    weights: { craft: 0.5, lore: 0.5 },
    rewardRatio: 5,
    rewardEffects: [
      { kind: 'add-mana', amount: 50 },
      { kind: 'add-gold', amount: 5 },
    ],
    prereqs: [
      { kind: 'capability-tier-level', capabilityId: 'vigor', tier: 'talent', value: 1 },
      { kind: 'loop-count', value: 3 },
    ],
  },
];
