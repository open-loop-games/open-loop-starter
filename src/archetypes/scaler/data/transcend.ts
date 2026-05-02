import type { ChallengeDef, ProducerDef, TranscendTierData, TranscendUpgradeDef } from './types';

// ─── Skeleton ───────────────────────────────────────────────────────────────
// 5 Mythos producers (position 1–5, tier 'transcend'). Costs in transcendPoints.
// Cascade from producer N → producer N-1 output. Slim slice from Synergism
// Transcend (Mythos) tier, traceable to Buy.ts and Synergism.ts.

const producers: ProducerDef[] = [
  {
    id: 'transcend-1',
    name: 'Insight Engine',
    tier: 'transcend',
    position: 1,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:338 — mythosAndParticleBuildingCosts[0]
    baseCost: 1,
  },
  {
    id: 'transcend-2',
    name: 'Ascendant Cell',
    tier: 'transcend',
    position: 2,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:338 — mythosAndParticleBuildingCosts[1]
    baseCost: '1e2',
  },
  {
    id: 'transcend-3',
    name: 'Numinous Foundry',
    tier: 'transcend',
    position: 3,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:338 — mythosAndParticleBuildingCosts[2]
    baseCost: '1e4',
  },
  {
    id: 'transcend-4',
    name: 'Transcendent Lattice',
    tier: 'transcend',
    position: 4,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:338 — mythosAndParticleBuildingCosts[3]
    baseCost: '1e8',
  },
  {
    id: 'transcend-5',
    name: 'Mythos Cradle',
    tier: 'transcend',
    position: 5,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:338 — mythosAndParticleBuildingCosts[4]
    baseCost: '1e16',
  },
];

// ─── Skeleton ───────────────────────────────────────────────────────────────
// Transcend-tier upgrades: Accelerator Boost (costs prestigePoints, layered cost
// source per Reset.ts:498-499, Buy.ts:705) + 4 representative transcendPoints
// upgrades. Buy.ts indices 41–60 are transcend tier (Upgrade.transcend gated);
// See Upgrades.ts:313–314 for tier gating. Cost indices pulled from Variables.ts.

const upgrades: TranscendUpgradeDef[] = [
  {
    id: 'acc-boost',
    name: 'Accelerator Boost',
    description:
      'Multiplies all Accelerators by 1.01^acceleratorBoostBought. Cost grows by 10x plus 10^acceleratorBoostBought per purchase.',
    // vanilla canonical: SynergismOfficial/src/Reset.ts:498-499 — acceleratorBoostCost = 1e3 initial
    baseCost: '1e3',
    costCurrency: 'prestigePoints',
  },
  {
    id: 'transcend-upgrade-1',
    name: 'Mythos Production I',
    description: 'Increases Mythos producers by 10%.',
    // vanilla canonical: SynergismOfficial/src/Variables.ts:27 — upgradeCosts[100] = 1e3
    baseCost: '1e3',
    costCurrency: 'transcendPoints',
  },
  {
    id: 'transcend-upgrade-2',
    name: 'Transcend Points Efficiency',
    description: 'Reduce Mythos producer cost divisor by 10%.',
    // vanilla canonical: SynergismOfficial/src/Variables.ts:27 — upgradeCosts[101] = 1e6
    baseCost: '1e6',
    costCurrency: 'transcendPoints',
  },
  {
    id: 'transcend-upgrade-3',
    name: 'Shards Acceleration',
    description: 'Increase Transcend Shards production by 50%.',
    // vanilla canonical: SynergismOfficial/src/Variables.ts:27 — upgradeCosts[102] = 1e9
    baseCost: '1e9',
    costCurrency: 'transcendPoints',
  },
  {
    id: 'transcend-upgrade-4',
    name: 'Cascade Amplification',
    description: 'Multiply all producer cascade rates by 2.',
    // vanilla canonical: SynergismOfficial/src/Variables.ts:27 — upgradeCosts[103] = 1e12
    baseCost: '1e12',
    costCurrency: 'transcendPoints',
  },
];

// ─── Skeleton ───────────────────────────────────────────────────────────────
// 5 Transcend challenges (challengecompletions[1..5]). Active during Transcend
// run; nerfs production/cost/mechanics; completion grants stacking multiplier
// via CalcECC formula (Challenges.ts:541). Challenge data: Challenges.ts:209–236.
// Each challenge has in-challenge effects (production nerfs, locked mechanics,
// cost multipliers) and a per-completion reward described by the CalcECC outcome
// multiplied by challenge-specific coefficients.

const challenges: ChallengeDef[] = [
  {
    id: 'challenge-1',
    name: 'Challenge I: No Accelerators',
    position: 1,
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:209-213 — Accelerators & Multipliers disabled
    effect:
      'Accelerators and Multipliers are disabled. Free Accelerator and Multiplier generation are reduced.',
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC); 210-212 show: 2× completion → Prestige Points, 0.75× → Accelerator Boost, 0.04× → Multiplier
    reward:
      'Per completion: ×2 Prestige Points gain, ×0.75 Accelerator Boost effectiveness, ×0.04 Multiplier effectiveness.',
  },
  {
    id: 'challenge-2',
    name: 'Challenge II: Prestige Nerf',
    position: 2,
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:215-218 — Prestige Points generation halved
    effect:
      'Prestige Points generation is severely reduced. Prestige-tier buildings produce 80% less.',
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC); 216-217 show: 5× completion → both Prestige Points and Accelerator generation
    reward:
      'Per completion: ×5 Prestige Points gain, ×5 Accelerator production, ×0.25 Multiplier power.',
  },
  {
    id: 'challenge-3',
    name: 'Challenge III: Producer Curse',
    position: 3,
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:220-224 — Building costs increase exponentially; production reduced
    effect:
      'All producer costs increase by a factor of 10 per level. Building production reduced by 50%.',
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC); 221-223 show: 0.04× completion (flat), 0.5× ECC → Accelerator, 0.01× ECC → Multiplier
    reward:
      'Per completion: ×0.04 flat bonus, ×0.5 Accelerator Boost, ×0.01 Multiplier Boost effectiveness.',
  },
  {
    id: 'challenge-4',
    name: 'Challenge IV: Acceleration Lock',
    position: 4,
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:226-230 — Accelerators heavily nerfed; costs scaled
    effect:
      'Accelerators are capped at a low level. Accelerator costs increase exponentially. Multipliers weakened.',
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC); 227-229 show: 5× ECC → Prestige Points, 2× ECC → Accelerator, 0.5× ECC → Multiplier
    reward: 'Per completion: ×5 Prestige Points, ×2 Accelerator boost, ×0.5 Multiplier power.',
  },
  {
    id: 'challenge-5',
    name: 'Challenge V: Ascension Trial',
    position: 5,
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:232-236 — Mixed nerfs: accelerator base reduced, multiplier costs increase
    effect:
      'Accelerator base effectiveness halved. Multiplier costs increase 10× per level. Prestige Points gain heavily reduced.',
    // vanilla canonical: SynergismOfficial/src/Challenges.ts:541-548 (CalcECC); 233-235 show: 0.5 + ECC/100 linear→ prestige modifier, 10^ECC → coin scaling, 5× ECC → mythos production
    reward:
      'Per completion: +0.5 to prestige point multiplier, ×10^ECC coin exponent, ×5 Mythos production rate.',
  },
];

// ─── Export ─────────────────────────────────────────────────────────────────

export const TRANSCEND: TranscendTierData = {
  producers,
  upgrades,
  challenges,
};
