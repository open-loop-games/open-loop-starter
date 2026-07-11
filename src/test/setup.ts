/**
 * Vitest setup file — runs once per worker before any test file. Loaded
 * via `vitest.config.ts` (see `test.setupFiles`). Any test-framework
 * side effects belong here, not inside `bootTestEngine.ts`, since that
 * primitive may also be consumed by non-vitest runtime code (e.g. benchmark
 * runners) that has no vitest globals.
 */
import { vi } from 'vitest';

vi.stubGlobal('performance', globalThis.performance ?? { now: () => Date.now() });

// jsdom doesn't implement scrollIntoView; reka-ui Listbox calls it after selection.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
