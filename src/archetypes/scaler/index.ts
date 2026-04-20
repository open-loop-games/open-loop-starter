/**
 * Scaler archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars scaler`.
 */
export type {
  ScalerArchetypeVars,
  ScalerThemeVars,
  ScalerBalanceVars,
  ScalerVars,
  ScalerVarsOverride,
  ModifierEvaluationOrder,
  ChallengeRewardShape,
  AutoPrestigeUnlockLayer,
  PrestigeFormulaFamily,
  SoftcapShape,
  LayerUnlockTrigger,
  PrestigeConversion,
  SoftcapThreshold,
  LayerUnlockThreshold,
} from './types';

export {
  DEFAULT_SCALER_ARCHETYPE_VARS,
  DEFAULT_SCALER_THEME_VARS,
  DEFAULT_SCALER_BALANCE_VARS,
  DEFAULT_SCALER_VARS,
} from './vars';

export { loadScalerVars } from './load';
