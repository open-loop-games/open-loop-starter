import type { Persistent } from 'open-loop-engine';
import { useModule } from './useModule';
import { SettingsKey } from '@/modules/settings';

export interface StockSettings {
  autoSave: Persistent<boolean>;
  offlineProgress: Persistent<boolean>;
  theme: Persistent<string>;
  notation: Persistent<string>;
}

export function useSettings(): StockSettings {
  return useModule(SettingsKey).settings;
}
