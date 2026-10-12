/**
 * Component test for BalanceWorkbench.vue and the underlying composable.
 *
 * The mounting test exercises the integration shape inside Vue, asserting:
 *  - picker rows render grouped by source
 *  - run() populates progressive `progress` and final `rows`
 *  - commit() / discard() mutate the live engine and clean up
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  addResource,
  createEngine,
  createMemoryStorage,
  createMultiplicativeModifier,
  createProducerCategory,
  createResource,
  type Engine,
  type EngineModule,
} from '@open-loop/engine';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { useBalanceWorkbench } from '@/composables/useBalanceWorkbench';

interface ProducerDef {
  id: string;
  name: string;
  baseRate: number;
}

function makeProducerModule(displayName: string): EngineModule {
  return {
    id: 'toy-producer-bw',
    install(ctx) {
      const gold = createResource(0, { id: displayName, displayName });
      const producers = createProducerCategory<ProducerDef>({
        id: 'producers',
        mapProducer: (def) => ({
          resource: gold,
          baseRate: def.baseRate,
          trigger: 'manual',
        }),
        registerTick: ctx.onTick,
      });
      producers.register([{ id: 'cursor', name: 'Cursor', baseRate: 1 }]);
      const cursor = producers.getProducer('cursor')!;
      cursor.rateChain.add(createMultiplicativeModifier({ multiplier: 2 }));
      ctx.onTick(() => {
        addResource(gold, cursor.rateChain.apply(1));
      });
    },
  };
}

function buildLiveEngine(tag: string, mod: EngineModule): Engine {
  const engine = createEngine({
    gameId: tag,
    persistenceNamespace: `${tag}-${Math.random().toString(36).slice(2)}`,
    storageAdapter: createMemoryStorage(),
    persistence: true,
    autoSaveInterval: 0,
  });
  engine.use(mod);
  engine.start();
  return engine;
}

describe('useBalanceWorkbench composable', () => {
  it('exposes a snapshot grouped by source and runs sensitivity end-to-end', () => {
    const displayName = 'bw-comp-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-comp', modFactory());

    const wb = useBalanceWorkbench({ engine: live, modules: () => [modFactory()] });

    expect(wb.snapshot.value.all.length).toBeGreaterThan(0);
    const cursorEntry = wb.snapshot.value.all.find((e) => e.label.includes('cursor'));
    expect(cursorEntry).toBeDefined();

    wb.selectEntry(cursorEntry!);
    expect(wb.canPerturb.value).toBe(true);

    wb.form.kind = 'scalar-multiply';
    wb.form.factor = 3;
    wb.form.seedCount = 2;
    wb.form.iterations = 5;

    wb.run();

    expect(wb.error.value).toBeNull();
    expect(wb.result.value).not.toBeNull();
    expect(wb.progress.value.completedRuns).toBe(4);
    expect(wb.progress.value.completedCells).toEqual(['baseline', 'variant']);
    expect(wb.rows.value.length).toBeGreaterThan(0);

    const peakRow = wb.rows.value.find((r) => r.metric.includes(displayName));
    expect(peakRow).toBeDefined();
    expect(peakRow!.delta.absolute).toBeGreaterThan(0);
    expect(peakRow!.variantAvg).toBeGreaterThan(peakRow!.baselineAvg);

    live.stop();
  });

  it('captures per-resource trajectories and keeps series keys out of the delta table', () => {
    const displayName = 'bw-traj-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-traj', modFactory());

    const wb = useBalanceWorkbench({ engine: live, modules: () => [modFactory()] });
    const cursorEntry = wb.snapshot.value.all.find((e) => e.label.includes('cursor'))!;
    wb.selectEntry(cursorEntry);
    wb.form.kind = 'scalar-multiply';
    wb.form.factor = 3;
    wb.form.seedCount = 2;
    wb.form.iterations = 5;
    wb.form.captureTimeSeries = true;

    wb.run();

    // Trajectories reconstructed, one band per tick, defaulting the selection.
    expect(wb.trajectoryDisplayNames.value).toContain(displayName);
    const traj = wb.selectedTrajectory.value;
    expect(traj).not.toBeNull();
    expect(traj!.baseline).toHaveLength(5);
    expect(traj!.variant).toHaveLength(5);
    // A 3× rate multiplier lifts the variant's final gold above baseline.
    expect(traj!.variant[4]!.mean).toBeGreaterThan(traj!.baseline[4]!.mean);

    // Per-tick series metrics never leak into the scalar delta table.
    expect(wb.rows.value.every((r) => !r.metric.startsWith('time-series:'))).toBe(true);

    live.stop();
  });

  it('skips trajectory capture when captureTimeSeries is off', () => {
    const displayName = 'bw-noseries-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-noseries', modFactory());

    const wb = useBalanceWorkbench({ engine: live, modules: () => [modFactory()] });
    wb.selectEntry(wb.snapshot.value.all.find((e) => e.label.includes('cursor'))!);
    wb.form.seedCount = 2;
    wb.form.iterations = 5;
    wb.form.captureTimeSeries = false;

    wb.run();

    expect(wb.trajectories.value).toHaveLength(0);
    expect(wb.selectedTrajectory.value).toBeNull();
    expect(wb.rows.value.length).toBeGreaterThan(0);

    live.stop();
  });

  it('blocks running when no entry is selected and surfaces an error', () => {
    const live = buildLiveEngine('bw-comp-empty', makeProducerModule('bw-empty'));
    const wb = useBalanceWorkbench({
      engine: live,
      modules: () => [makeProducerModule('bw-empty')],
    });

    wb.run();
    expect(wb.error.value).toMatch(/no picker entry/i);
    expect(wb.result.value).toBeNull();

    live.stop();
  });

  it('commit applies the perturbation to the live engine; discard reverts', () => {
    const displayName = 'bw-commit-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-commit', modFactory());

    const wb = useBalanceWorkbench({ engine: live, modules: () => [modFactory()] });
    const cursorEntry = wb.snapshot.value.all.find((e) => e.label.includes('cursor'))!;
    if (cursorEntry.kind !== 'modifier') throw new Error('expected modifier entry for cursor');
    wb.selectEntry(cursorEntry);
    wb.form.kind = 'scalar-multiply';
    wb.form.factor = 5;

    const chain = cursorEntry.chain;
    const before = Number(chain.apply(1));

    wb.commit();
    expect(wb.committed.value).toBe(true);
    const afterCommit = Number(chain.apply(1));
    expect(afterCommit).toBeGreaterThan(before);

    wb.discard();
    expect(wb.committed.value).toBe(false);
    const afterDiscard = Number(chain.apply(1));
    expect(afterDiscard).toBe(before);

    live.stop();
  });
});

describe('BalanceWorkbench.vue', () => {
  it('renders picker rows grouped by source', async () => {
    const displayName = 'bw-mount-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-mount', modFactory());

    const wrapper = mount(BalanceWorkbench, {
      props: {
        engine: live,
        modules: () => [modFactory()],
      },
    });
    await nextTick();

    const rows = wrapper.findAll('.picker-row');
    expect(rows.length).toBeGreaterThan(0);

    const titles = wrapper.findAll('.picker-group-title').map((n) => n.text());
    expect(titles).toContain('Chains');

    wrapper.unmount();
    live.stop();
  });

  it('renders a delta row after run() completes', async () => {
    const displayName = 'bw-mount-run-gold';
    const modFactory = (): EngineModule => makeProducerModule(displayName);
    const live = buildLiveEngine('bw-mount-run', modFactory());

    const wrapper = mount(BalanceWorkbench, {
      props: {
        engine: live,
        modules: () => [modFactory()],
      },
    });
    await nextTick();

    const rows = wrapper.findAll('.picker-row');
    const producerRow = rows.find((r) => r.text().includes('cursor'));
    expect(producerRow).toBeDefined();
    await producerRow!.trigger('click');

    const seedInput = wrapper.find('#bw-seeds');
    await seedInput.setValue(2);
    const iterationInput = wrapper.find('#bw-iterations');
    await iterationInput.setValue(5);

    const runBtn = wrapper.findAll('button').find((b) => b.text().startsWith('Run'));
    expect(runBtn).toBeDefined();
    await runBtn!.trigger('pointerdown');
    await nextTick();

    expect(wrapper.find('.delta-table').exists()).toBe(true);
    expect(wrapper.find('.delta-headline-value').text()).toMatch(/%/);
    // Trajectory chart renders (captureTimeSeries defaults on).
    expect(wrapper.find('.delta-trajectory svg.traj__svg').exists()).toBe(true);

    wrapper.unmount();
    live.stop();
  });
});
