import { ref, type Ref } from 'vue';
import {
  persistent,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Persistent,
} from '@open-loop/engine';

/**
 * Demo-level toggles that persist with the engine save (per-demo, per-slot).
 * Player-level prefs (theme, notation, ui scale, autosave) live in
 * `usePlayerPrefs` and are shared across every demo in the gallery.
 */
export interface StockSettings {
  offlineProgress: Persistent<boolean>;
}

export interface SettingsState {
  settings: StockSettings;
  /** When `useSave().save()` last wrote the active slot, in ms; 0 before the first. */
  lastSaveTimestamp: Ref<number>;
}

export const SettingsKey: InjectionKey<SettingsState> = Symbol(
  'settings',
) as InjectionKey<SettingsState>;

export const settingsModule: EngineModule = {
  id: 'settings',
  install(ctx: EngineContext) {
    const settings: StockSettings = {
      offlineProgress: persistent(true, { name: 'offlineProgress' }),
    };
    const lastSaveTimestamp: Ref<number> = ref(0);

    ctx.provide(SettingsKey, { settings, lastSaveTimestamp });
  },
};
