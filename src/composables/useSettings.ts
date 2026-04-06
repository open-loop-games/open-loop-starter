import type { Persistent } from 'open-loop-engine';
import { stockSettings } from '@/modules/settings';

export interface StockSettings {
  autoSave: Persistent<boolean>;
  offlineProgress: Persistent<boolean>;
}

export function useSettings(): StockSettings {
  if (!stockSettings) throw new Error('Settings not available — engine not started yet');
  return stockSettings;
}
