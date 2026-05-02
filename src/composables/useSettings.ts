import type { Persistent } from 'open-loop-engine';
import { useModule } from './useModule';
import { SettingsKey } from '@/modules/settings';

/**
 * Demo-level toggles that persist with the engine save (per-demo, per-slot).
 * Player-level prefs (theme, notation, ui scale, autosave) live in
 * `usePlayerPrefs` and are shared across every demo in the gallery.
 */
export interface StockSettings {
  offlineProgress: Persistent<boolean>;
}

export function useSettings(): StockSettings {
  return useModule(SettingsKey).settings;
}
