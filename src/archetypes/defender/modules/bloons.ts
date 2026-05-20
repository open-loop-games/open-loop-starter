import type { EngineModule, InjectionKey, Persistent, Sequencer } from '@open-loop/engine';
import type { BloonId, BloonInstance, DefenderData } from '../data/types';

/** Sequencer metadata per wave-stream — one item per `WaveStreamSpec` from
 *  the active wave. Tick handler decrements `remaining` and spawns one bloon
 *  every `spawnIntervalSec`; item completes when `remaining === 0`. */
export interface WaveStreamMeta {
  bloonId: BloonId;
  remaining: number;
  spawnIntervalSec: number;
  /** Seconds since the last spawn from this stream. Ticked by the bloons
   *  module; spawn fires when this exceeds `spawnIntervalSec`. */
  elapsedSinceLastSpawn: number;
}

export interface BloonsApi {
  /** Live array of in-flight bloons. Each carries `distanceAlongPath`
   *  ticked by the per-tick walk handler at `def.speedLaneUnitsPerSec × dt`. */
  inFlight: Persistent<BloonInstance[]>;
  /** Spawn a bloon of `defId` at the given distance along the path. Used by
   *  the wave-sequencer for fresh wave spawns AND internally by the
   *  pop-handler for shedding (popping blue spawns red at the same distance). */
  spawnBloon(defId: BloonId, distanceAlongPath: number): void;
  /** Total in-flight count, useful for round-end predicate + UI. */
  bloonCount(): number;
  /** Begin the active wave's spawn sequence. Called by the round module on
   *  `startRound(n)`. Loads `data.waves[n-1].streams` into the sequencer. */
  startWave(round: number): void;
  /** Subscribe to per-bloon-pop events. Fires when a tower-projectile hit
   *  reduces hp to 0 OR when the bloon is mass-popped by a Bomb / Tack /
   *  Ice AoE pulse. Round module subscribes to grant `economy.moneyPerPop`
   *  per fire. */
  onBloonPopped(
    handler: (event: {
      defId: BloonId;
      distanceAlongPath: number;
      towerInstanceId: string;
    }) => void,
  ): () => void;
  /** Subscribe to per-bloon-leak events. Fires when distanceAlongPath
   *  reaches `pathTotalLength`. Round module subscribes to subtract lives
   *  by the bloon's `livesOnLeak` rank. */
  onBloonLeaked(handler: (event: { defId: BloonId }) => void): () => void;
  /** Subscribe to wave-cleared event — fires when the last in-flight bloon
   *  resolves (popped or leaked) AND the sequencer has emitted all streams.
   *  Round module subscribes to award `wave.cashReward` + advance round. */
  onWaveCleared(handler: () => void): () => void;
}

export const BloonsKey: InjectionKey<BloonsApi> = Symbol(
  'defender/bloons',
) as InjectionKey<BloonsApi>;

/** Wave-stream sequencer — one `SequencerItem<WaveStreamMeta>` per
 *  `WaveStreamSpec`, dispatched sequentially. */
export const WaveSequencerKey: InjectionKey<Sequencer<WaveStreamMeta>> = Symbol(
  'defender/wave-sequencer',
) as InjectionKey<Sequencer<WaveStreamMeta>>;

let bloons: BloonsApi | null = null;

export function getBloons(): BloonsApi {
  if (!bloons) throw new Error('defender/bloons: not installed yet');
  return bloons;
}

/**
 * Bloon module — wave-stream sequencer + per-bloon lifecycle + shedding.
 * Phase 1 STUB — body lands in Phase 2 worktree C.
 *
 * Phase 2 implementation will:
 *   1. Create the wave-stream sequencer via `createSequencer<WaveStreamMeta>`.
 *   2. Maintain `inFlight: Persistent<BloonInstance[]>` for active bloons.
 *   3. Per-tick handler:
 *      a. For the active sequencer item: decrement `elapsedSinceLastSpawn`,
 *         when it exceeds `spawnIntervalSec` spawn one bloon at distance 0
 *         and decrement `remaining`. Complete item when `remaining === 0`.
 *      b. For each in-flight bloon: advance `distanceAlongPath` by
 *         `def.speedLaneUnitsPerSec × dt × freezeMultiplier`. If exceeds
 *         `pathTotalLength`, emit `onBloonLeaked` and remove.
 *   4. Expose `spawnBloon(defId, distanceAlongPath)` for both fresh wave
 *      spawns AND shedding from pop handlers. When a blue pops, the pop
 *      handler calls `spawnBloon('red', currentDistance)` — internal API,
 *      no engine substrate needed.
 *   5. Emit `onBloonPopped` from the tower-projectile collision handler
 *      (towers module calls into us via `getBloons()`).
 *   6. Emit `onWaveCleared` when sequencer has no active item AND
 *      `inFlight.length === 0`.
 *
 * Reads `MapKey` for `pathTotalLength` + `positionAtDistance` (for
 * tower-targeting spatial queries to resolve bloon world position).
 */
export function createBloonsModule(_data: DefenderData): EngineModule {
  return {
    id: 'defender/bloons',
    dependencies: ['defender/tuning', 'defender/map'],
    install(ctx) {
      bloons = makeStubBloons();
      ctx.provide(BloonsKey, bloons);
    },
  };
}

function makeStubBloons(): BloonsApi {
  const notImplemented = (method: string): never => {
    throw new Error(`defender/bloons: ${method} not implemented in Phase 1`);
  };
  return {
    get inFlight(): Persistent<BloonInstance[]> {
      return notImplemented('inFlight');
    },
    spawnBloon: () => notImplemented('spawnBloon'),
    bloonCount: () => notImplemented('bloonCount'),
    startWave: () => notImplemented('startWave'),
    onBloonPopped: () => notImplemented('onBloonPopped'),
    onBloonLeaked: () => notImplemented('onBloonLeaked'),
    onWaveCleared: () => notImplemented('onWaveCleared'),
  };
}
