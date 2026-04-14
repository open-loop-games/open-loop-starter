import { watchEffect } from 'vue';
import type { Engine } from 'open-loop-engine';
import { SettingsKey } from '@/modules/settings';

/**
 * Syncs the theme setting to the document's data-theme attribute.
 * Call once after engine start. Takes engine directly because it runs
 * from an event handler, outside Vue's inject() scope.
 */
export function useTheme(engine: Engine) {
  const settings = engine.tryInject(SettingsKey)!.settings;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme() {
    const pref = settings.theme.value;
    if (pref === 'system') {
      document.documentElement.dataset.theme = mediaQuery.matches ? 'dark' : 'light';
    } else {
      document.documentElement.dataset.theme = pref;
    }
  }

  mediaQuery.addEventListener('change', applyTheme);
  watchEffect(applyTheme);
}
