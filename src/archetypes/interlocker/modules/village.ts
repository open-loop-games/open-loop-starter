import type { EngineModule, InjectionKey, Persistent } from '@open-loop/engine';
import type { InterlockerData, JobId, KittenDiedEvent, JobCountChangedEvent } from '../data/types';

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

let village: VillageApi | null = null;

export function getVillage(): VillageApi {
  if (!village) throw new Error('interlocker/village: not installed yet');
  return village;
}

/**
 * Village module — kittens, jobs, catnip consumption, starvation. Phase 1 STUB
 * — body lands in Phase 2 worktree C (OL-1059).
 *
 * Phase 2 implementation will (per OL-1056 contract):
 *   1. Read `ResourcesKey` and consume the `kittens` Resource handle + the
 *      `catnip` Resource + per-resource rate chains.
 *   2. Per-job `persistent<number>` ref via
 *      `withPersistentContext('interlocker/village', () => ({ ... }))`.
 *   3. `setJobCount(jobId, newCount)` validates at write-site against
 *      `kittens.value`; throws typed `JobAssignmentError`. Rebinds the job's
 *      modifier on `rateChains[def.resource]`.
 *   4. `onTick(dt)`:
 *      a. Population growth: accumulate sim-time progress; when threshold
 *         crossed, `addResource(kittens, 1)` (soft-capped by hut grants on
 *         `maxChains.kittens`).
 *      b. Catnip consumption: continuous subtract per the tunable rate × kittens.
 *      c. Starvation predicate: if effectiveCatnipRate ≤ starvationThreshold,
 *         emit `KittenDiedEvent` + decrement kittens + demote from a job
 *         (priority: scholar > miner > woodcutter > farmer).
 *   5. `TODO(expansion)` at the catnip consumption onTick site → candidate
 *      `createContinuousConversion` (shared receipt with smelter).
 *
 * Discrete population-allocator semantics — `setJobCount` is the only mutation
 * point; per-tick walks DO NOT re-validate (the umbrella's constraint-at-write-site
 * lock).
 */
export function createVillageModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/village',
    dependencies: ['interlocker/tuning', 'interlocker/resources', 'interlocker/sciences'],
    install(ctx) {
      village = makeStubVillage();
      ctx.provide(VillageKey, village);
    },
  };
}

function makeStubVillage(): VillageApi {
  const notImplemented = (method: string): never => {
    throw new Error(`interlocker/village: ${method} not implemented in Phase 1`);
  };
  return {
    get jobCounts(): Record<JobId, Persistent<number>> {
      return notImplemented('jobCounts');
    },
    isJobVisible: () => notImplemented('isJobVisible'),
    setJobCount: () => notImplemented('setJobCount'),
    onKittenDied: () => notImplemented('onKittenDied'),
    onJobCountChanged: () => notImplemented('onJobCountChanged'),
  };
}
