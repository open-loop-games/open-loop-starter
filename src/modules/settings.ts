import {
  persistent,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type Persistent,
} from 'open-loop-engine';
import type { StockSettings } from '@/composables/useSettings';

/** Module-level settings state — populated during install, used by Vue composables */
export let stockSettings: StockSettings | null = null;

export const settingsModule: EngineModule = {
  id: 'settings',
  install() {
    beginPersistentContext('settings');
    const autoSave: Persistent<boolean> = persistent(true, false);
    const offlineProgress: Persistent<boolean> = persistent(true, false);
    endPersistentContext();

    stockSettings = { autoSave, offlineProgress };
  },
};
