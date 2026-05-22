import {
  addResource,
  createAdditiveModifier,
  createEmitHandle,
  createModifierChain,
  persistent,
  subtractResource,
  tunable,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
} from '@open-loop/engine';
import type {
  InterlockerData,
  JobId,
  JobSpec,
  KittenDiedEvent,
  JobCountChangedEvent,
} from '../data/types';
import { InterlockerTuningRegistryKey } from './tuning';
import { ResourcesKey } from './resources';
import { SciencesKey } from './sciences';

/**
 * Village module's public API. Phase 2 worktree C fills the body — Phase 1
 * ships the type contract only.
 *
 * Owns the population-allocator pressure that the Interlocker identity rests on:
 *   - `kittens` is a bag-linked Resource (declared by the resources module's
 *     `'kittens'` entry); village reads the handle and ticks growth via
 *     `addResource(kittens, kittenGrowthRatePerSec × dt × happinessFactor)`
 *     into a sub-kitten progress counter, incrementing the integer count at
 *     each threshold cross.
 *   - Per-job counts are `persistent<number>` refs. `setJobCount(id, n)`
 *     enforces `sum(allCounts) ≤ kittens.value` at the write-site; throws
 *     `JobAssignmentError` on violation. Unassigned kittens accumulate via
 *     `sum(allCounts) < kittens.value`.
 *   - Per-job rate modifier: on `setJobCount`, rebind the job's modifier on
 *     `rateChains[def.resource]` with magnitude `count × tunable('village/jobs/<id>/baseRate')`.
 *   - Catnip consumption `onTick`: `subtractResource(catnip, perKitten × kittens.value × dt,
 *     { allowNegative: true })`. First N=1 receipt for
 *     `createContinuousConversion` shared with smelter.
 *   - Starvation loop: every tick, if effectiveCatnipRate ≤ starvationThreshold,
 *     emit `KittenDiedEvent` and decrement kittens by 1 (demoting a kitten
 *     from a job in priority order: scholar > miner > woodcutter > farmer).
 */
export interface VillageApi {
  /** Per-job count refs, keyed by job id. */
  jobCounts: Record<JobId, Persistent<number>>;
  /** Effective catnip-consumption-rate chain. Pasture's `mul -0.005` grant
   *  binds here via the buildings module's resolver extension (Phase 3
   *  wiring); the per-tick catnip drain reads `chain.apply(baseRate)`. */
  consumptionRateChain: ModifierChain;
  /** Whether the job is currently visible to the player. Driven by
   *  `JobSpec.unlockedByScience` predicate against `sciences.scienceCompleted`. */
  isJobVisible(id: JobId): boolean;
  /** Assign `newCount` kittens to job `id`. Throws if `sum(allCounts) > kittens`. */
  setJobCount(id: JobId, newCount: number): void;
  /** Subscribe to kitten-death events. Round-equivalent module (Phase 3+) can
   *  surface these to UI for toasts/animations. */
  onKittenDied(handler: (event: KittenDiedEvent) => void): () => void;
  /** Subscribe to job-count-changed events. UI uses for live job-pane updates. */
  onJobCountChanged(handler: (event: JobCountChangedEvent) => void): () => void;
}

export const VillageKey: InjectionKey<VillageApi> = Symbol(
  'interlocker/village',
) as InjectionKey<VillageApi>;

/**
 * Typed error thrown by `setJobCount` when the requested assignment would
 * exceed the available kitten count. Write-site validation per the umbrella's
 * constraint-at-write-site lock — per-tick walks never re-validate.
 */
export class JobAssignmentError extends Error {
  readonly jobId: JobId;
  readonly requested: number;
  readonly available: number;
  constructor(jobId: JobId, requested: number, available: number) {
    super(
      `interlocker/village: cannot assign ${requested} kittens to job "${jobId}" — ` +
        `only ${available} unassigned kittens available`,
    );
    this.name = 'JobAssignmentError';
    this.jobId = jobId;
    this.requested = requested;
    this.available = available;
  }
}

let village: VillageApi | null = null;

export function getVillage(): VillageApi {
  if (!village) throw new Error('interlocker/village: not installed yet');
  return village;
}

