import {
  createEmitHandle,
  createSequencer,
  persistent,
  tunable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Sequencer,
} from '@open-loop/engine';
import type { BloonDef, BloonId, BloonInstance, DefenderData } from '../data/types';
import { MapKey } from './map';
import { DefenderTuningRegistryKey } from './tuning';

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
  /** Pop a bloon. Called by the towers module when a projectile hit lands.
   *  Emits `bloon-popped`, applies the BTD1 shedding ladder
   *  (`Bloon.as:279-281` — blue→red, green→blue, yellow→green; red is the
   *  floor) by re-spawning at the same path position, and removes the
   *  popped bloon from `inFlight`. No-op if the instance has already been
   *  resolved (popped or leaked) earlier this tick — towers may race on
   *  AoE pulses (Bomb splash, Tack volley) and we don't want double-pops. */
  popBloon(instanceId: string, towerInstanceId: string): void;
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

interface BloonsEvents {
  'bloon-popped': (event: {
    defId: BloonId;
    distanceAlongPath: number;
    towerInstanceId: string;
  }) => void;
  'bloon-leaked': (event: { defId: BloonId }) => void;
  'wave-cleared': () => void;
}

let bloons: BloonsApi | null = null;

export function getBloons(): BloonsApi {
  if (!bloons) throw new Error('defender/bloons: not installed yet');
  return bloons;
}

/**
 * Bloon module — wave-stream sequencer + per-bloon lifecycle + shedding.
 *
 * Wave-stream sequencer (`createSequencer<WaveStreamMeta>`) dispatches one
 * stream at a time; the active stream's metadata carries `remaining`,
 * `spawnIntervalSec`, `elapsedSinceLastSpawn`. The per-tick handler walks
 * the in-flight bloons (advance distance, freeze-thaw, leak-check), then
 * drives the active stream's spawn timer — when `elapsedSinceLastSpawn`
 * exceeds the interval it spawns one bloon at distance 0 and decrements
 * `remaining`; when `remaining` hits 0 the sequencer item completes and the
 * next stream takes over.
 *
 * Shedding lives internally: `popBloon` looks up `def.spawnsOnPop` and
 * (if set) calls `spawnBloon(child, currentDistance)` before removing the
 * popped instance. Red is the floor — no further shed.
 *
 * Freeze is binary per BTD1 (`Bloon.as:157-176`, `Bloon.as:241`): while
 * `frozenRemainingSec > 0` walk speed multiplier is 0; the towers module
 * sets the countdown to `def.freezeDurationSec`, this module decrements it.
 * No partial slow, no separate safety thaw (towers set a finite duration).
 *
 * `wave-cleared` fires once per wave when the sequencer has no active
 * item, the queue is empty, AND `inFlight.length === 0`. Guarded by a
 * `waveActive` flag flipped on `startWave`.
 *
 * Income is event-driven (per-pop `bloon-popped`), NOT a continuous
 * `getRate` channel — the round module subscribes and mutates money.
 * Stays in lane: this module emits, never grants.
 */
