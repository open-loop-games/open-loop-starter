/**
 * Producer archetype — public API.
 *
 * Games under src/modules/mods/<game>/vars/ import types and defaults from
 * here, or (once codegen lands) receive copies emitted by
 * `pnpm codegen:archetype-vars producer`.
 */
export type {
  ProducerArchetypeVars,
  ProducerThemeVars,
  ProducerBalanceVars,
  ProducerVars,
  ProducerVarsOverride,
} from './types';

export {
  DEFAULT_PRODUCER_ARCHETYPE_VARS,
  DEFAULT_PRODUCER_THEME_VARS,
  DEFAULT_PRODUCER_BALANCE_VARS,
  DEFAULT_PRODUCER_VARS,
} from './defaults';

export { loadProducerVars } from './load';
