import { computed, type ComputedRef } from 'vue';
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
import { BuildingsKey } from './buildings';
import { CalendarKey } from './calendar';

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
 *   - Canon population dynamics (village.js:332-373): while the catnip balance
 *     is negative the colony starves — growth is suspended and at most one
 *     kitten dies per `DEATH_COOLDOWN_SEC`, emitting `KittenDiedEvent` and
 *     demoting a job-assigned kitten (scholar > miner > woodcutter > farmer);
 *     otherwise population grows at the flat per-tick rate.
 */
export interface VillageApi {
  /** Per-job count refs, keyed by job id. */
  jobCounts: Record<JobId, Persistent<number>>;
  /** Effective catnip-consumption-rate chain. Pasture's `mul -0.005` grant
   *  binds here via the buildings module's resolver extension (Phase 3
   *  wiring); the per-tick catnip drain reads `chain.apply(baseRate)`. */
  consumptionRateChain: ModifierChain;
  /** Total effective catnip drain (positive magnitude, catnip/sec) across all
   *  kittens — `consumptionRateChain.apply(baseDrainPerKitten) × kittensTotal`,
   *  the same calc the onTick consumption step runs. The single source of
   *  truth for "how much catnip is the village burning right now," so UI
   *  reads it instead of re-deriving the chain-aware drain from the raw
   *  per-kitten constant (which would silently drop building discounts like
   *  pasture). */
  catnipConsumptionRate: ComputedRef<number>;
  /** Net catnip rate/sec — seasoned production minus `catnipConsumptionRate`,
   *  the same two quantities village's onTick step 0/1 combine. Single source
   *  of truth for "is the colony's catnip balance currently rising or
   *  falling" so the UI reads one number instead of re-deriving the seasonal
   *  multiply + consumption subtract itself. */
  catnipNetRate: ComputedRef<number>;
  /** Whether the job is currently visible to the player. A job unlocks when its
   *  `unlockedByScience` gate (if any) is researched AND its `unlockedByBuilding`
   *  gate (if any) is built — scholar threads through the library, breaking the
   *  science↔scholar bootstrap cycle. */
  isJobVisible(id: JobId): boolean;
  /** Live per-kitten rate for job `id` — the tunable-resolved value
   *  `bindJobModifier` actually multiplies into the rate chain, not the
   *  static `JobSpec.baseRatePerSecond`. UI reads this (× count) for the
   *  displayed per-job rate so it doesn't drift from a balance-probe
   *  perturbation of `village/jobs/<id>/baseRate`. */
  jobRatePerSecond(id: JobId): number;
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

/** Seconds between starvation deaths — canon `deathTimeout = ticksPerSecond × 5`
 *  (village.js:362). At most one kitten starves per this window. */
const DEATH_COOLDOWN_SEC = 5;

/**
 * Village module — kittens, jobs, catnip consumption, starvation.
 *
 * Discrete population-allocator semantics — `setJobCount` is the only mutation
 * point that touches job counts; per-tick walks DO NOT re-validate. Job
 * modifiers are bound by stable id (`village/jobs/<id>`) and rebound on every
 * `setJobCount` call so the chain reflects the new magnitude immediately.
 *
 * The tick handler runs sub-steps in fixed order:
 *   0. Production — integrate each rate chain (`catnip/wood/minerals/science`)
 *      into its resource. Iron is smelter-owned (buildings.ts onTick).
 *   1. Catnip consumption — continuous `subtractResource(catnip, ...)` per
 *      `perKittenPerSecond × kittens × dt`. `allowNegative: true` so the catnip
 *      balance can dip negative for the canon starvation check.
 *   2. Canon population dynamics (village.js:332-373) — if the catnip balance
 *      is negative, suspend growth and kill ≤1 kitten per `DEATH_COOLDOWN_SEC`
 *      (demoting per `DEMOTION_ORDER`), then floor catnip to zero; otherwise
 *      accumulate flat growth into the sub-kitten progress counter, gated by
 *      the bag's per-type capacity (hut soft-cap).
 */
export function createVillageModule(_data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/village',
    dependencies: [
      'interlocker/tuning',
      'interlocker/resources',
      'interlocker/sciences',
      'interlocker/calendar',
    ],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const resources = ctx.inject(ResourcesKey);
      const calendar = ctx.inject(CalendarKey);

      // Resolved lazily — sciences module's stub throws on access in Phase 1.
      // `isJobVisible` only resolves when called from UI, well after Phase 1.
      const sciences = () => ctx.inject(SciencesKey);
      // Buildings installs after village (it depends on village), so the
      // building gate resolves lazily too — only read at `isJobVisible` call
      // time, well after every module is installed.
      const buildings = () => ctx.inject(BuildingsKey);

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
        // Seconds remaining on the canon death cooldown (village.js:362 —
        // `deathTimeout = ticksPerSecond × 5`). Starvation kills at most one
        // kitten per `DEATH_COOLDOWN_SEC`; counts down while starving.
        deathTimeout: persistent<number>(0, { name: 'death-timeout' }),
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

      // Single source of truth for "how much catnip is the village burning
      // right now" — onTick's consumption step and the UI's net-rate readout
      // both read this instead of separately re-deriving the chain-aware
      // drain from `perKittenCatnipPerSec`.
      const catnipConsumptionRate: ComputedRef<number> = computed(() => {
        const kittensTotal = Number(resources.resources.kittens.value);
        const baseDrainPerKitten = Math.abs(Number(perKittenCatnipPerSec.value));
        const effectivePerKittenDrain = Number(consumptionRateChain.apply(baseDrainPerKitten));
        return effectivePerKittenDrain * kittensTotal;
      });

      // Canon scales catnip production by the active season (getWeatherMod,
      // calendar.js:1095): spring ×1.5 … winter ×0.25 — the same read-site
      // multiply step 0 of onTick applies before integrating. Net rate is
      // this seasoned production minus `catnipConsumptionRate`.
      const catnipNetRate: ComputedRef<number> = computed(() => {
        const production = resources.productionRate('catnip') * calendar.catnipMultiplier.value;
        return production - catnipConsumptionRate.value;
      });

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

      // Rebind every job's rate modifier from the current `jobCounts` values.
      // Needed both right after install (job refs already reflect persisted
      // state on HMR re-install) and after `engine.load()` — persisted refs
      // are created with their default (0) at install time and only mutated
      // in place by the save manager once `engine.load()` runs afterward
      // (see AppRoot's `engine.start(); engine.load();` resume sequence).
      // `setJobCount` is the only other call site for `bindJobModifier`, and
      // it never fires during load (load writes refs directly, bypassing the
      // setter), so without this the rate chain stays bound to whatever was
      // true at install — typically all-zero — until the player manually
      // toggles a job, which is the "production doesn't resume" symptom this
      // closes.
      function rebindAllJobs(): void {
        for (const def of jobs) {
          if (jobCounts[def.id].value > 0) {
            bindJobModifier(def.id, jobCounts[def.id].value);
          }
        }
      }
      rebindAllJobs();
      ctx.onLoad(() => {
        rebindAllJobs();
      });

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
          // Additive job/building rates scaled by the building multipliers
          // (lumberMill/mine/quarry/library) via the resources module's
          // order-independent compose.
          let rate = resources.productionRate(id);
          // Canon scales catnip production by the active season (getWeatherMod,
          // calendar.js:1095): spring ×1.5 … winter ×0.25. Applied here at the
          // read site (a runtime multiplier on the seasonal economy), not on a
          // rate chain.
          if (id === 'catnip') rate *= calendar.catnipMultiplier.value;
          if (rate > 0) {
            addResource(resources.resources[id], rate * dt);
          }
        }

