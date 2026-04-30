import { ref, type Ref } from 'vue';
import {
  persistent,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
} from 'open-loop-engine';
import type { StockSettings } from '@/composables/useSettings';
import { useToasts } from '@/composables/useToasts';

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
      autoSave: persistent(true, { name: 'autoSave' }),
      offlineProgress: persistent(true, { name: 'offlineProgress' }),
      theme: persistent('dark', { name: 'theme' }),
      notation: persistent('standard', { name: 'notation' }),
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
