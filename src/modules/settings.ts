import { ref, type Ref } from 'vue';
import {
  persistent,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Persistent,
} from 'open-loop-engine';
import { useToasts } from '@/composables/useToasts';

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

    const { addToast } = useToasts();
    ctx.onSave(() => {
      lastSaveTimestamp.value = Date.now();
      addToast('Saved', '', 1500);
    });

    ctx.provide(SettingsKey, { settings, lastSaveTimestamp });
  },
};
