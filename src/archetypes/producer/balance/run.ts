/**
 * Producer balance discovery script.
 *
 * Iteration loop:
 *   1. tweak `data/{producers,upgrades,achievements}.ts` or `PRODUCER_BALANCE`
 *   2. `pnpm balance:producer`
 *   3. read the punch list — find the red rows
 *   4. tweak again
 *
 * Drives `buildProducerSimEngine()` via `runArcProbe` at `tickDelta: 1s`.
 * Methodology is documented in `archetypes/BALANCING.md`.
 */

import { type Engine } from 'open-loop-engine';
import {
  renderArcTable,
  renderFlowTable,
  runArcProbe,
  runFlowProbe,
  type ProducerInspector,
} from '@/balance';
import { BuildingsKey, ProducerDataKey } from '../modules';
import { ARC_BEATS, BEAT_WINDOWS, FLOW_BEATS } from './beats';
import { buildProducerSimEngine } from './bot';

const inspect: ProducerInspector = {
  ownedProducers: (engine: Engine) => {
    const buildings = engine.tryInject(BuildingsKey);
    const data = engine.tryInject(ProducerDataKey);
    if (!buildings || !data) return [];

    const out: ReturnType<ProducerInspector['ownedProducers']> = [];
    for (const def of data.producers) {
      if (def.trigger !== 'continuous' || !def.purchase) continue;
      const p = buildings.getProducer(def.id);
      if (!p) continue;
      const count = Number(p.count.value);
      if (count < 1) continue;

      const baseRate = Number(def.baseRate);
      const stackedPerUnit = Number(p.rateChain.apply(baseRate));

      out.push({
        id: def.id,
        level: count,
        quantity: count,
        perUnitRate: stackedPerUnit,
        baseCost: Number(def.purchase.baseCost),
        costScaling: Number(def.purchase.costScaling),
      });
    }
    return out;
  },
};

function main(): void {
  const t0 = Date.now();

  console.log('# Producer balance probe\n');
  console.log(`Run at ${new Date().toISOString()}\n`);

  console.log('## Arc beats (engine sim, tickDelta 1s)\n');
  const arcResults = runArcProbe({
    buildEngine: () => buildProducerSimEngine(),
    beats: ARC_BEATS,
    seeds: [0, 1, 2, 3, 4],
    maxSimTime: BEAT_WINDOWS['beat-8']![1] * 2.5,
    tickDelta: 1,
  });
  console.log(renderArcTable(arcResults));
  console.log();

  console.log('## Per-producer pacing texture\n');
  console.log(
    'Beat-time = next-purchase cost / own-income production. Channel via Csikszentmihalyi flow bands:',
  );
  console.log(
    'arousal [5–30s) · FLOW [30s–2m) · flow-upper [2–5m) · ! boredom · !! frustration · !!! breakdown\n',
  );
  const flowResults = runFlowProbe({
    buildEngine: () => buildProducerSimEngine(),
    beats: FLOW_BEATS,
    inspect,
  });
  console.log(renderFlowTable(flowResults));
  console.log();

  console.log('## Punch list\n');
  const simFailed = arcResults.filter((r) => !r.inWindow);
  if (simFailed.length === 0) {
    console.log('All arc beats land inside their § 4 windows.');
  } else {
    for (const r of simFailed) {
      const p50 = r.terminationTime?.p50;
      const [lo, hi] = r.specWindow;
      let diag: string;
      if (p50 == null || r.counts.predicate === 0) {
        diag = `never fired across ${r.counts.maxSimTime} seeds`;
      } else if (p50 < lo) {
        diag = `fired ${fmt(lo - p50)} too early (p50 ${fmt(p50)}, window starts ${fmt(lo)})`;
      } else {
        diag = `fired ${fmt(p50 - hi)} too late (p50 ${fmt(p50)}, window ends ${fmt(hi)})`;
      }
      console.log(`- ${r.beatId}: ${diag}`);
    }
  }
  console.log();

  const outOfFlow: string[] = [];
  for (const snap of flowResults) {
    for (const p of snap.perProducer) {
      if (p.channel === 'boredom' || p.channel === 'frustration' || p.channel === 'breakdown') {
        outOfFlow.push(
          `- ${snap.beatId}: ${p.producerId} payback ${fmt(p.beatTimeSeconds)} (${p.channel})`,
        );
      }
    }
  }
  if (outOfFlow.length > 0) {
    console.log('## Out-of-flow producers\n');
    outOfFlow.forEach((line) => console.log(line));
    console.log();
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

main();