        // 1) Catnip consumption (drain). Reads `catnipConsumptionRate` — the
        //    same chain-aware total the UI's net-rate readout reads — so the
        //    `mul -0.005` pasture grant (canonical `catnipDemandRatio`)
        //    reduces it everywhere it's read. `allowNegative` lets the bag
        //    dip below zero so the canon starvation projection
        //    (village.js:343 `resDiff < 0`) can see the deficit; step 2
        //    floors catnip back to zero, matching canon's non-negative
        //    resPool.
        // TODO(expansion): signed-net-rate drain, NOT the smelter's converter
        // shape — the deficit must stay observable for starvation below. N=3
        // dive filed; see `createContinuousConversion` § Family B in the drop-spot.
        const consumeMagnitude = catnipConsumptionRate.value * dt;
        if (consumeMagnitude > 0) {
          subtractResource(catnip, consumeMagnitude, { allowNegative: true });
        }

        // 2) Canon population dynamics (village.js:332-373). After this tick's
        //    net catnip flow, `resDiff` is the catnip balance. When it is
        //    negative the colony is starving: canon kills at most one kitten
        //    per `DEATH_COOLDOWN_SEC` and SUSPENDS growth (`sim.update(0)`).
        //    Otherwise it grows at the flat per-tick rate. Growth is never
        //    gated by a fixed catnip threshold — only by the sign of the
        //    balance, which is what couples population to the catnip economy.
        const resDiff = Number(catnip.value);
        if (kittensTotal > 0 && resDiff < 0) {
          state.deathTimeout.value -= dt;
          if (state.deathTimeout.value <= 0) {
            const demotedFromJob = demoteOneKitten();
            subtractResource(kittens, 1, { allowNegative: false });
            handle.emit('kitten-died', {
              // simTime threads through a Phase 3 engine-time accessor; 0 keeps
              // the contract honest until then. Consumers read
              // engine.elapsedSimTime for the precise wall-clock.
              simTime: 0,
              demotedFromJob,
            });
            state.deathTimeout.value = DEATH_COOLDOWN_SEC;
          }
          // Canon floors catnip at zero — the deficit is paid by the starved
          // kitten, not carried forward as negative catnip.
          addResource(catnip, -resDiff);
        } else {
          // Fed. Canon freezes the death cooldown here (village.js only
          // decrements it inside the starvation branch); arc-1 clears it so a
          // recovered colony gets the full grace window on its next crisis
          // rather than a stale partial countdown. Macro pacing is unchanged —
          // sustained starvation still kills one kitten per DEATH_COOLDOWN_SEC.
          state.deathTimeout.value = 0;
          // Flat per-tick growth (happiness is the 1.0 arc-1 stand-in; culture
          // chain is out of scope). Hut soft-cap rides the bag's per-type
          // capacity — when full, growth pauses but progress still accumulates
          // so a mid-tick hut purchase releases the queued kitten next pass.
          const happinessFactor = 1.0;
          state.kittenProgress.value += kittenGrowthRate.value * happinessFactor * dt;
          while (state.kittenProgress.value >= 1.0) {
            const remainingCapacity = Number(resources.bag.remainingCapacityForType('kittens'));
            if (remainingCapacity <= 0) break;
            addResource(kittens, 1);
            state.kittenProgress.value -= 1.0;
          }
        }
      });

      village = {
        jobCounts,
        consumptionRateChain,
        catnipConsumptionRate,
        catnipNetRate,
        isJobVisible(id: JobId): boolean {
          const def = jobById.get(id);
          if (!def) return false;
          if (
            def.unlockedByScience != null &&
            !sciences().scienceCompleted(def.unlockedByScience)
          ) {
            return false;
          }
          if (
            def.unlockedByBuilding != null &&
            buildings().buildingCount(def.unlockedByBuilding) < 1
          ) {
            return false;
          }
          return true;
        },
        jobRatePerSecond(id: JobId): number {
          const ref = baseRateById[id];
          if (!ref) throw new Error(`interlocker/village: unknown job "${id}"`);
          return Number(ref.value);
        },
        setJobCount,
        onKittenDied: (h) => handle.on('kitten-died', h),
        onJobCountChanged: (h) => handle.on('job-count-changed', h),
      };

      ctx.provide(VillageKey, village);
    },
  };
}
