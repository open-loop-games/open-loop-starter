import {
  ORTHOGONAL_OFFSETS,
  createSeededRNG,
  createSpatialGrid,
  getSeed,
  persistent,
  tunable,
  withPersistentContext,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { computed, ref, shallowRef, triggerRef, type ShallowRef } from 'vue';
import { ARENA_BALANCE, THREAT_BALANCE } from '../data/arena';
import { BASELINE_SEAT, seatById, type SeatDef } from '../data/seats';
import { SurvivorTuningRegistryKey } from './tuning';
import { MetaKey } from './meta';
import { createArenaState, refreshFields, stepArena, type StepResult } from './sim/step';
import { NAV_CELL, type Fields, type NavGrid } from './sim/steering';
import type { ArenaParams, ArenaState, Vec2 } from './sim/types';

/**
 * Arena module — owns the real-time floor and drives it from the engine tick.
 *
 * The module is a thin shell on purpose. All the rules live in `./sim/step.ts`
 * as a pure function so a probe can drive the identical code headless
 * (the graduated shared-pure-state-function discipline). What lives HERE is
 * everything the pure layer must not know about: engine ticks, persistence, the
 * seeded RNG, the spatial grid, and Vue reactivity.
 *
 * The arena state is held in a `shallowRef` rather than made deep-reactive:
 * hundreds of entities mutated every 50 ms through a reactive proxy is a real
 * cost for no benefit, since the UI only ever reads a rendered projection of it.
 */

/**
 * `briefing` is the state a fresh engine opens in — the floor exists and is
 * rendered, but nothing steps until a seat has been assigned.
 *
 * It is here because seat choice has to happen BEFORE the first run once a
 * player seat exists, and the debrief was the only place offering it. Everything
 * downstream already branched on `!== 'running'`, so the between-runs surface
 * covers the before-the-first-run case for free.
 */
export type RunOutcome = 'briefing' | 'running' | 'died' | 'trapped' | 'survived';

export interface ArenaApi {
  /** The live floor. Bumped on each step so renderers can watch one ref. */
  state: ShallowRef<ArenaState>;
  outcome: ComputedRef<RunOutcome>;
  /** Run-elapsed sim seconds. */
  elapsed: ComputedRef<number>;
  /** Motes banked this run — the XP the draft ladder is measured against. */
  banked: ComputedRef<number>;
  /** The seat driving this run. The draft policy reads its dials. */
  seat: ComputedRef<SeatDef>;
  /**
   * Post the desired unit heading for a player-driven seat; `null` for nothing
   * held. Written by `composables/usePlayerControl.ts` whenever the key set
   * changes, NOT per frame — the sim samples it at its own 20 Hz.
   *
   * A no-op for policy seats, so the caller never has to ask which it is.
   */
  setControl: (heading: { x: number; y: number } | null) => void;
  /** Begin a run on the given seat. Resets the floor. */
  startRun: (seatId?: string) => void;
  /** Stop stepping without clearing state, so the outcome stays readable. */
  endRun: (outcome: Exclude<RunOutcome, 'running'>) => void;
  /**
   * Advance the floor by `dt`. **Not** self-ticking: `modules/run.ts` owns the
   * lifecycle and calls this, so a pending draft can hold the floor still
   * without the arena needing to know what a draft is. That keeps the dependency
   * one-way (`run → arena`) where a `paused` flag read from here would not.
   */
  advance: (dt: number) => StepResult;
}

export const ArenaKey: InjectionKey<ArenaApi> = Symbol('survivor/arena') as InjectionKey<ArenaApi>;

export interface ArenaModuleOptions {
  /** Seat to open with. Defaults to the baseline the ladder is derived against. */
  seat?: SeatDef;
  /** Fixed seed, so a probe run is reproducible. Defaults to the engine's. */
  seed?: number;
  /** Cross-run multipliers. Supplied by the meta module once it lands. */
  metaSurvival?: number;
  metaCollect?: number;
  metaYield?: number;
}

/**
 * Exported so a probe can assemble the same scoring context the module runs on
 * (`../balance/steering-probe.ts` § term spread) rather than rebuilding a grid
 * beside it and drifting. Pure over `ARENA_BALANCE`.
 */
export function buildNav(): NavGrid {
  const cols = Math.ceil(ARENA_BALANCE.mapWidth / NAV_CELL);
  const rows = Math.ceil(ARENA_BALANCE.mapHeight / NAV_CELL);
  return {
    cols,
    rows,
    grid: createSpatialGrid<number>({
      width: cols,
      height: rows,
      initializer: () => 0,
      neighborhood: ORTHOGONAL_OFFSETS,
    }),
  };
}

export function createArenaModule(options: ArenaModuleOptions = {}): EngineModule {
  const seat = options.seat ?? BASELINE_SEAT;

  return {
    id: 'survivor/arena',
    dependencies: ['survivor/tuning', 'survivor/meta'],
    install(ctx) {
      const registry = ctx.inject(SurvivorTuningRegistryKey);
      const meta = ctx.inject(MetaKey);

      // Perturbable inputs read through the registry so probes can pushOverrides
      // them. The derived quantities are NOT here — see `./tuning.ts`.
      const baseHp = tunable(registry, 'arena/baseHp', () => THREAT_BALANCE.baseHp);
      const contactDps = tunable(registry, 'threat/contactDps', () => THREAT_BALANCE.contactDps);

      const persistentState = withPersistentContext('survivor/arena', () => ({
        seatId: persistent<string>(seat.id, { id: 'seatId' }),
        runsStarted: persistent<number>(0, { id: 'runsStarted' }),
      }));

      const nav = buildNav();
      let fields: Fields | undefined;
      let params: ArenaParams = buildParams(seat, options);
      // A `ref`, not a plain `let`. `computed(() => someLet)` never invalidates —
      // a computed tracks REACTIVE dependencies, and a local variable is not one,
      // so every consumer would read the first value forever while the real
      // outcome moved on. Silent, and it deadlocks the run: the lifecycle keeps
      // ticking a floor that has already stopped advancing.
      const outcome = ref<RunOutcome>('briefing');

      // Plain `let`, deliberately: the pure step reads this every tick through a
      // closure and nothing renders off it, so a ref would buy reactivity nobody
      // subscribes to and pay for it on the hot path.
      let control: Vec2 | null = null;

      const state = shallowRef<ArenaState>(createArenaState(params));
      // Touch the tunables so a scope push is observed at read time rather than
      // captured at install — the registry is the perturbation path, and a value
      // frozen here would silently ignore every override.
      void baseHp.value;
      void contactDps.value;

      const startRun = (seatId?: string): void => {
        const chosen = seatId ? seatById(seatId) : seatById(persistentState.seatId.value);
        persistentState.seatId.value = chosen.id;
        persistentState.runsStarted.value += 1;
        // Meta multipliers are read at run START, not at install: a run opens
        // with whatever the shop has bought by then, and stays fixed for its arc.
        control = null;
        params = buildParams(
          chosen,
          {
            ...options,
            metaSurvival: options.metaSurvival ?? meta.survivalMul.value,
            metaCollect: options.metaCollect ?? meta.collectMul.value,
            metaYield: options.metaYield ?? meta.yieldMul.value,
          },
          // The reader is installed only for a player seat. Its ABSENCE is what
          // selects the movement policy in `stepArena`, so a policy seat cannot
          // accidentally be steered by a stale key that is still held.
          chosen.driver === 'player' ? () => control : undefined,
        );
        state.value = createArenaState(params);
        fields = undefined;
        outcome.value = 'running';
      };

      const endRun = (next: Exclude<RunOutcome, 'running'>): void => {
        outcome.value = next;
      };

      const advance = (dt: number): StepResult => {
        if (outcome.value !== 'running') return { died: false, trapped: false };
        const current = state.value;
        fields = refreshFields(current, nav, fields);
        const result = stepArena(current, dt, params, nav, fields);
        // `stepArena` mutates in place, so the ref still holds the SAME object —
        // and `shallowRef` compares with `Object.is`, which means reassigning it
        // notifies nobody. `triggerRef` is the only thing that publishes a
        // mutate-in-place update. Getting this wrong is silent: every downstream
        // computed simply keeps its first value, and the draft never fires.
        triggerRef(state);
        if (result.died) outcome.value = 'died';
        else if (result.trapped) outcome.value = 'trapped';
        return result;
      };

      ctx.provide(ArenaKey, {
        state,
        outcome: computed(() => outcome.value),
        elapsed: computed(() => state.value.time),
        banked: computed(() => state.value.stats.motesBanked),
        seat: computed(() => seatById(persistentState.seatId.value)),
        setControl: (heading) => {
          control = heading;
        },
        startRun,
        endRun,
        advance,
      });
    },
  };
}

/** Exported for the same reason as `buildNav`. */
export function buildParams(
  seat: SeatDef,
  options: ArenaModuleOptions,
  control?: () => Vec2 | null,
): ArenaParams {
  return {
    engage: seat.engage,
    eta: seat.eta,
    speedMul: seat.speed,
    dpsMul: seat.dps,
    toughnessMul: seat.toughness,
    metaSurvival: options.metaSurvival ?? 1,
    metaCollect: options.metaCollect ?? 1,
    metaYield: options.metaYield ?? 1,
    random: createSeededRNG(options.seed ?? getSeed()),
    control,
  };
}
