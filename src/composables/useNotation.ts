import { watchEffect } from 'vue';
import { notationManager, Presets } from 'open-loop-engine';
import { useSettings } from './useSettings';

/** Curated notation options for the settings picker */
export const NOTATION_OPTIONS = [
  { key: 'standard', label: 'Standard (1 k, 1 M, 1 B)' },
  { key: 'scientific', label: 'Scientific (1e3, 1e6)' },
  { key: 'engineering', label: 'Engineering (1e3, 10e6)' },
  { key: 'logarithm', label: 'Logarithm (e15)' },
  { key: 'letters', label: 'Letters (1a, 1b)' },
  { key: 'mixed-scientific', label: 'Mixed Scientific' },
] as const;

/**
 * Registers extra eternal presets and syncs the active notation to the setting.
 * Call once after engine start.
 */
export function useNotation() {
  const settings = useSettings();

  // Register presets beyond the 3 defaults (standard, scientific, engineering)
  notationManager.register('logarithm', Presets.Logarithm);
  notationManager.register('letters', Presets.Letters);
  notationManager.register('mixed-scientific', Presets.MixedScientific);

  watchEffect(() => {
    const key = settings.notation.value;
    if (notationManager.getAvailable().includes(key)) {
      notationManager.setActive(key);
    }
  });
}
