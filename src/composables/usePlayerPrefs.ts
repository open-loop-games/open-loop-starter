/**
 * Player-level preferences shared across all demos in the gallery.
 *
 * Persists to localStorage outside any engine's namespace, so flipping
 * the theme in one demo carries to every other demo in the gallery.
 * Engine-namespaced settings (see `useSettings` / `settingsModule`) are
 * for demo-mechanic toggles only.
 *
 * Singleton — refs are created on first import and reused. Writes are
 * mirrored to localStorage via `watch`.
 */

import { ref, watch, watchEffect, type Ref } from 'vue';

const STORAGE_KEY = 'open-loop-starter:player-prefs';

export type ThemePref = 'dark' | 'light' | 'system';

export interface PlayerPrefs {
  theme: Ref<ThemePref>;
  notation: Ref<string>;
  uiScale: Ref<number>;
  autoSave: Ref<boolean>;
  autoSaveIntervalMs: Ref<number>;
}

interface PlayerPrefsSnapshot {
  theme: ThemePref;
  notation: string;
  uiScale: number;
  autoSave: boolean;
  autoSaveIntervalMs: number;
}

const DEFAULTS: PlayerPrefsSnapshot = {
  theme: 'dark',
  notation: 'standard',
  uiScale: 1,
  autoSave: true,
  autoSaveIntervalMs: 60_000,
};

function loadSnapshot(): PlayerPrefsSnapshot {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PlayerPrefsSnapshot>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(snap: PlayerPrefsSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Quota exceeded or storage disabled — preferences won't persist this session.
  }
}

let instance: PlayerPrefs | null = null;

function applyDomEffects(prefs: PlayerPrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (): void => {
    const pref = prefs.theme.value;
    root.dataset.theme = pref === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : pref;
  };
  watchEffect(apply);
  mediaQuery.addEventListener('change', apply);
  watchEffect(() => {
    root.style.setProperty('--ui-scale', String(prefs.uiScale.value));
  });
}

export function usePlayerPrefs(): PlayerPrefs {
  if (instance) return instance;

  const initial = loadSnapshot();
  const prefs: PlayerPrefs = {
    theme: ref(initial.theme),
    notation: ref(initial.notation),
    uiScale: ref(initial.uiScale),
    autoSave: ref(initial.autoSave),
    autoSaveIntervalMs: ref(initial.autoSaveIntervalMs),
  };

  watch(
    [prefs.theme, prefs.notation, prefs.uiScale, prefs.autoSave, prefs.autoSaveIntervalMs],
    () => {
      persist({
        theme: prefs.theme.value,
        notation: prefs.notation.value,
        uiScale: prefs.uiScale.value,
        autoSave: prefs.autoSave.value,
        autoSaveIntervalMs: prefs.autoSaveIntervalMs.value,
      });
    },
  );

  instance = prefs;
  applyDomEffects(prefs);
  return prefs;
}
