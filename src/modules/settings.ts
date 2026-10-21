import { ref, type Ref } from 'vue';
import {
  onScopeDispose,
  persistent,
  SaveManagerKey,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Persistent,
} from '@open-loop/engine';
import { useToasts } from '@/composables/useToasts';

/**
 * Game-level toggles that persist with the engine save (per game, per slot).
 * Player-level prefs (theme, notation, ui scale, autosave) live in
 * `usePlayerPrefs`, outside any save, and apply to every slot.
 */
export interface StockSettings {
  offlineProgress: Persistent<boolean>;
}

export interface SettingsState {
  settings: StockSettings;
  /** When a save last reached storage, in ms; 0 before the first this play session. */
  lastSaveTimestamp: Ref<number>;
}

export const SettingsKey: InjectionKey<SettingsState> = Symbol(
  'settings',
) as InjectionKey<SettingsState>;

export const settingsModule: EngineModule = {
  id: 'settings',
  install(ctx: EngineContext) {
    const settings: StockSettings = {
      offlineProgress: persistent(true, { id: 'offlineProgress' }),
    };
    const lastSaveTimestamp: Ref<number> = ref(0);

    // `save:written` fires only once a save lands in storage — never for an
    // export, and never for a slot a failed load protects. `ctx.onSave` runs
    // before every serialization, exports included, so it can't carry this.
    // The save manager outlives `engine.dispose()`, so the handler goes with
    // the module's Vue effect scope rather than with the manager.
    const { addToast } = useToasts();
    const saves = ctx.tryInject(SaveManagerKey);
    if (saves) {
      onScopeDispose(
        saves.on('save:written', ({ timestamp }) => {
          lastSaveTimestamp.value = timestamp;
          addToast('Saved', '', 1500);
        }),
      );
    }

    ctx.provide(SettingsKey, { settings, lastSaveTimestamp });
  },
};
