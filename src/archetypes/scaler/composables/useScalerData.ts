import { inject } from 'vue';
import type { ScalerData } from '../data/types';

export const SCALER_DATA_KEY = 'scaler:data';

/**
 * Access the active scaler data bag — the same object the engine modules
 * closed over at construction. Supplied by `boot.ts` via Vue's
 * `app.provide('scaler:data', data)`. Use for tooltip copy, picker labels,
 * and balance-constant lookups.
 */
export function useScalerData(): ScalerData {
  const data = inject<ScalerData>(SCALER_DATA_KEY);
  if (!data) throw new Error('useScalerData: scaler:data not provided by boot.ts');
  return data;
}
