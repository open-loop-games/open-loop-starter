import { watch } from 'vue';
import { notationManager, Presets } from '@open-loop/engine';
import { usePlayerPrefs } from './usePlayerPrefs';

/** Curated notation options for the settings picker */
export const NOTATION_OPTIONS = [
  { id: 'standard', label: 'Standard (1 k, 1 M, 1 B)' },
  { id: 'scientific', label: 'Scientific (1e3, 1e6)' },
  { id: 'engineering', label: 'Engineering (1e3, 10e6)' },
  { id: 'logarithm', label: 'Logarithm (e15)' },
  { id: 'letters', label: 'Letters (1a, 1b)' },
  { id: 'mixed-scientific', label: 'Mixed Scientific' },
] as const;

let presetsRegistered = false;
function ensurePresetsRegistered(): void {
  if (presetsRegistered) return;
  notationManager.register('logarithm', Presets.Logarithm);
  notationManager.register('letters', Presets.Letters);
  notationManager.register('mixed-scientific', Presets.MixedScientific);
  presetsRegistered = true;
}

/**
 * Registers extra notation presets and binds the active notation to the
 * player-level pref. Idempotent, so every game mounted on the page may call it.
 */
export function useNotation(): void {
  ensurePresetsRegistered();
  const prefs = usePlayerPrefs();
  watch(
    prefs.notation,
    (key) => {
      if (notationManager.getAvailable().includes(key)) {
        notationManager.setActive(key);
      }
    },
    { immediate: true },
  );
}
