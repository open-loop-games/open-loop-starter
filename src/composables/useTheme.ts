import { watchEffect } from 'vue';
import { useSettings } from './useSettings';

/**
 * Syncs the theme setting to the document's data-theme attribute.
 * Call once after engine start.
 */
export function useTheme() {
  const settings = useSettings();

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
