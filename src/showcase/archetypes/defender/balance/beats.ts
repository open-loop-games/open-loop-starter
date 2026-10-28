/**
 * The manifest's beat recording: the arc probe's run under the reference gardener, read for
 * the sim-second each plot is held. `pnpm beats defender` plays it beside the recorded
 * windows.
 *
 * The gardener is deterministic, so one run from a cold start is the measurement. The loop
 * mirrors the probe's: each plot gets up to three attempts, and the gardener calls each
 * wave early.
 */
import { runUntil } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { PLOTS } from '../data';
import { createDefenderModules, getGarden, getPlot } from '../modules';
import { spendNotes, tendPlot } from './_gardener';

const MAX_ATTEMPTS = 3;
const TICK_DELTA = 0.05;

/** The runs one recording spans: one deterministic arc through every plot. */
export const runs = [{ plots: PLOTS.length }];

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const { engine } = bootTestEngine({
    modules: [...sharedBase, ...createDefenderModules()],
    persistenceNamespacePrefix: 'defender-beats',
  });
  const garden = getGarden();
  const plot = getPlot();
  const held: Record<number, number | null> = {};
  let clock = 0;

  for (const [pi, def] of PLOTS.slice(0, run.plots).entries()) {
    held[pi + 1] = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (!garden.plots.isUnlocked(def.id)) break;
      spendNotes(garden);
      const session = plot.startPlot(def.id);
      let heldAt: number | null = null;
      const opts = { callEarly: true };
      session.on((e) => {
        if (e.type === 'build') tendPlot(garden, plot, session, opts);
        if (e.type === 'held') session.finish();
        if (e.type === 'end' && e.outcome === 'won') heldAt = clock + session.elapsed;
      });
      tendPlot(garden, plot, session, opts);
      const res = runUntil({
        engine,
        until: () => session.phase === 'won' || session.phase === 'lost',
        maxSimTime: 3600,
        tickDelta: TICK_DELTA,
      });
      clock += res.elapsedSimulated;
      plot.leavePlot();
      if (session.phase === 'won') {
        held[pi + 1] = heldAt;
        break;
      }
    }
  }
  engine.dispose();
  return held;
}
