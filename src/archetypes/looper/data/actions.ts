import type { ActionDef } from './types';

// ─── Skeleton ───
// 16 actions across 4 zones, 4 actions per zone. Every capability is granted
// XP by at least one action in every zone (cardinality-cross-check enforced
// by the smoke-test suite). Single-tick actions only — multi-part action
// support is engine-gap territory tracked separately as a candidate primitive.
//
// Cost shape: weight-coupled per canonical (see types.ts § ActionDef.weights).
// Same weight controls cost contribution AND XP gain. Sums of weights are
// nominally ≈ 1 but not enforced — fractional totals scale all derived
// numbers proportionally.
//
// Prereq web: 5 chains exercising the four ActionPrereq variants.
//   Stretch ≥ 3            → Patrol      visible (Hearth internal)
//   Patrol ≥ 5             → Trek        visible (Hearth → Wilds bridge)
//   Trek ≥ 5               → Hunt        visible (Wilds internal)
//   Drift ≥ 3 AND loops≥1  → Apprentice  visible (Wilds → Market bridge,
//                                                 AND-shape with loop-count)
//   Vigor Level ≥ 8        → Confront    visible (Market → Spire bridge,
//                                                 capability-tier-level variant)
// Actions without `prereqs` are always-visible by default.
//
// ─── Costume ───
// Theme-fresh action set — an everyday-craft adventure stack. Names lean
// short verbs over noun-phrases for queue legibility. Forks rename freely.
//
// ─── Balance ───
// `manaCost` magnitudes are vanilla-canonical-shaped placeholders against the
// 250-tick `initialMana` baseline: entry actions 60-150 (multiple completions
// per fresh loop), mid actions 200-450 (one per fresh loop, several with
// trained Levels), heavy/late actions 600-800 (out of reach pre-Talent
// compounding). `expMult` is uniform 1 — solver tunes per-action in the
// balance leaf. `manaGrant` magnitudes are per-zone-tier (50 / 100 / 150).

export const ACTIONS: ActionDef[] = [
  // ─── Hearth ───
  {
    id: 'stretch',
    name: 'Stretch',
    description: 'Wake the body. Shake out the night, find the day.',
    zoneId: 'hearth',
    manaCost: 60,
    expMult: 1,
    weights: { vigor: 1 },
  },
  {
    id: 'listen',
    name: 'Listen',
    description: 'Sit by the hearth and let the village talk. Stories settle into you.',
    zoneId: 'hearth',
    manaCost: 100,
    expMult: 1,
    weights: { lore: 1 },
    manaGrant: 50,
  },
  {
    id: 'tend',
    name: 'Tend',
    description: 'Mend a fence, sharpen a blade, patch a roof. Small, useful work.',
    zoneId: 'hearth',
    manaCost: 80,
    expMult: 1,
    weights: { craft: 1 },
  },
  {
    id: 'patrol',
    name: 'Patrol',
    description: 'Walk the edge of the village with eyes and ears open.',
    zoneId: 'hearth',
    manaCost: 150,
    expMult: 1,
    weights: { vigor: 0.6, lore: 0.4 },
    prereqs: [{ kind: 'action-completion-count', actionId: 'stretch', value: 3 }],
  },

  // ─── Wilds ───
  {
    id: 'trek',
    name: 'Trek',
    description: 'Cross between settlements on foot. Watchful trails, real distance.',
    zoneId: 'wilds',
    manaCost: 200,
    expMult: 1,
    weights: { vigor: 1 },
    prereqs: [{ kind: 'action-completion-count', actionId: 'patrol', value: 5 }],
  },
  {
    id: 'drift',
    name: 'Drift',
    description: 'Step off the path. The aether runs thinner here, easier to feel.',
    zoneId: 'wilds',
    manaCost: 220,
    expMult: 1,
    weights: { aether: 1 },
    manaGrant: 100,
  },
  {
    id: 'forage',
    name: 'Forage',
    description: 'Pick reagents in the understory. Roots, bark, the right kind of moss.',
    zoneId: 'wilds',
    manaCost: 180,
    expMult: 1,
    weights: { craft: 1 },
  },
  {
    id: 'hunt',
    name: 'Hunt',
    description: 'Track and dispatch wild game. Tougher quarry, longer chase.',
    zoneId: 'wilds',
    manaCost: 350,
    expMult: 1,
    weights: { vigor: 0.7, craft: 0.3 },
    prereqs: [{ kind: 'action-completion-count', actionId: 'trek', value: 5 }],
  },

  // ─── Market ───
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Long days under a master craftsman. Hands learn what mouths cannot teach.',
    zoneId: 'market',
    manaCost: 400,
    expMult: 1,
    weights: { craft: 1 },
    prereqs: [
      { kind: 'action-completion-count', actionId: 'drift', value: 3 },
      { kind: 'loop-count', value: 1 },
    ],
  },
  {
    id: 'court',
    name: 'Court',
    description: 'Move among guildmasters and clerks. Names attached to faces, debts to names.',
    zoneId: 'market',
    manaCost: 350,
    expMult: 1,
    weights: { lore: 1 },
  },
  {
    id: 'channel',
    name: 'Channel',
    description: 'Draw the city aether through chalked sigils. Dense, controlled.',
    zoneId: 'market',
    manaCost: 300,
    expMult: 1,
    weights: { aether: 1 },
    manaGrant: 150,
  },
  {
    id: 'errand',
    name: 'Errand',
    description: 'A guild contract: fetch, escort, witness. Mixed, unsupervised work.',
    zoneId: 'market',
    manaCost: 450,
    expMult: 1,
    weights: { vigor: 0.5, lore: 0.5 },
  },

  // ─── Spire ───
  {
    id: 'confront',
    name: 'Confront',
    description: "Step into the Spire's lower halls. Iron and aether, both at once.",
    zoneId: 'spire',
    manaCost: 800,
    expMult: 1,
    weights: { vigor: 0.6, aether: 0.4 },
    prereqs: [{ kind: 'capability-tier-level', capabilityId: 'vigor', tier: 'level', value: 8 }],
  },
  {
    id: 'inscribe',
    name: 'Inscribe',
    description: 'Reseal broken wards on cracked stone. Aether thick with old grief.',
    zoneId: 'spire',
    manaCost: 700,
    expMult: 1,
    weights: { aether: 1 },
  },
  {
    id: 'forge',
    name: 'Forge',
    description: 'Reforge a blade from spire-iron. Crafting at its limit.',
    zoneId: 'spire',
    manaCost: 800,
    expMult: 1,
    weights: { craft: 1 },
  },
  {
    id: 'decipher',
    name: 'Decipher',
    description: "Trace the spire's last spell-circuit. Slow, deliberate reading.",
    zoneId: 'spire',
    manaCost: 600,
    expMult: 1,
    weights: { lore: 1 },
  },
];