interface VillageEvents {
  'kitten-died': (event: KittenDiedEvent) => void;
  'job-count-changed': (event: JobCountChangedEvent) => void;
}

/** Priority order for starvation demotion: scholar > miner > woodcutter > farmer.
 *  Farmer last because they produce the survival resource — demoting them first
 *  would accelerate the death spiral. Scholar first because their output
 *  (science) doesn't gate immediate survival. */
const DEMOTION_ORDER: JobId[] = ['scholar', 'miner', 'woodcutter', 'farmer'];

/**
 * Village module — kittens, jobs, catnip consumption, starvation.
 *
 * Discrete population-allocator semantics — `setJobCount` is the only mutation
 * point that touches job counts; per-tick walks DO NOT re-validate. Job
 * modifiers are bound by stable id (`village/jobs/<id>`) and rebound on every
 * `setJobCount` call so the chain reflects the new magnitude immediately.
 *
 * The tick handler runs three independent sub-steps in fixed order:
 *   1. Population growth — accumulate `kittenGrowthRatePerSec × dt` into a
 *      sub-kitten progress counter; cross the integer threshold to add one
 *      kitten, gated by the bag's per-type capacity (hut soft-cap).
 *   2. Catnip consumption — continuous `subtractResource(catnip, ...)` per
 *      `perKittenPerSecond × kittens × dt`. `allowNegative: true` so the
 *      starvation predicate can fire on a negative bag.
 *   3. Starvation predicate — when effective net catnip rate is at or below
 *      `starvationThreshold` AND the catnip bag has dropped to zero or below,
 *      kill one kitten + demote one job-assigned kitten per `DEMOTION_ORDER`.
 */
