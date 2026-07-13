import {
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import type { ComputedRef } from 'vue';
import { useAutomation, type UseAutomationReturn } from '@/composables/useAutomation';
import type { AutomationProfile } from '../data/automation';
import type {
  BuildingId,
  CraftId,
  InterlockerData,
  JobId,
  ResourceId,
  ScienceId,
} from '../data/types';
import { ResourcesKey, type ResourcesApi } from './resources';
import { BuildingsKey, type BuildingsApi } from './buildings';
import { VillageKey, type VillageApi } from './village';
import { SciencesKey, type SciencesApi } from './sciences';
import { WorkshopKey, type WorkshopApi } from './workshop';
import type { AutomationTiers } from '@open-loop/engine';

/**
 * Automation module — tier-gated, player-facing automation ported from Kitten
 * Scientists (studio/open-loop-starter#8). Replaces the retired harness bot
 * (`balance/arc-bot.ts`) with shipping game code: the balance harness and the
 * player both drive the SAME four managers off the SAME `{enabled,max,trigger}`
 * profile, so measured beats == what a player running the automation sees.
 *
 * The whole architecture is four trivial sweeps over `(profile, apis, data)`:
 *   - autoBuild    — build enabled items toward `max` once inputs are buffered
 *   - autoAssign   — least-count-first job allocation with a catnip-solvency floor
 *   - autoResearch — research the frontier science when affordable
 *   - autoCraft    — craft enabled items toward `max` once inputs are buffered
 * The strategy is the profile, not the code. Each sweep is gated by a tier
 * (`build`/`assign`/`research`/`craft`), unlocked as the player engages the
 * matching manual mechanic; gather/refine stay manual (tier 0).
 *
 * The load-bearing primitive is the trigger buffer (`inputsBuffered`): only spend
 * on an item when every capacity-bearing input sits at ≥ trigger·maxValue. That
 * buffer is what the retired bot lacked — it drained inputs to zero, which forced
 * its bespoke phase ordering. With per-item max + trigger the ordering dissolves.
 */
export interface AutomationApi {
  /** The persisted, player-editable profile (one ref; setters reassign it). */
  profile: Persistent<AutomationProfile>;
  /** The tier system — for UI gating, event wiring, prestige resets. */
  tierSystem: AutomationTiers;
  /** Whether any tier past manual is unlocked (gates the Automation tab). */
  isAutomated: ComputedRef<boolean>;
  /** Display name of the current tier. */
  currentTierName: ComputedRef<string>;
  /** Whether automation has reached at least the given tier (UI section gating). */
  hasReached(tierId: string): boolean;
  setBuildingField(
    id: BuildingId,
    field: 'enabled' | 'max' | 'trigger',
    value: boolean | number,
  ): void;
  setJobField(id: JobId, field: 'enabled' | 'max', value: boolean | number): void;
  setScienceField(id: ScienceId, field: 'enabled' | 'trigger', value: boolean | number): void;
  setCraftField(id: CraftId, field: 'enabled' | 'max' | 'trigger', value: boolean | number): void;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'interlocker/automation',
) as InjectionKey<AutomationApi>;

/** Tier ids in ascending order. `manual` (gather/refine) is always available;
 *  each higher tier unlocks when the player has engaged its manual mechanic. */
export const AUTOMATION_TIERS = ['manual', 'build', 'assign', 'research', 'craft'] as const;

let automation: AutomationApi | null = null;

export function getAutomation(): AutomationApi {
  if (!automation) throw new Error('interlocker/automation: not installed yet');
  return automation;
}

// ─── Managers (pure over profile + apis + data) ─────────────────────────────

interface AutomationApis {
  resources: ResourcesApi;
  buildings: BuildingsApi;
  village: VillageApi;
  sciences: SciencesApi;
  workshop: WorkshopApi;
}

const N = (v: unknown): number => Number(v as number);

// TODO(expansion): the {enabled,max,trigger} trigger-buffer + build-to-max sweep
// is the KS automation kernel — candidate-primitives.md § createTriggerBuffer.
// N=1; graduates when a second automation-heavy archetype hand-rolls the shape.
/** The trigger buffer: true when every capacity-bearing input sits at ≥
 *  trigger·maxValue. Uncapped inputs (Infinity max — science, kittens, refined
 *  goods before a warehouse) have no storage fraction to gate on and are skipped;
 *  so does an ungranted-cap resource (cap 0). `maxValue` has no direct accessor —
 *  reconstruct it as remaining-room + current-value. */
function inputsBuffered(inputs: ResourceId[], trigger: number, r: ResourcesApi): boolean {
  if (trigger <= 0) return true;
  for (const res of inputs) {
    const value = N(r.resources[res].value);
    const cap = N(r.bag.remainingCapacityForType(res)) + value;
    if (!isFinite(cap) || cap <= 0) continue;
    if (value / cap < trigger) return false;
  }
  return true;
}

/** The kitten-cap granted by one level of a building (0 for non-housing). Housing
 *  is the buildings whose grants push onto the `kittens-max` chain (hut, logHouse). */
function housingGrant(def: InterlockerData['buildings'][number]): number {
  return def.grants
    .filter((g) => g.chainId === 'kittens-max' && g.kind === 'add')
    .reduce((sum, g) => sum + g.value, 0);
}

/** Can the colony feed `addedKittens` more mouths? The interlocker catnip-solvency
 *  gate on housing — the archetype's defining pressure. Pre-agriculture (no
 *  farmers) fields are the only source, so require instantaneous headroom;
 *  post-agriculture the farmer floor backfills, so only require the colony not be
 *  already starving. Without this gate, housing over-builds past what catnip can
 *  feed and the surplus kittens starve (the retired bot's pop artifact). */
function canFeedMore(apis: AutomationApis, addedKittens: number, data: InterlockerData): boolean {
  const { village } = apis;
  const net = village.catnipNetRate.value;
  if (village.isJobVisible('farmer')) return net >= 0;
  const perKitten = Math.abs(data.catnipPerKittenPerSec);
  return net >= addedKittens * perKitten;
}

/** Build enabled buildings toward `max` once their inputs are buffered.
 *  Iterates `data.buildings` order for determinism — with per-item max + trigger,
 *  order is only a within-tick tie-breaker, not a correctness lever. Always
 *  purchases exactly 1 (bulk is enabled; an unqualified call buys max-affordable).
 *
 *  Housing (hut/logHouse) additionally gates on catnip solvency AND on current
 *  housing being full — pacing population growth to what the colony can feed,
 *  since a housing building's cost (wood/minerals) is a different resource than
 *  its binding constraint (catnip), which the input-trigger buffer cannot express. */
function autoBuild(profile: AutomationProfile, apis: AutomationApis, data: InterlockerData): void {
  const { buildings, resources } = apis;
  const kittenRoom = N(resources.bag.remainingCapacityForType('kittens'));
  for (const def of data.buildings) {
    const e = profile.buildings[def.id];
    if (!e.enabled) continue;
    if (buildings.buildingCount(def.id) >= e.max) continue;
    if (!buildings.isVisible(def.id)) continue;
    const grant = housingGrant(def);
    if (grant > 0 && (kittenRoom > 0 || !canFeedMore(apis, grant, data))) continue;
    if (
      !inputsBuffered(
        def.prices.map((p) => p.resource),
        e.trigger,
        resources,
      )
    )
      continue;
    const entry = buildings.category.getEntry(def.id);
    if (entry?.purchasable.canPurchase.value) entry.purchasable.purchase(1);
  }
}

/** A farmer's best-season catnip worth (spring 1.5 × 5/s = 7.5), rounded up.
 *  The drawdown band: only release a farmer when net exceeds the solvency target
 *  by more than one farmer can be worth, so a demotion can never break solvency. */
const FARMER_MAX_WORTH = 8;

/** Allocate kittens with a catnip-solvency farmer controller + least-count
 *  distribution of the rest — the archetype's interlocking pressure, and the one
 *  deliberate departure from a faithful KS `autoDistributeKittens`. KS places only
 *  FREE kittens and assumes catnip isn't tight; interlocker unlocks jobs
 *  progressively (scholar via library, farmer via agriculture, miner via mining)
 *  AND is brutally catnip-gated, so free-kitten-only play locks early kittens into
 *  whatever is visible then and can never rebalance. This target allocator instead
 *  re-derives the whole assignment each pass:
 *    A. Size farmers for solvency. Net catnip depends ONLY on farmer count (fields
 *       + farmers − per-kitten drain; non-farmer jobs don't touch catnip), so this
 *       is an independent feedback loop: promote a farmer while `net < surplus`
 *       (freeing a kitten from the largest non-farmer job when none is idle),
 *       demote one while `net > surplus + FARMER_MAX_WORTH` (the summer drawdown
 *       that returns scholars to the architecture grind). The live `catnipNetRate`
 *       recomputes synchronously off the rate chains `setJobCount` rebinds; the
 *       dead band prevents cross-tick thrash.
 *    B. Distribute the remaining budget least-count-first among enabled+visible
 *       non-farmer jobs under their `max` (water-filling: even until a job caps,
 *       overflow into the uncapped scholar), applied reduce-then-increase. */
function autoAssign(profile: AutomationProfile, apis: AutomationApis, data: InterlockerData): void {
  const { resources, village } = apis;
  const kittens = N(resources.resources.kittens.value);
  if (kittens <= 0) return;

  const jobIds = data.jobs.map((j) => j.id);
  const counts = {} as Record<JobId, number>;
  for (const j of jobIds) counts[j] = N(village.jobCounts[j].value);
  const assigned = () => jobIds.reduce((s, j) => s + counts[j], 0);

  const surplus = profile.farmerSolvencySurplusPerSec;
  const nonFarmer = jobIds.filter((j) => j !== 'farmer');
  const farmerEligible = () =>
    profile.jobs.farmer.enabled &&
    village.isJobVisible('farmer') &&
    counts.farmer < profile.jobs.farmer.max;

  // Pass A — size farmers for catnip solvency (net depends only on farmer count).
  let guard = kittens;
  while (farmerEligible() && village.catnipNetRate.value < surplus && guard-- > 0) {
    if (assigned() >= kittens) {
      // No idle kitten — free one from the largest non-farmer job (Pass B will
      // re-derive the exact non-farmer split anyway).
      const donor = nonFarmer
        .filter((j) => counts[j] > 0)
        .sort((a, b) => counts[b] - counts[a])[0] as JobId | undefined;
      if (!donor || !safeSetJob(village, donor, counts[donor] - 1)) break;
      counts[donor] -= 1;
    }
    if (!safeSetJob(village, 'farmer', counts.farmer + 1)) break;
    counts.farmer += 1;
  }
  guard = kittens;
  while (
    counts.farmer > 0 &&
    village.catnipNetRate.value > surplus + FARMER_MAX_WORTH &&
    guard-- > 0
  ) {
    if (!safeSetJob(village, 'farmer', counts.farmer - 1)) break;
    counts.farmer -= 1;
  }

  // Pass B — least-count fill of the non-farmer budget under each job's max.
  const budget = kittens - counts.farmer;
  const eligible = nonFarmer.filter((j) => profile.jobs[j].enabled && village.isJobVisible(j));
  const desired = {} as Record<JobId, number>;
  for (const j of nonFarmer) desired[j] = 0;
  for (let i = 0; i < budget; i++) {
    const pick = eligible
      .filter((j) => desired[j] < profile.jobs[j].max)
      .sort((a, b) => desired[a] - desired[b])[0] as JobId | undefined;
    if (!pick) break;
    desired[pick] += 1;
  }
  // Reduce over-target jobs first (frees headroom under the ≤ kittens guard),
  // then raise under-target jobs to match.
  for (const j of nonFarmer) if (desired[j] < counts[j]) safeSetJob(village, j, desired[j]);
  for (const j of nonFarmer) if (desired[j] > counts[j]) safeSetJob(village, j, desired[j]);
}

function safeSetJob(village: VillageApi, job: JobId, n: number): boolean {
  try {
    village.setJobCount(job, Math.max(0, Math.floor(n)));
    return true;
  } catch {
    // setJobCount throws if the sum would exceed kittens — skip; next pass reconciles.
    return false;
  }
}

/** Research the current frontier science when enabled, visible, and affordable.
 *  The cascade is linear, so a disabled or not-yet-visible science blocks
 *  everything after it. Science trigger is inert in arc-1 (science is uncapped). */
function autoResearch(
  profile: AutomationProfile,
  apis: AutomationApis,
  data: InterlockerData,
): void {
  const { sciences, resources } = apis;
  for (const def of data.sciences) {
    if (sciences.scienceCompleted(def.id)) continue;
    const e = profile.sciences[def.id];
    if (!e.enabled) break;
    if (!sciences.isVisible(def.id)) break;
    if (!inputsBuffered(['science'], e.trigger, resources)) break;
    const entry = sciences.category.getEntry(def.id);
    if (entry?.purchasable.canPurchase.value) entry.purchasable.purchase(1);
    break; // one frontier science at a time
  }
}

/** Wood-buffer fraction below which the smelter is paused. Above it, smelters run
 *  matched to wood income so their drain never out-paces woodcutters (which would
 *  pin wood at zero and starve huts/logHouse/workshop — the interlock the retired
 *  bot's over-early smelters fell into). Set at the logHouse build trigger so
 *  housing (run before throttling in the tick) claims the wood first. */
const SMELTER_WOOD_BUFFER = 0.5;

/** Throttle continuous consumers (the smelter) via canon's active-count `on`
 *  mechanic — the wood-drain equivalent of a trigger buffer. Only manages
 *  buildings the automation owns (`enabled`); a disabled smelter is left for the
 *  player to throttle by hand. Runs only when wood is banked above the buffer, and
 *  then only as many smelters as the wood income sustains. */
function autoThrottle(profile: AutomationProfile, apis: AutomationApis): void {
  const { buildings, resources } = apis;
  if (!profile.buildings.smelter.enabled) return;
  const built = buildings.buildingCount('smelter');
  if (built <= 0) return;
  const unitWood = buildings.smelterUnitDrain.wood;
  const wood = N(resources.resources.wood.value);
  const woodCap = N(resources.bag.remainingCapacityForType('wood')) + wood;
  let active = 0;
  if (woodCap > 0 && wood >= woodCap * SMELTER_WOOD_BUFFER && unitWood > 0) {
    active = Math.min(built, Math.floor(resources.productionRate('wood') / unitWood));
  }
  buildings.setActiveCount('smelter', active);
}

/** Craft enabled items toward `max` once their inputs are buffered. Iterates
 *  `data.crafts` order (megalith last), so intermediates stock before the closure
 *  craft. `triggerCraft` is atomic and no-ops when inputs are short. */
function autoCraft(profile: AutomationProfile, apis: AutomationApis, data: InterlockerData): void {
  const { workshop, resources } = apis;
  for (const def of data.crafts) {
    const e = profile.crafts[def.id];
    if (!e.enabled) continue;
    if (!workshop.isVisible(def.id)) continue;
    if (N(resources.resources[def.outputResource].value) >= e.max) continue;
    if (
      !inputsBuffered(
        def.inputs.map((i) => i.resource),
        e.trigger,
        resources,
      )
    )
      continue;
    workshop.triggerCraft(def.id);
  }
}

// ─── Module ─────────────────────────────────────────────────────────────────

export function createAutomationModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/automation',
    dependencies: [
      'interlocker/resources',
      'interlocker/sciences',
      'interlocker/village',
      'interlocker/workshop',
      'interlocker/buildings',
    ],
    install(ctx) {
      const apis: AutomationApis = {
        resources: ctx.inject(ResourcesKey),
        buildings: ctx.inject(BuildingsKey),
        village: ctx.inject(VillageKey),
        sciences: ctx.inject(SciencesKey),
        workshop: ctx.inject(WorkshopKey),
      };
      const { buildings, sciences } = apis;

      const state = withPersistentContext('interlocker/automation', () => ({
        profile: persistent<AutomationProfile>(structuredClone(data.automationProfile), {
          name: 'profile',
        }),
      }));

      // Milestone-gated tiers — each unlocks when the player has engaged its
      // manual mechanic. The harness force-unlocks all of them (these thresholds
      // are player-facing pacing, not load-bearing for measurement).
      const auto: UseAutomationReturn = useAutomation({
        id: 'interlocker/automation',
        tiers: [
          { id: 'manual', name: 'Manual', order: 0 },
          {
            id: 'build',
            name: 'Auto-Build',
            order: 1,
            requirement: () => buildings.buildingCount('hut') >= 1,
          },
          {
            id: 'assign',
            name: 'Auto-Assign',
            order: 2,
            requirement: () => sciences.scienceCompleted('agriculture'),
          },
          {
            id: 'research',
            name: 'Auto-Research',
            order: 3,
            requirement: () => buildings.buildingCount('library') >= 1,
          },
          {
            id: 'craft',
            name: 'Auto-Craft',
            order: 4,
            requirement: () => buildings.buildingCount('workshop') >= 1,
          },
        ],
        throttleInterval: 1,
      });

      ctx.onTick((dt) => {
        if (!auto.shouldRun(dt)) return;
        const profile = state.profile.value;
        if (auto.hasReached('build')) {
          autoBuild(profile, apis, data);
          autoThrottle(profile, apis); // after build so housing claims wood first
        }
        if (auto.hasReached('assign')) autoAssign(profile, apis, data);
        if (auto.hasReached('research')) autoResearch(profile, apis, data);
        if (auto.hasReached('craft')) autoCraft(profile, apis, data);
      });

      // Immutable setters — reassign `profile.value` so both the persistent save
      // and Vue reactivity (UI) pick up the edit.
      function setBuildingField(
        id: BuildingId,
        field: 'enabled' | 'max' | 'trigger',
        value: boolean | number,
      ): void {
        const p = state.profile.value;
        state.profile.value = {
          ...p,
          buildings: { ...p.buildings, [id]: { ...p.buildings[id], [field]: value } },
        };
      }
      function setJobField(id: JobId, field: 'enabled' | 'max', value: boolean | number): void {
        const p = state.profile.value;
        state.profile.value = {
          ...p,
          jobs: { ...p.jobs, [id]: { ...p.jobs[id], [field]: value } },
        };
      }
      function setScienceField(
        id: ScienceId,
        field: 'enabled' | 'trigger',
        value: boolean | number,
      ): void {
        const p = state.profile.value;
        state.profile.value = {
          ...p,
          sciences: { ...p.sciences, [id]: { ...p.sciences[id], [field]: value } },
        };
      }
      function setCraftField(
        id: CraftId,
        field: 'enabled' | 'max' | 'trigger',
        value: boolean | number,
      ): void {
        const p = state.profile.value;
        state.profile.value = {
          ...p,
          crafts: { ...p.crafts, [id]: { ...p.crafts[id], [field]: value } },
        };
      }

      const api: AutomationApi = {
        profile: state.profile,
        tierSystem: auto.tierSystem,
        isAutomated: auto.isAutomated,
        currentTierName: auto.currentTierName,
        hasReached: auto.hasReached,
        setBuildingField,
        setJobField,
        setScienceField,
        setCraftField,
      };
      automation = api;
      ctx.provide(AutomationKey, api);
    },
  };
}
