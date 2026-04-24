/**
 * OL-674 — capture inspector cpuprofile over the b2 scenario of the
 * event-driven bench, for archetype-vs-synthetic flame-graph diff.
 *
 * Runs ONE scenario (b2 — cursor unreachable) with the inspector Profiler
 * wrapped around the hot loop. No comparison, no sweep — this is a one-shot
 * to capture a Producer-shaped call stack for OL-673 attribution.
 *
 * Run via `vite-node` (Node runtime). The bench imports Node built-ins via
 * untyped dynamic requires because the starter doesn't depend on
 * `@types/node` and `vue-tsc` would otherwise complain.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (mod: string) => any;
declare const process: { exit(code: number): never };
interface InspectorSession {
  connect(): void;
  post(method: string, params?: unknown): Promise<{ profile: unknown }>;
  disconnect(): void;
}
const { Session } = require('node:inspector/promises') as {
  Session: new () => InspectorSession;
};
const { writeFileSync } = require('node:fs') as {
  writeFileSync: (path: string, data: string) => void;
};
import {
  advanceToNextEvent,
  buildTransitionSnapshot,
  seedRNG,
  type Engine,
  type GameStateAccessor,
} from 'open-loop-engine';
import { ARC_BEATS } from './beats';
import { buildProducerAccessor, buildProducerSimEngine } from './bot';

const BUDGET_SEC = 200 * 60 * 2.5;

async function main(): Promise<void> {
  const beat = ARC_BEATS.find((b) => b.id === 'beat-2')!;
  const overrides = {
    producers: [{ id: 'cursor', purchase: { baseCost: 400, costScaling: 1.15 } }],
  };

  seedRNG(0);
  const engine: Engine = buildProducerSimEngine(overrides, { maxDeltaTime: BUDGET_SEC });
  const accessor: GameStateAccessor = buildProducerAccessor(engine);

  const session = new Session();
  session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.start');

  let simTime = 0;
  let refusesNoFinite = 0;
  let advances = 0;
  const t0 = performance.now();
  while (true) {
    if (beat.predicate(engine)) break;
    if (simTime >= BUDGET_SEC) break;
    const snapshot = buildTransitionSnapshot(engine, accessor);
    const result = advanceToNextEvent(engine, snapshot);
    const advanced = 'fired' in result ? result.advanced : 0;
    if (advanced > 0) {
      advances++;
      simTime += advanced;
    } else {
      refusesNoFinite++;
      const dt = Math.min(1, BUDGET_SEC - simTime);
      if (dt <= 0) break;
      engine.loop.simulateTick(dt);
      simTime += dt;
    }
  }
  const wallMs = performance.now() - t0;

  const { profile } = await session.post('Profiler.stop');
  const out = 'profiles/producer-b2-inner.cpuprofile';
  writeFileSync(out, JSON.stringify(profile));
  await session.post('Profiler.disable');
  session.disconnect();

  console.log(
    `b2 bench: wall=${wallMs.toFixed(0)}ms advances=${advances} refuses=${refusesNoFinite} sim=${simTime.toFixed(0)}s`,
  );
  console.log(`profile: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