export function createVillageModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/village',
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const resources = ctx.inject(ResourcesKey);

      // Resolved lazily — sciences module's stub throws on access in Phase 1.
      // `isJobVisible` only resolves when called from UI, well after Phase 1.
      const sciences = () => ctx.inject(SciencesKey);

      const jobs = _data.jobs;
      const jobById = new Map<JobId, JobSpec>(jobs.map((j) => [j.id, j]));

      // Per-job baseRate tunables. Reader closes over the JobSpec so balance
      // probes can perturb just one job's rate via `pushScope`.
      const baseRateById: Record<JobId, ReturnType<typeof tunable<number>>> = {} as Record<
        JobId,
        ReturnType<typeof tunable<number>>
      >;
      for (const def of jobs) {
        baseRateById[def.id] = tunable<number>(
          registry,
          `village/jobs/${def.id}/baseRate`,
          () => def.baseRatePerSecond,
        );
      }
      const perKittenCatnipPerSec = tunable<number>(
        registry,
        'village/catnip/perKittenPerSecond',
        () => _data.catnipPerKittenPerSec,
      );
      const starvationThreshold = tunable<number>(
        registry,
        'village/catnip/starvationThreshold',
        () => _data.starvationCatnipRateThreshold,
      );
      const kittenGrowthRate = tunable<number>(
        registry,
        'village/kittenGrowthRatePerSec',
        () => _data.kittenGrowthRatePerSec,
      );

      // Persistent state lives inside an explicit nested context per the
      // umbrella's persistence-key contract. The engine's outer install-wrap
      // (`withPersistentContext(mod.id, …)`) makes the nested re-entry a no-op
      // for namespacing but documents the intent at the call-site.
      const state = withPersistentContext('interlocker/village', () => ({
        woodcutterCount: persistent<number>(0, { name: 'woodcutter-count' }),
        farmerCount: persistent<number>(0, { name: 'farmer-count' }),
        scholarCount: persistent<number>(0, { name: 'scholar-count' }),
        minerCount: persistent<number>(0, { name: 'miner-count' }),
        // Sub-kitten progress counter. Accumulates fractional growth; integer
        // threshold crosses spawn a kitten via `addResource(kittens, 1)`.
        kittenProgress: persistent<number>(0, { name: 'kitten-progress' }),
      }));

      const jobCounts: Record<JobId, Persistent<number>> = {
        woodcutter: state.woodcutterCount,
        farmer: state.farmerCount,
        scholar: state.scholarCount,
        miner: state.minerCount,
      };

      const handle = createEmitHandle<VillageEvents>();

      // Effective catnip-consumption-rate chain. Pasture's `mul -0.005` grant
      // binds here (Phase 3 resolver extension in buildings.ts). The catnip
      // drain onTick + the starvation predicate both route the base
      // `perKittenPerSecond` magnitude through `consumptionRateChain.apply(...)`
      // so pasture compounds across multiple pastures via the chain's standard
      // multiplicative semantics.
      const consumptionRateChain = createModifierChain('catnip-consumption-rate');

      // Per-job rate-chain unbind handles. Stable ids (`village/jobs/<id>`)
      // make the rebind sequence (unbind-then-bind) idempotent across save/load.
      const jobUnbind = new Map<JobId, () => void>();

      function bindJobModifier(jobId: JobId, count: number): void {
        const def = jobById.get(jobId);
        if (!def) throw new Error(`interlocker/village: unknown job "${jobId}"`);
        const prevUnbind = jobUnbind.get(jobId);
        if (prevUnbind) prevUnbind();
        if (count <= 0) {
          jobUnbind.delete(jobId);
          return;
        }
        const chain = resources.rateChains[def.resource];
        const unbind = chain.bind({
          id: `village/jobs/${jobId}`,
          modifier: createAdditiveModifier({
            addend: () => count * Number(baseRateById[jobId].value),
            description: `Job: ${def.name}`,
          }),
        });
        jobUnbind.set(jobId, unbind);
      }

      function sumCountsExcept(exceptJobId: JobId): number {
        let sum = 0;
        for (const job of jobs) {
          if (job.id === exceptJobId) continue;
          sum += jobCounts[job.id].value;
        }
        return sum;
      }

      function setJobCount(jobId: JobId, newCount: number): void {
        if (!Number.isFinite(newCount) || newCount < 0 || !Number.isInteger(newCount)) {
          throw new JobAssignmentError(jobId, newCount, 0);
        }
        const kittens = resources.resources.kittens;
        const kittensTotal = Number(kittens.value);
        const projectedSum = sumCountsExcept(jobId) + newCount;
        if (projectedSum > kittensTotal) {
          throw new JobAssignmentError(jobId, newCount, kittensTotal - sumCountsExcept(jobId));
        }
        const previousCount = jobCounts[jobId].value;
        if (previousCount === newCount) return;
        jobCounts[jobId].value = newCount;
        bindJobModifier(jobId, newCount);
        handle.emit('job-count-changed', { jobId, previousCount, newCount });
      }

      function demoteOneKitten(): JobId | null {
        for (const jobId of DEMOTION_ORDER) {
          const ref = jobCounts[jobId];
          if (ref.value > 0) {
            const previousCount = ref.value;
            const newCount = previousCount - 1;
            ref.value = newCount;
            bindJobModifier(jobId, newCount);
            handle.emit('job-count-changed', { jobId, previousCount, newCount });
            return jobId;
          }
        }
        return null;
      }

      // Engine modules whose install wraps in a persistent context — we
      // re-bind the empty jobs on install so the rate chains reflect the
      // persisted counts after a save/load. No-op for fresh saves (all zeros).
      for (const def of jobs) {
        if (jobCounts[def.id].value > 0) {
          bindJobModifier(def.id, jobCounts[def.id].value);
        }
      }

      // Resources that receive per-tick production from their rate chain.
      // Catnip is excluded — the rate chain is read in step 3 for the
      // starvation predicate, but per-tick add happens here too (positive
      // contributors only; consumption is its own step 2 below). Iron is
      // excluded because the smelter `onTick` in buildings.ts pushes iron
      // directly; double-counting would multiply smelter output. Kittens
      // is excluded — population grows through `kittenGrowthRate` in step 1.
      const productionResourceIds = ['catnip', 'wood', 'minerals', 'science'] as const;

      ctx.onTick((dt) => {
        const kittens = resources.resources.kittens;
        const catnip = resources.resources.catnip;
        const kittensTotal = Number(kittens.value);

        // 0) Per-resource production. For each resource fed by jobs or
        //    additive building grants (catnip from fields/farmers, wood from
        //    woodcutters with lumberMill mul, minerals from miners with mine/
        //    quarry mul, science from scholars with library mul), read the
        //    composed rate from the rate chain (`apply(0)` returns the
        //    chain's net effect on a zero base — additive + multiplicative
        //    composition per the engine's chain semantics) and add the
        //    integrated amount to the bag. Iron is produced by the smelter
        //    `onTick` in buildings.ts; catnip consumption + starvation run
        //    in steps 2 + 3 below.
        for (const id of productionResourceIds) {
          const rate = Number(resources.rateChains[id].apply(0));
          if (rate > 0) {
            addResource(resources.resources[id], rate * dt);
          }
        }

        // 1) Population growth. Happiness arc-1 stand-in is 1.0 always
        //    (Kittens canon happiness depends on the culture chain, out of
        //    scope for arc-1). Hut soft-cap rides the bag's per-type capacity
        //    — when the bag is full for `kittens`, growth pauses but progress
        //    accumulation continues so a hut purchase mid-tick unlocks the
        //    queued kitten on the next pass.
        const happinessFactor = 1.0;
        state.kittenProgress.value += kittenGrowthRate.value * happinessFactor * dt;
        while (state.kittenProgress.value >= 1.0) {
          const remainingCapacity = Number(resources.bag.remainingCapacityForType('kittens'));
          if (remainingCapacity <= 0) break;
          addResource(kittens, 1);
          state.kittenProgress.value -= 1.0;
        }

        // 2) Catnip consumption. `perKittenPerSecond` is negative (-4.25/sec);
        //    take absolute value for the subtract magnitude. `allowNegative`
        //    lets the bag go negative so the starvation predicate can fire.
        //    The per-kitten magnitude routes through `consumptionRateChain`
        //    so pasture's `mul -0.005` reduces effective drain (canonical
        //    Kittens `catnipDemandRatio`); empty chain is the identity.
        // TODO(expansion): continuous-rate consumption — shared N=1 receipt
        // with smelter for `createContinuousConversion`. See
        // `open-loop-engine/docs/candidate-primitives.md`.
        const baseDrainPerKitten = Math.abs(Number(perKittenCatnipPerSec.value));
        const effectivePerKittenDrain = Number(consumptionRateChain.apply(baseDrainPerKitten));
        const consumeMagnitude = effectivePerKittenDrain * kittensTotal * dt;
        if (consumeMagnitude > 0) {
          subtractResource(catnip, consumeMagnitude, { allowNegative: true });
        }

        // 3) Starvation predicate. Effective net catnip rate = sum of all
        //    positive rate-chain contributions (farmer + buildings) minus the
        //    consumption magnitude (already pasture-adjusted). Death fires only
        //    when BOTH the rate is at or below the threshold AND the bag has
        //    drained to ≤ 0 — a short grace window during which the player
        //    can react.
        const positiveRate = Number(resources.rateChains.catnip.apply(0));
        const consumptionRate = effectivePerKittenDrain * kittensTotal;
        const effectiveCatnipRate = positiveRate - consumptionRate;
        if (
          kittensTotal > 0 &&
          effectiveCatnipRate <= Number(starvationThreshold.value) &&
          Number(catnip.value) <= 0
        ) {
          const demotedFromJob = demoteOneKitten();
          subtractResource(kittens, 1, { allowNegative: false });
          handle.emit('kitten-died', {
            // simTime is engine-side; consumers can read engine.elapsedSimTime
            // for the precise wall-clock of the event. 0 keeps the contract
            // honest until a Phase 3 wiring threads the engine's time accessor.
            simTime: 0,
            demotedFromJob,
          });
        }
      });

      village = {
        jobCounts,
        consumptionRateChain,
        isJobVisible(id: JobId): boolean {
          const def = jobById.get(id);
          if (!def) return false;
          if (def.unlockedByScience == null) return true;
          return sciences().scienceCompleted(def.unlockedByScience);
        },
        setJobCount,
        onKittenDied: (h) => handle.on('kitten-died', h),
        onJobCountChanged: (h) => handle.on('job-count-changed', h),
      };

      ctx.provide(VillageKey, village);
    },
  };
}
