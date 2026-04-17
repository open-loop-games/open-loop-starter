/**
 * Tiny Civilization — Majesty-inspired indirect-control workers (5c).
 *
 * A fixed roster of three workers competes for entries in a shared bounty pool.
 * The player's verbs are:
 *   - **post bounty** → push a {@link BountyType} onto {@link TinyCivWorkers.availableTasks}
 *   - **recall worker** → cancel the worker's current task and push it back to the pool
 *   - **pin worker** (5d) → bypass the pool; worker loops a building-bound
 *     task (e.g. `farm-work`). Each building type owns at most one pin slot.
 *   - **observe current task** → served passively by the worker cards in the layout
 *
 * Each worker owns an independent sequencer + timed-progress tracker + round-robin
 * fill strategy. All three strategies close over the same `availableTasks` ref,
 * so the pool is the coordination surface. Claim races are resolved by a
 * grab-on-claim handler: the `start` event on each sequencer removes the claimed
 * type from the pool before the next worker's strategy reads it.
 *
 * Idle workers do not auto-poll: the sequencer only calls `fill()` on complete /
 * cancel / dequeueNext. When a bounty is posted to an otherwise-empty pool,
 * {@link wakeIdleWorkers} nudges every currently-idle worker to `fill()` once so
 * exactly one of them claims the new entry. The same nudge runs on recall so
 * the pushed-back bounty is picked up by another worker if one is free.
 *
 * Pinning (5d): {@link TinyCivWorkers.pinWorker} swaps a worker's fillStrategy
 * to one that always yields its building's pin task, then kicks off a fill.
 * Unpin restores the original round-robin strategy and re-engages the pool.
 * Pinned workers are excluded from `wakeIdleWorkers` so a posted bounty can't
 * redirect them.
 *
 * Trackers are ephemeral — mid-task progress does not survive save/load, so a
 * reload restarts in-flight bounties from zero. This keeps the save shape clean
 * and sidesteps the three-workers-in-one-context collision that persistent
 * `progress` refs would cause.
 */
import { reactive } from 'vue';
import {
  Decimal,
  addResource,
  createRoundRobinStrategy,
  createSequencer,
  createTimedProgress,
  createWorker,
  persistent,
  withPersistentContext,
  type DecimalSource,
  type EngineContext,
  type FillStrategy,
  type Persistent,
  type Resource,
  type Sequencer,
  type SequencerItem,
  type TimedProgress,
  type Worker,
} from 'open-loop-engine';
import {
  BOUNTY_DEFS,
  BOUNTY_REWARD_SPECS,
  PIN_TASK_DEFS,
  PIN_TASK_REWARDS,
  WORKER_IDS,
  type BountyDef,
  type BountyType,
  type BuildingId,
  type PinTaskId,
  type ResourceKind,
  type TaskReward,
  type WorkerId,
} from './content';
import type { Inventory } from 'open-loop-engine';

/** Resources the worker subsystem deposits bounty rewards into. */
export interface WorkerResources {
  food: Resource<DecimalSource>;
  wood: Resource<DecimalSource>;
  stone: Resource<DecimalSource>;
}

/**
 * Inventories used for capped deposits. When wood/stone inventories are
 * provided, bounty rewards route through `inv.add()` (clamps to remaining
 * space) instead of raw `addResource`. Food is plain since it's uncapped.
 */
export interface WorkerInventories {
  wood: Inventory;
  stone: Inventory;
}

export interface TinyCivWorker {
  id: WorkerId;
  worker: Worker<BountyDef>;
  sequencer: Sequencer<unknown>;
  tracker: TimedProgress;
  /** Cancel the current bounty and push its type back onto the shared pool. */
  recall: () => void;
  /** Tear down the tracker's tick subscription. */
  dispose: () => void;
}

