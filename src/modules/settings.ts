import { ref, type Ref } from 'vue';
import {
  persistent,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Persistent,
} from 'open-loop-engine';
import type { StockSettings } from '@/composables/useSettings';
import { useToasts } from '@/composables/useToasts';

/** Module-level settings state — populated during install, used by Vue composables */
export let stockSettings: StockSettings | null = null;

/** Reactive timestamp of the last save — still exposed for any watcher that wants it */
export const lastSaveTimestamp: Ref<number> = ref(0);

export const settingsModule: EngineModule = {
  id: 'settings',
  install(ctx: EngineContext) {
    beginPersistentContext('settings');
    const autoSave: Persistent<boolean> = persistent(true);
    const offlineProgress: Persistent<boolean> = persistent(true);
    const theme: Persistent<string> = persistent('dark');
    const notation: Persistent<string> = persistent('standard');
    const confirmOnClose: Persistent<boolean> = persistent(true);
    endPersistentContext();

    stockSettings = { autoSave, offlineProgress, theme, notation, confirmOnClose };

    const { addToast } = useToasts();
    ctx.onSave(() => {
      lastSaveTimestamp.value = Date.now();
      addToast('Saved', '', 1500);
    });
  },
};
