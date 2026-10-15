import {
  Decimal,
  createResource,
  persistent,
  ref,
  shallowRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Resource,
  type ShallowRef,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { BASE_SEEDLINGS, PLOTS } from '../data';
import { GardenKey } from './garden';
import { createPlotRun, type PlotRun } from './run';

/**
 * Plot module — the run in progress. It starts a plot from the garden's
 * anchors and lessons, drives it from the engine tick, and when the run ends
 * submits its score to the plot's record and opens the next plot on a hold.
 */
export interface PlotResult {
  plotId: string;
  outcome: 'held' | 'lost' | 'left';
  score: number;
  wavesCleared: number;
  newBest: boolean;
  levelBefore: number;
  levelAfter: number;
  /** Nights seen off past the plot's last, in the dark. */
  depth: number;
}

export interface PlotApi {
  compost: Resource<DecimalSource>;
  seedlings: Resource<DecimalSource>;
  run: ShallowRef<PlotRun | null>;
  lastResult: ShallowRef<PlotResult | null>;
  startPlot(plotId: string): PlotRun;
  /** Leave the plot. A run still in play is left, and banks the waves it cleared; a run at the hold calls it a night. */
  leavePlot(): void;
}

export const PlotKey: InjectionKey<PlotApi> = Symbol('defender/plot') as InjectionKey<PlotApi>;

const plotApi = createModuleApi(PlotKey);
export const getPlot = plotApi.get;

const num = (v: DecimalSource) => new Decimal(v).toNumber();

export function createPlotModule(): EngineModule {
  return {
    id: 'defender/plot',
    install(ctx) {
      const garden = ctx.inject(GardenKey);
      // A run is not saved, so its two stocks wrap plain refs rather than persisting.
      const compost = createResource(ref<DecimalSource>(0), { displayName: 'Compost' });
      const seedlings = createResource(ref<DecimalSource>(0), { displayName: 'Seedlings' });
      const run = shallowRef<PlotRun | null>(null);
      const lastResult = shallowRef<PlotResult | null>(null);
      const attempts = persistent<Record<string, number>>({}, { id: 'attempts' });

      function finish(r: PlotRun, outcome: PlotResult['outcome']) {
        const plotId = r.def.id;
        const before = garden.records.entries.value[plotId];
        const levelBefore = garden.level.value;
        const n = (attempts.value[plotId] ?? 0) + 1;
        attempts.value = { ...attempts.value, [plotId]: n };
        garden.records.submit({ key: plotId, value: r.score, elapsed: r.elapsed, runNumber: n });
        lastResult.value = {
          plotId,
          outcome,
          score: r.score,
          wavesCleared: r.waveLogs.filter((l) => l.wave < r.wave || r.phase === 'won').length,
          newBest: !before || r.score > before.value.toNumber(),
          levelBefore,
          levelAfter: garden.level.value,
          depth: r.depth,
        };
      }

      function startPlot(plotId: string): PlotRun {
        const index = PLOTS.findIndex((p) => p.id === plotId);
        if (index < 0 || !garden.plots.isUnlocked(plotId))
          throw new Error(`Plot ${plotId} is not open`);
        garden.plots.select(plotId);
        compost.value = Math.floor(
          num(garden.chains.startCompost.apply(garden.anchors.value.startCompost)),
        );
        seedlings.value = Math.floor(num(garden.chains.seedlings.apply(BASE_SEEDLINGS)));
        const r = createPlotRun(
          index,
          PLOTS[index],
          {
            anchors: garden.anchors.value,
            specs: garden.specs.value,
            damageMult: () => num(garden.chains.damage.apply(1)),
            rangeBonus: () => num(garden.chains.range.apply(0)),
            earlyCallMult: () => num(garden.chains.earlyCall.apply(1)),
            isUnlocked: garden.isPlantUnlocked,
          },
          compost,
          seedlings,
        );
        r.on((e) => {
          // Holding the last night holds the plot and opens the next, before the gardener chooses.
          if (e.type === 'held') {
            if (!garden.held.value.includes(r.def.id))
              garden.held.value = [...garden.held.value, r.def.id];
            const next = PLOTS[r.plotIndex + 1];
            if (next) garden.plots.unlock(next.id);
          }
          if (e.type === 'end') finish(r, e.outcome === 'won' ? 'held' : 'lost');
        });
        lastResult.value = null;
        run.value = r;
        return r;
      }

      function leavePlot() {
        const r = run.value;
        if (r?.phase === 'held') r.finish();
        else if (r && (r.phase === 'build' || r.phase === 'wave'))
          finish(r, r.tail ? 'held' : 'left');
        run.value = null;
      }

      ctx.onTick((dt) => run.value?.step(dt));

      const api: PlotApi = { compost, seedlings, run, lastResult, startPlot, leavePlot };
      plotApi.publish(ctx, api);
    },
  };
}
