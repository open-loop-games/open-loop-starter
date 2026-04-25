import { describe, it } from 'vitest';

/**
 * Ambient beat-map placeholder suite — one `it.todo` per beat in
 * `archetypes/ambient.md` § 4. Engine-driven beat verification lives in the
 * Tier-A balance lane (`balance/offline-probe.ts`, `balance/no-pressure-audit.ts`);
 * § 7 forbids `runHeadless` inside the vitest suite. These todos exist so any
 * future shape-change to a beat surfaces here as a missing-test signal rather
 * than vanishing silently when the balance lane isn't running.
 */

describe('ambient beats — structural placeholders (no runHeadless)', () => {
  it.todo('beat 1 — first passive production visible (primary ≥ 1, no clicks, 0:00–0:30)');

  it.todo('beat 2 — first auto-producer purchased (planter.count ≥ 1, 1:00–3:00)');

  it.todo('beat 3 — first visibility unlock revealed (30:00–1:30:00)');

  it.todo('beat 4 — glance-check value proposition proven (return rewarded, 1:30:00–3:00:00)');

  it.todo('beat 5 — mid-arc scene diversification (mid producer + scene-variant, 3:00:00–5:00:00)');

  it.todo('beat 6 — first low-urgency achievement multiplier fires (5:00:00–8:00:00)');

  it.todo('beat 7 — prestige-eligible state reached / arc closure (8:00:00–12:00:00)');
});
