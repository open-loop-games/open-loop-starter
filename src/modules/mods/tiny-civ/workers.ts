/**
 * Tiny Civilization — Majesty-inspired indirect-control workers (5c).
 *
 * A fixed roster of three workers competes for entries in a shared bounty pool.
 * The player's verbs are:
 *   - **post bounty** → push a {@link BountyType} onto {@link TinyCivWorkers.availableTasks}
 *   - **recall worker** → cancel the worker's current task and push it back to the pool
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
 * Trackers are ephemeral — mid-task progress does not survive save/load, so a
 * reload restarts in-flight bounties from zero. This keeps the save shape clean
 * and sidesteps the three-workers-in-one-context collision that persistent
 * `progress` refs would cause.
 */
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
  type Persistent,
  type Resource,
  type Sequencer,
  type SequencerItem,
  type TimedProgress,
  type Worker,
} from 'open-loop-engine';
import {
  BOUNTY_DEFS,
  BOUNTY_REWARDS,
  WORKER_IDS,
  type BountyDef,
  type BountyType,
  type WorkerId,
} from './content';

/** Resources the worker subsystem deposits bounty rewards into. */
export interface WorkerResources {
  food: Resource<DecimalSource>;
  wood: Resource<DecimalSource>;
  stone: Resource<DecimalSource>;
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
  /** Tear down every worker's tracker subscription. */
  dispose: () => void;
}

export function createTinyCivWorkers(
  ctx: EngineContext,
  resources: WorkerResources,
): TinyCivWorkers {
  const availableTasks = withPersistentContext('tiny-civ-bounties', () =>
    persistent<BountyType[]>([], { name: 'availableTasks' }),
  );

  const getTask = (id: string): BountyDef | undefined => BOUNTY_DEFS[id as BountyType];

  const applyReward = (type: BountyType): void => {
    const reward = BOUNTY_REWARDS[type];
    if (reward <= 0) return;
    const amount = new Decimal(reward);
    switch (type) {
      case 'gather-food':
        addResource(resources.food, amount);
        return;
      case 'gather-wood':
        addResource(resources.wood, amount);
        return;
      case 'gather-stone':
        addResource(resources.stone, amount);
        return;
      case 'explore-zone':
        return;
    }
  };

  interface BuiltWorker {
    id: WorkerId;
    sequencer: Sequencer<unknown>;
    tracker: TimedProgress;
    worker: Worker<BountyDef>;
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
          const type = sequencer.currentItem?.id as BountyType | undefined;
          if (type != null) applyReward(type);
          sequencer.complete();
        },
      });

      sequencer.on('start', () => tracker.reset());
      sequencer.on('start', (item) => {
        const idx = availableTasks.value.indexOf(item.id as BountyType);
        if (idx >= 0) availableTasks.value.splice(idx, 1);
      });

      sequencer.fillStrategy = createRoundRobinStrategy<unknown>(
        `tiny-civ-${id}`,
        () =>
          availableTasks.value.map(
            (type): SequencerItem<unknown> => ({ id: type, metadata: undefined }),
          ),
      );

      const worker = createWorker<BountyDef>({ id, sequencer, tracker, getTask });

      return { id, sequencer, tracker, worker };
    });

  const built = WORKER_IDS.map(buildWorker);

  // Idle workers don't poll for new bounties — the sequencer only fills on
  // complete / cancel / explicit fill(). After a post or a recall, nudge each
  // currently-idle worker once so exactly one of them claims the fresh entry.
  // On recall, the recaller is excluded: otherwise it would be first in the
  // iteration order and re-grab the task it just pushed back.
  const wakeIdleWorkers = (exceptId?: WorkerId): void => {
    for (const b of built) {
      if (b.id === exceptId) continue;
      if (b.sequencer.currentItem == null) b.sequencer.fill();
    }
  };

  const workers: TinyCivWorker[] = built.map((b) => ({
    id: b.id,
    worker: b.worker,
    sequencer: b.sequencer,
    tracker: b.tracker,
    recall: () => {
      const currentType = b.sequencer.currentItem?.id as BountyType | undefined;
      b.sequencer.cancel();
      if (currentType != null) {
        availableTasks.value.push(currentType);
        wakeIdleWorkers(b.id);
      }
    },
    dispose: () => b.worker.dispose(),
  }));

  return {
    availableTasks,
    workers,
    postBounty: (type: BountyType) => {
      availableTasks.value.push(type);
      wakeIdleWorkers();
    },
    dispose: () => {
      for (const w of workers) w.dispose();
    },
  };
}
