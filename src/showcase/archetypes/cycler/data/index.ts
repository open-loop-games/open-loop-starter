// Cycler archetype — data barrel. Pure config: typed defs + balance constants
// with co-located closed-form lenses (`// ─── Balance ───`). Engine-runtime-free;
// modules read these at construction, the projection reads them on paper.
export { BUILD_BALANCE, type BuildBalance } from './build';
export { THREAT_BALANCE, BURN_TIERS, type ThreatBalance, type BurnTier } from './threat';
export { CADENCE_BALANCE, type CadenceBalance } from './cadence';
export { UPGRADE_BALANCE, type UpgradeBalance } from './upgrades';
export { PRESTIGE_BALANCE, type PrestigeBalance } from './prestige';
