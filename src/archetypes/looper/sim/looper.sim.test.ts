import { describe, it } from 'vitest';

/**
 * Beat suite — 8 it.todo placeholders matching `archetypes/looper.md` § 4.
 *
 * Beat verification — anything requiring `runHeadless` / `runUntil` /
 * `runMatrix` — lives in the balance lane (`balance/probes.ts` +
 * `balance/solve.ts`), NOT in this vitest suite. The balance leaf (OL-737)
 * converts these `it.todo`s to bisect-against-window receipts where window-
 * driven verification fits; the rest stay as documentation of the beat map.
 */
describe('looper — beat map', () => {
  it.todo('beat 1: first action ticks and budget drains within 0–30 s');
  it.todo('beat 2: first loop ends within 2–6 min');
  it.todo('beat 3: first skill level within a run, 6–12 min');
  it.todo('beat 4: first permanent retention visible, 12–22 min');
  it.todo('beat 5: first zone unlock, 18–32 min');
  it.todo('beat 6: first action-queue reorder to exploit retention, 32–55 min');
  it.todo('beat 7: first automation tier unlock, 55–85 min');
  it.todo('beat 8: arc closure (final zone reachable + retention compound visible), 85–120 min');
});
