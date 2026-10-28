/**
 * Shared probe fixture, not runnable on its own: one seeded career. Takes back to back from
 * a fresh save, each at the harshest open rating with the signed stars in turn, the star
 * improvising, and the reference agent shopping between takes. `firsts` is the session time
 * (the sum of the takes before) each milestone first lands.
 */

import { toNumber } from '@open-loop/engine';
import { RATINGS } from '../data';
import { buildSet, callSheet, playTake, shop, type TakeResult } from './_set';

export interface Job {
  seed: number;
  takes: number;
}

export interface Career {
  seed: number;
  takes: (TakeResult & { at: number; bought: string[] })[];
  firsts: Record<string, number>;
  agency: Record<string, number>;
  seconds: number;
}

export function playCareer(job: Job): Career {
  const set = buildSet(job.seed);
  let clockS = 0;
  const firsts: Record<string, number> = {};
  const mark = (k: string, t: number) => (firsts[k] ??= t);
  const takes: Career['takes'] = [];
  for (let n = 0; n < job.takes; n++) {
    const sheet = callSheet(set);
    const star = sheet.stars[n % sheet.stars.length]!;
    const r = playTake(set, { star, rating: sheet.rating, seed: job.seed * 1000 + n });
    if (n === 0 && r.rewrites[0] !== undefined) mark('the first rewrite', r.rewrites[0]);
    const at = clockS;
    clockS += r.seconds;
    if (r.end === 'cut') mark(`CUT at ${RATINGS[r.rating]!.label}`, clockS);
    if (set.meta.record.pictureWrapped.value) mark('the picture wraps', clockS);
    const bought = shop(set);
    for (const b of bought) if (b.startsWith('signed')) mark(b, clockS);
    if (
      set.meta.agency
        .getAll()
        .every(
          (e) =>
            !Number.isFinite(toNumber(e.purchasable.getCost(1))) ||
            Number(e.purchasable.count.value) >= e.def.maxLevel,
        )
    )
      mark('the agency bought out', clockS);
    for (const rating of RATINGS.slice(1))
      if (set.meta.ratings.getPurchasable(rating.id)?.active.value)
        mark(`${rating.label} opens`, clockS);
    takes.push({ ...r, at, bought });
  }
  const agency = Object.fromEntries(
    set.meta.agency.getAll().map((e) => [e.def.id, Number(e.purchasable.count.value)]),
  );
  set.dispose();
  return { seed: job.seed, takes, firsts, agency, seconds: clockS };
}
