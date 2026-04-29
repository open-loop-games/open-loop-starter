/**
 * Vitest setup file — runs once per worker before any test file. Loaded
 * via `vitest.config.ts` (see `test.setupFiles`). Any test-framework
 * side effects belong here, not inside `bootMod.ts` or accessor packs,
 * since those are also consumed by runtime code (the benchmark mod)
 * that has no vitest globals.
 */
import { vi } from 'vitest';

vi.stubGlobal('performance', globalThis.performance ?? { now: () => Date.now() });

// jsdom doesn't implement scrollIntoView; reka-ui Listbox calls it after selection.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
