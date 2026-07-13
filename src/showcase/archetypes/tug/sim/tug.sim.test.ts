import { describe, it } from 'vitest';

/**
 * Tug beat-map placeholder suite — one `it.todo` per beat. Engine-driven
 * beat verification rides the methodology-#3 sensitivity sweep in
 * `balance/arc-probe.ts`; sim drivers stay out of this vitest suite. These
 * todos exist so any future shape-change to a beat surfaces here as a
 * missing-test signal rather than vanishing silently when the balance
 * lane isn't running.
 */

describe('tug beats — structural placeholders (no runHeadless)', () => {
  it.todo('beat 1 — first unit purchased (player.unitsSent ≥ 1, 0:00–1:00)');

  it.todo('beat 2 — first auto-resolve combat observed (units meet in lane, 1:00–3:00)');

  it.todo('beat 3 — first counter-pivot (counterPivotsThisMatch ≥ 1, 5:00–15:00)');

  it.todo('beat 4 — first match completion (match.outcome !== null, 15:00–30:00)');

  it.todo('beat 5 — second-match composition pivot (different opener archetype, 30:00–50:00)');

  it.todo('beat 6 — counter-type mastery demonstrated (≥2 pivots in a winning match, 45:00–75:00)');
});
