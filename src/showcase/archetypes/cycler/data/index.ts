// Cycler archetype — data barrel. Pure config: typed defs + balance constants
// with co-located closed-form lenses (`// ─── Balance ───`). Engine-runtime-free;
// modules read these at construction, the projection reads them on paper.
export { BUILD_BALANCE, type BuildBalance } from './build';
export { DEFENSE_BALANCE, type DefenseBalance } from './defense';
export {
  BOARD,
  PIECES,
  REFERENCE_LAYOUT,
  type PieceKind,
  type PieceDef,
  type ConnectionShape,
} from './pieces';
export { THREAT_BALANCE, BURN_TIERS, type ThreatBalance, type BurnTier } from './threat';
export { CADENCE_BALANCE, type CadenceBalance } from './cadence';
export { UPGRADE_BALANCE, type UpgradeBalance } from './upgrades';
export { PRESTIGE_BALANCE, type PrestigeBalance } from './prestige';
