/**
 * Survivor: cone probe. What the Pyro Gag is worth under a better aim than the star's
 * instinct has. Installs the gag at level 4 on every star, plays G takes with the star
 * improvising, and while the gag is about to fire compares the bodies its cone holds with
 * the most any facing from the same spot would hold. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/cone-probe.ts [seeds]`
 * (default 4).
 *
 * The comparison is a ceiling, not a simulated player: a free rotation costs nothing here,
 * and a real turn costs position. `HEADING_BOUND_DISCOUNT` in `../modules/sim/draft.ts`
 * discounts the gag for an improvising star by about the gap this measures; a smaller gap
 * would shrink it.
 *
 * How to read it: `capture` is bodies caught over bodies the best facing would catch, over
 * every armed tick; `at fire` is the same at the instants the gag fired.
 */

import { runUntil } from '@open-loop/engine';
import { RIG_BY_ID, STARS, type StarDef } from '../data';
import { CONNECT_HORIZON } from '../modules/sim/steering';
import { inCone } from '../modules/sim/arena';
import { seedBatch } from '@/balance';
import { MAX_TAKE_SECONDS, TICK, buildSet, openAll } from './_set';
import { claimChunk, emitResult, runPool } from './_pool';

interface Job {
  star: StarDef['id'];
  seed: number;
}

interface Reading {
  star: StarDef['id'];
  armed: number;
  caught: number;
  best: number;
  fires: number;
  caughtAtFire: number;
  bestAtFire: number;
}

const FACINGS = 32;
const GAG = RIG_BY_ID['pyro-gag'];

function read(job: Job): Reading {
  const set = buildSet(job.seed);
  openAll(set);
  const { take, engine } = set;
  take.startTake({ star: job.star, rating: 0, driver: 'instinct', seed: job.seed });
  const a = take.arena()!;
  const held = a.rigs.find((r) => r.def.id === GAG.id);
  if (held) held.level = 4;
  else a.rigs.push({ def: GAG, level: 4, cd: 0 });
  const out: Reading = {
    star: job.star,
    armed: 0,
    caught: 0,
    best: 0,
    fires: 0,
    caughtAtFire: 0,
    bestAtFire: 0,
  };
  let lastCd = 0;
  // The gag's slot and the cone read before an advance, for the fire check after it.
  let slot = a.rigs.find((r) => r.def.id === GAG.id)!;
  let caught = 0;
  let best = 0;
  // TODO(expansion): a per-iteration act hook on runUntil. Until then `until` carries the
  // probe's step, which `'uniform'` mode runs before every advance.
  const run = runUntil({
    engine,
    tickDelta: TICK,
    maxSimTime: MAX_TAKE_SECONDS,
    until: ({ iteration }) => {
      if (iteration > 0) {
        if (slot.cd > lastCd + 0.5 && best > 0) {
          out.fires++;
          out.caughtAtFire += caught;
          out.bestAtFire += best;
        }
        lastCd = slot.cd;
      }
      if (take.view.screen !== 'take') return true;
      slot = a.rigs.find((r) => r.def.id === GAG.id)!;
      const p = a.player;
      caught = 0;
      best = 0;
      if (slot.cd <= CONNECT_HORIZON) {
        caught = inCone(a.extras, p, p.facing, GAG.reach).length;
        for (let i = 0; i < FACINGS; i++)
          best = Math.max(best, inCone(a.extras, p, (i / FACINGS) * Math.PI * 2, GAG.reach).length);
        if (best > 0) {
          out.armed++;
          out.caught += caught;
          out.best += best;
        }
      }
      return false;
    },
  });
  if (run.terminated !== 'predicate')
    throw new Error(`a take ran past ${MAX_TAKE_SECONDS} s without ending`);
  set.dispose();
  return out;
}

const chunk = claimChunk<Job>();
if (chunk) {
  for (const job of chunk) emitResult(read(job));
} else {
  const seeds = Number(process.argv[2] ?? 4);
  const jobs = STARS.flatMap((s) => seedBatch(seeds).map((seed) => ({ star: s.id, seed })));
  const t0 = performance.now();
  const rs = await runPool<Job, Reading>(import.meta.url, jobs);
  console.log(`\nSURVIVOR cone probe: ${seeds} seeds a star, the Pyro Gag at level 4, G\n`);
  console.log('star       armed ticks  in cone  best cone  capture  at fire');
  let all = { caught: 0, best: 0, cf: 0, bf: 0 };
  for (const star of STARS) {
    const r = rs.filter((x) => x.star === star.id);
    const sum = (k: keyof Reading) => r.reduce((a, x) => a + (x[k] as number), 0);
    const armed = sum('armed');
    all = {
      caught: all.caught + sum('caught'),
      best: all.best + sum('best'),
      cf: all.cf + sum('caughtAtFire'),
      bf: all.bf + sum('bestAtFire'),
    };
    console.log(
      `${star.id.padEnd(10)} ${String(armed).padEnd(12)} ${(sum('caught') / armed).toFixed(2).padEnd(8)} ` +
        `${(sum('best') / armed).toFixed(2).padEnd(10)} ${((100 * sum('caught')) / sum('best')).toFixed(0).padStart(3)}%     ` +
        `${((100 * sum('caughtAtFire')) / Math.max(1, sum('bestAtFire'))).toFixed(0)}% (${sum('fires')} fires)`,
    );
  }
  console.log(
    `\nAll stars: ${((100 * all.caught) / all.best).toFixed(0)}% of the best cone while armed, ` +
      `${((100 * all.cf) / Math.max(1, all.bf)).toFixed(0)}% at the instant it fires.`,
  );
  console.log(`${jobs.length} takes in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}
