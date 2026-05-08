// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Challenges.ts
//   Challenges.ts:209-236       challenge1..5 effect coefficients
//                               (`current{1,2,3}` per-completion display values
//                               at :223-255 also referenced for reward routing)
//   Challenges.ts:599-617       CalcECC softcap (transcend branch)
//   Challenges.ts:620-655       challengeRequirement formula (per-completion goal)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:121            challengeBaseRequirements (first 5 → transcend)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:3407,3427,3447,3467,3487  per-challenge completion increment
//                                          (continuous goal-met-on-tick — independent
//                                          of transcending; engine `goal + registerTick`
//                                          matches semantics)
//   Synergism.ts:3496-3500      auto-challenge sweep transcension trigger
//                               (NOT the completion gate — the auto-transcend
//                               part of `runChallengeSweep`)
//   Synergism.ts:3563-3565      prestigePointGain — Ch5 crushes prestigePow
//                               toward `0.01/(1+completions[5])` while active
//   Synergism.ts:3583-3585      transcendPointGain — Ch5 crushes transcendPow
//                               toward 0.001 while active
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//   Buy.ts:73-77, :209-211      Ch4 super-exponential cost inflation past 1000
//                               (Accelerator + Multiplier; first-arc port scope)
//   Buy.ts:336-338              Coin / Diamond / Mythos building base costs —
//                               cost inflation under Ch4 is TODO(expansion);
//                               `createProducerCategory.purchase.costScaling` is
//                               static numeric with no runtime-predicate hook.
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:580-593            challengecompletions[1..5] zero ONLY on
//                               Reincarnation reset (fork-extension territory).
//                               First-arc port: completions persist across every
//                               transcend reset via the per-challenge persistent
//                               context not being walked by transcend's resetModules.
// ─────────────────────────────────────────────────────────────────────────────
//
// ─── Algebraic-neutralization invariant (Ch1) ────────────────────────────────
// Ch1's restricts use M⁻¹ × M = 1 to neutralize the existing 'Multiplier' bind
// in `modules/coin.ts`. The neutralization holds only as long as no other
// rateChain bind composes with the Multiplier contribution. Audit before adding
// any new rateChain bind that reads `multiplierPurchasable.amount` or modifies
// the existing 'Multiplier' bind shape — Ch1's reformulation depends on it.
// Verified clean as of leaf 6 land: only Accelerator + Multiplier + Accelerator
// Boost binds in coin tier; runes Speed/Duplication/Prism are independent
// multiplicative grants composed alongside, not nested.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScalerChallengeDef } from './types';

// ─── Skeleton ───
// Five transcend-tier challenges (canonical Challenge slots 1..5). Each carries
// id, canonical 1-indexed slot, name + flavor + restrictions display strings,
// and a completion limit. Restriction shapes + per-completion ECC reward routes
// live in `modules/challenges.ts` (where the engine wiring lands), not here —
// `data/` stays pure config.

// ─── Balance ───
// `completionLimit` lifts canonical `getMaxChallenges(i ≤ 5)` baseline 25 (the
// research-band growth `+5 × researches[66+i]` ports inert at first arc — every
// research read defaults 0). Forks raising the per-cycle ceiling extend the
// limit here. The baseRequirement coefficients live in `data/balance.ts`
// (`challengeBaseRequirements`); the per-challenge ECC scaling factors that
// drive reward magnitude live in `modules/challenges.ts` per the per-challenge
// `current{1,2,3}` arms at canonical `Challenges.ts:223-255`.

import { SCALER_BALANCE } from './balance';

export const SCALER_CHALLENGES: ScalerChallengeDef[] = [
  {
    id: 'challenge-1',
    index: 1,
    name: 'No Multipliers',
    flavor: 'Multipliers stop multiplying — they fuel Accelerators instead.',
    restrictions: 'Multiplier Power = 1. Each Multiplier owned acts as a free Accelerator level.',
    completionLimit: SCALER_BALANCE.challengeCompletionLimit,
  },
  {
    id: 'challenge-2',
    index: 2,
    name: 'No Accelerators',
    flavor: 'Pure multiplicative growth — Accelerators are dead weight.',
    restrictions:
      'Accelerator Power = 1. Multiplier Power reduced toward 1.25 (canonical 1.25 + 0.0012 × Multiplier Boost; first-arc port collapses the boost term).',
    completionLimit: SCALER_BALANCE.challengeCompletionLimit,
  },
  {
    id: 'challenge-3',
    index: 3,
    name: 'No Shards',
    flavor: 'Crystal and Mythos shard production halts.',
    restrictions:
      'No Crystal or Mythos Shard production. Accelerator Power above 1 is reduced by 50%.',
    completionLimit: SCALER_BALANCE.challengeCompletionLimit,
  },
  {
    id: 'challenge-4',
    index: 4,
    name: 'Cost+',
    flavor: 'Cumulative-buy costs go super-exponential past 1000.',
    restrictions:
      'Accelerator + Multiplier costs grow ×1.25 per buy past 1000. Coin / Diamond producer cost inflation is TODO(expansion) — see Ch4 port-citation header in `data/challenges.ts`.',
    completionLimit: SCALER_BALANCE.challengeCompletionLimit,
  },
  {
    id: 'challenge-5',
    index: 5,
    name: 'Reduced Diamonds',
    flavor: 'Prestige and Transcend exponents crushed toward zero.',
    restrictions:
      'Prestige exponent → 0.01 / (1 + completions[5]). Transcend exponent → 0.001. Auto-prestige and auto-transcend gate off (manual exit only via goal-met auto-completion).',
    completionLimit: SCALER_BALANCE.challengeCompletionLimit,
  },
];
