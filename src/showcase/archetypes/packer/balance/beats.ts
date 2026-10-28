/**
 * The manifest's beat recording: the arc probe's run under the reference fitter, read for
 * each beat's fire time. `pnpm beats packer` plays it beside the recorded windows.
 *
 * The game draws nothing at random, but a tick can carry a purchase or an engagement across
 * a boundary, so the recording spans the tick sizes the economy is robust to.
 */
import { runArc } from './_fitter';

/** The runs one recording spans: the whole arc at each tick size. */
export const runs = [0.5, 1, 2].map((dt) => ({ dt }));

/** The probe's beat id behind each manifest beat number. */
const BEAT_IDS: Record<number, string> = {
  1: 'frigate:unlock:rail',
  2: 'frigate:section-6',
  3: 'frigate:section-7',
  4: 'frigate:unlock:director',
  5: 'carrier:brood',
  6: 'carrier:lamprey',
  7: 'lancer:commissioned',
  8: 'lancer:unlock:lance',
  9: 'carrier:siege',
  10: 'carrier:maw',
  11: 'lancer:unlock:tractor',
  12: 'carrier:shrike',
  13: 'carrier:warden',
  14: 'flagship:commissioned',
  15: 'carrier:hive-mother',
  16: 'carrier:null-ark',
  17: 'carrier:breach-mother',
  18: 'carrier:dreadnought',
};

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const { beats } = runArc(run);
  const at = new Map(beats.map((b) => [b.id, b.t]));
  return Object.fromEntries(Object.entries(BEAT_IDS).map(([n, id]) => [n, at.get(id) ?? null]));
}