export interface TinyCivWorkers {
  /**
   * Shared pool of posted bounty types. Workers' round-robin strategies all
   * close over this ref; grab-on-claim removes the claimed entry on 'start'.
   * Persisted so posted-but-unclaimed bounties survive save/load.
   */
  availableTasks: Persistent<BountyType[]>;
  workers: TinyCivWorker[];
  /** Push a bounty onto the shared pool and wake any idle worker. */
  postBounty: (type: BountyType) => void;
  /**
   * Which building each worker is currently pinned to, or null. Reactive so
   * the UI can bind to it for pin-indicator rendering. Modified exclusively
   * via {@link pinWorker}/{@link unpin}.
   */
  pinnedBy: Record<WorkerId, BuildingId | null>;
  /** Pin `workerId` to a pinnable building; swaps its sequencer strategy. */
  pinWorker: (workerId: WorkerId, buildingId: BuildingId) => void;
  /** Release `workerId` back to the shared pool. */
  unpin: (workerId: WorkerId) => void;
  /** Tear down every worker's tracker subscription. */
  dispose: () => void;
}

export function createTinyCivWorkers(
  ctx: EngineContext,
  resources: WorkerResources,
  inventories: WorkerInventories,
): TinyCivWorkers {
  const availableTasks = withPersistentContext('tiny-civ-bounties', () =>
    persistent<BountyType[]>([], { name: 'availableTasks' }),
  );

  const getTask = (id: string): BountyDef | undefined =>
    BOUNTY_DEFS[id as BountyType] ?? PIN_TASK_DEFS[id as PinTaskId];

  const depositTo = (kind: ResourceKind, amount: Decimal): void => {
    if (kind === 'food') {
      addResource(resources.food, amount);
      return;
    }
    // Wood/stone route through the inventory so the cap clamps deposits.
    // `inv.add` with 'destroy' overflow deposits up to remaining space; any
    // excess is discarded (no pool re-push or retry for now).
    const inv = kind === 'wood' ? inventories.wood : inventories.stone;
    inv.add(kind, amount);
  };

  const applyTaskReward = (taskId: string): void => {
    const reward: TaskReward | null | undefined =
      BOUNTY_REWARD_SPECS[taskId as BountyType] ?? PIN_TASK_REWARDS[taskId as PinTaskId];
    if (reward == null) return;
    depositTo(reward.resource, new Decimal(reward.amount));
  };

  interface BuiltWorker {
    id: WorkerId;
    sequencer: Sequencer<unknown>;
    tracker: TimedProgress;
    worker: Worker<BountyDef>;
    /** The strategy used when NOT pinned — round-robin over the shared pool. */
    poolStrategy: FillStrategy<unknown>;
  }

  // Per-worker persistent context isolates the sequencer's current/paused state
  // and the round-robin rotation index. Trackers are ephemeral so they don't
  // contend for a 'progress' key inside this context.
  const buildWorker = (id: WorkerId): BuiltWorker =>
    withPersistentContext(`tiny-civ-${id}`, () => {
      const sequencer: Sequencer<unknown> = createSequencer<unknown>({ id: `${id}:seq` });

      const tracker = createTimedProgress({
        id: `${id}:tracker`,
        duration: () => getTask(sequencer.currentItem?.id ?? '')?.durationSec ?? 0,
        registerTick: ctx.onTick,
        ephemeral: true,
        onComplete: () => {
          const taskId = sequencer.currentItem?.id;
          if (taskId != null) applyTaskReward(taskId);
          sequencer.complete();
        },
      });

      sequencer.on('start', () => tracker.reset());
      sequencer.on('start', (item) => {
        // Only bounty types live in the shared pool; pin tasks do not.
        const idx = availableTasks.value.indexOf(item.id as BountyType);
        if (idx >= 0) availableTasks.value.splice(idx, 1);
      });

      const poolStrategy = createRoundRobinStrategy<unknown>(
        `tiny-civ-${id}`,
        () =>
          availableTasks.value.map(
            (type): SequencerItem<unknown> => ({ id: type, metadata: undefined }),
          ),
      );
      sequencer.fillStrategy = poolStrategy;

      const worker = createWorker<BountyDef>({ id, sequencer, tracker, getTask });

      return { id, sequencer, tracker, worker, poolStrategy };
    });

  const built = WORKER_IDS.map(buildWorker);

  // Pin state mapped per worker. `reactive` wrapper makes the record's property
  // reads trigger reactivity in the UI (e.g. `computed(() => workers.pinnedBy[id])`).
  const pinnedBy = reactive<Record<WorkerId, BuildingId | null>>(
    Object.fromEntries(WORKER_IDS.map((id) => [id, null])) as Record<
      WorkerId,
      BuildingId | null
    >,
  );

  const pinTaskForBuilding = (buildingId: BuildingId): PinTaskId | null => {
    // Era-1: only farm has a pin task. Extend here as new pinnable buildings land.
    if (buildingId === 'farm') return 'farm-work';
    return null;
  };

  const makePinStrategy = (taskId: PinTaskId): FillStrategy<unknown> => ({
    next: () => ({ id: taskId, metadata: undefined }),
  });

  // Idle workers don't poll for new bounties — the sequencer only fills on
  // complete / cancel / explicit fill(). After a post or a recall, nudge each
  // currently-idle AND unpinned worker once so exactly one of them claims the
  // fresh entry. On recall, the recaller is excluded: otherwise it would be
  // first in the iteration order and re-grab the task it just pushed back.
  const wakeIdleWorkers = (exceptId?: WorkerId): void => {
    for (const b of built) {
      if (b.id === exceptId) continue;
      if (pinnedBy[b.id] != null) continue;
      if (b.sequencer.currentItem == null) b.sequencer.fill();
    }
  };

  const pinWorker = (workerId: WorkerId, buildingId: BuildingId): void => {
    const taskId = pinTaskForBuilding(buildingId);
    if (taskId == null) return;
    const b = built.find((w) => w.id === workerId);
    if (b == null) return;
    // If the worker was already pinned elsewhere, unpin first so its existing
    // pin-task loop stops before we swap strategies.
    if (pinnedBy[workerId] != null) unpin(workerId);
    // Cancel any in-flight bounty; push its type back to the pool so another
    // free worker can claim it.
    const currentType = b.sequencer.currentItem?.id as BountyType | undefined;
    if (currentType != null && BOUNTY_DEFS[currentType] != null) {
      b.sequencer.cancel();
      availableTasks.value.push(currentType);
      // Don't wake `workerId` — we're about to pin it.
      wakeIdleWorkers(workerId);
    } else if (b.sequencer.currentItem != null) {
      b.sequencer.cancel();
    }
    b.sequencer.fillStrategy = makePinStrategy(taskId);
    pinnedBy[workerId] = buildingId;
    b.sequencer.fill();
  };

  const unpin = (workerId: WorkerId): void => {
    const b = built.find((w) => w.id === workerId);
    if (b == null || pinnedBy[workerId] == null) return;
    if (b.sequencer.currentItem != null) b.sequencer.cancel();
    b.sequencer.fillStrategy = b.poolStrategy;
    pinnedBy[workerId] = null;
    // Try to pull a bounty immediately if any are waiting.
    b.sequencer.fill();
  };

  const workers: TinyCivWorker[] = built.map((b) => ({
    id: b.id,
    worker: b.worker,
    sequencer: b.sequencer,
    tracker: b.tracker,
    recall: () => {
      // Recall is for pool tasks only; pinned workers have a dedicated unpin.
      if (pinnedBy[b.id] != null) return;
      const currentType = b.sequencer.currentItem?.id as BountyType | undefined;
      b.sequencer.cancel();
      if (currentType != null && BOUNTY_DEFS[currentType] != null) {
        availableTasks.value.push(currentType);
        wakeIdleWorkers(b.id);
      }
    },
    dispose: () => b.worker.dispose(),
  }));

  return {
    availableTasks,
    workers,
    pinnedBy,
    pinWorker,
    unpin,
    postBounty: (type: BountyType) => {
      availableTasks.value.push(type);
      wakeIdleWorkers();
    },
    dispose: () => {
      for (const w of workers) w.dispose();
    },
  };
}