export function createBloonsModule(data: DefenderData): EngineModule {
  return {
    id: 'defender/bloons',
    dependencies: ['defender/tuning', 'defender/map'],
    install(ctx) {
      const registry = ctx.inject(DefenderTuningRegistryKey);
      const map = ctx.inject(MapKey);

      // Per-bloon tunables. `speedLaneUnitsPerSec` drives the per-tick walk;
      // `livesOnLeak` is registered here (data/bloons.ts is the source-of-
      // truth at `livesOnLeak = rank` per `BloonsTD.as:1151`) so the round
      // module's `bloon-leaked` handler reads the tunable scope instead of
      // the raw def. Both lookups are `BloonId` → ComputedRef<number>.
      const speedById: Record<BloonId, ReturnType<typeof tunable<number>>> = {} as Record<
        BloonId,
        ReturnType<typeof tunable<number>>
      >;
      const livesOnLeakById: Record<BloonId, ReturnType<typeof tunable<number>>> = {} as Record<
        BloonId,
        ReturnType<typeof tunable<number>>
      >;
      const defById = new Map<BloonId, BloonDef>();
      for (const def of data.bloons) {
        defById.set(def.id, def);
        speedById[def.id] = tunable<number>(
          registry,
          `bloons/${def.id}/speedLaneUnitsPerSec`,
          () => def.speedLaneUnitsPerSec,
        );
        livesOnLeakById[def.id] = tunable<number>(
          registry,
          `bloons/${def.id}/livesOnLeak`,
          () => def.livesOnLeak,
        );
      }

      const inFlight = persistent<BloonInstance[]>([], { name: 'in-flight-bloons' });
      const nextBloonId = persistent<number>(0, { name: 'next-bloon-id' });
      // `waveActive` flips true on startWave and false on the wave-cleared
      // emit. Without it, the per-tick "no items, no in-flight" predicate
      // would fire `wave-cleared` every tick between rounds.
      const waveActive = persistent<boolean>(false, { name: 'wave-active' });

      const handle = createEmitHandle<BloonsEvents>();

      function spawnBloon(defId: BloonId, distanceAlongPath: number): void {
        const id = `bloon-${nextBloonId.value++}`;
        const instance: BloonInstance = {
          instanceId: id,
          defId,
          distanceAlongPath,
          frozenRemainingSec: 0,
        };
        inFlight.value = [...inFlight.value, instance];
      }

      function popBloon(instanceId: string, towerInstanceId: string): void {
        const arr = inFlight.value;
        const idx = arr.findIndex((b) => b.instanceId === instanceId);
        // Idempotent: AoE pulses (Bomb splash, Tack volley) may resolve the
        // same instance twice in a single tick. Silent no-op rather than
        // throwing so callers can fire-and-forget.
        if (idx < 0) return;
        const popped = arr[idx];
        const def = defById.get(popped.defId);
        if (!def) return;
        handle.emit('bloon-popped', {
          defId: popped.defId,
          distanceAlongPath: popped.distanceAlongPath,
          towerInstanceId,
        });
        // Remove the popped bloon first, then shed. Order matters so the
        // shed child doesn't appear before the parent leaves the array
        // (which would let a downstream observer count both for a tick).
        inFlight.value = arr.filter((_, i) => i !== idx);
        if (def.spawnsOnPop) {
          spawnBloon(def.spawnsOnPop, popped.distanceAlongPath);
        }
      }

      // Wave-stream sequencer. One item per `WaveStreamSpec`; metadata is
      // mutated in-place inside the per-tick handler (decrementing
      // `remaining`, ticking `elapsedSinceLastSpawn`). When `remaining`
      // hits 0 we call `sequencer.complete()` to advance to the next
      // stream. `startOnEnqueue: false` so `startWave` can enqueue all
      // streams up front then call `start()` once.
      const sequencer = createSequencer<WaveStreamMeta>({
        id: 'defender/wave-sequencer',
        mode: 'queue',
        startOnEnqueue: false,
      });

      function startWave(round: number): void {
        const wave = data.waves[round - 1];
        if (!wave) throw new Error(`defender/bloons.startWave: no wave for round ${round}`);
        // Clear any residual state from a prior wave (defensive — round
        // module should only call us after `wave-cleared`, but a save/load
        // mid-wave could leave items behind).
        sequencer.clear();
        for (let i = 0; i < wave.streams.length; i++) {
          const stream = wave.streams[i];
          sequencer.enqueue({
            id: `wave-${round}-stream-${i}`,
            metadata: {
              bloonId: stream.bloonId,
              remaining: stream.count,
              spawnIntervalSec: stream.spawnIntervalSec,
              elapsedSinceLastSpawn: stream.spawnIntervalSec, // fire first spawn on first tick
            },
          });
        }
        waveActive.value = true;
        sequencer.start();
      }

      ctx.onTick((dt) => {
        // 1) Walk + freeze-thaw + leak resolution. Iterates the live array;
        //    collects survivors so a single reassignment refreshes Vue
        //    dependents (matches tug/lane.ts survivor-filter pattern).
        const pathLength = map.pathTotalLength;
        const arr = inFlight.value;
        if (arr.length > 0) {
          const survivors: BloonInstance[] = [];
          let removedAny = false;
          for (const b of arr) {
            // Freeze tick. Decrement countdown, clamp at 0. While frozen,
            // walk speed multiplier is 0 (binary; no partial slow per
            // BTD1). At thaw the next tick walks normally.
            if (b.frozenRemainingSec > 0) {
              b.frozenRemainingSec = Math.max(0, b.frozenRemainingSec - dt);
            }
            const speed = b.frozenRemainingSec > 0 ? 0 : Number(speedById[b.defId].value);
            b.distanceAlongPath += speed * dt;
            // Leak — emit then drop. Round module reads `livesOnLeak` via
            // its own tunable lookup, so we just hand back `defId`.
            if (b.distanceAlongPath >= pathLength) {
              handle.emit('bloon-leaked', { defId: b.defId });
              removedAny = true;
              continue;
            }
            survivors.push(b);
          }
          if (removedAny) inFlight.value = survivors;
        }

        // 2) Drive the active wave-stream. The sequencer's `currentItem`
        //    holds the live `WaveStreamMeta`; we tick its spawn timer and
        //    complete the item when its `remaining` count hits 0. The
        //    sequencer handles cursor advance on complete; the next stream
        //    becomes current automatically.
        const active = sequencer.currentItem;
        if (active) {
          const meta = active.metadata;
          meta.elapsedSinceLastSpawn += dt;
          // While there's budget AND interval has elapsed, spawn. A coarse
          // tickDelta (1s+) could elapse multiple intervals at once; the
          // while-loop drains the backlog rather than dropping spawns.
          while (meta.remaining > 0 && meta.elapsedSinceLastSpawn >= meta.spawnIntervalSec) {
            spawnBloon(meta.bloonId, 0);
            meta.remaining -= 1;
            meta.elapsedSinceLastSpawn -= meta.spawnIntervalSec;
          }
          if (meta.remaining <= 0) {
            sequencer.complete();
          }
        }

        // 3) Wave-cleared predicate. Fires once when the sequencer has
        //    drained AND no in-flight bloons remain. `waveActive` gates
        //    re-emission across ticks; round module flips the next wave
        //    on via `startWave`.
        if (
          waveActive.value &&
          sequencer.currentItem === null &&
          sequencer.items.value.length === 0 &&
          inFlight.value.length === 0
        ) {
          waveActive.value = false;
          handle.emit('wave-cleared');
        }
      });

      bloons = {
        inFlight,
        spawnBloon,
        popBloon,
        bloonCount: () => inFlight.value.length,
        startWave,
        onBloonPopped: (h) => handle.on('bloon-popped', h),
        onBloonLeaked: (h) => handle.on('bloon-leaked', h),
        onWaveCleared: (h) => handle.on('wave-cleared', h),
      };

      ctx.provide(BloonsKey, bloons);
      ctx.provide(WaveSequencerKey, sequencer);
    },
  };
}
