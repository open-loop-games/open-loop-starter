import {
  Decimal,
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { BUILD_BALANCE, type BuildBalance } from '../data/build';
import { THREAT_BALANCE, type ThreatBalance } from '../data/threat';

/**
 * Cycle kernel — the phase controller + the exogenous scheduled burn. This is
 * the load-bearing half of the Cycler spine (see `../IDENTITY.md` § The
 * rate-function spine): a run alternates a calm setup window and an escalating
 * pressure window, and it ends — and pays out — when a time-driven burn
 * overtakes the saturated capacity ceiling D_max.
 *
 * The burn is EXOGENOUS: `W(t) = W₀ · g^((t − τ_setup)/T_g)`, a pure function of
 * elapsed run-time, never derived from within-run wallet state. That is what
 * guarantees termination and keeps the crossing closed-form. Under the peg
 * (`W₀ = D_max / H`) the run ends at the AUTHORED length
 * `N* = τ_setup + T_g·log_g(H)`, independent of how large D_max has grown — power
 * buys reach, only (H, g) move pacing.
 *
 * TODO(expansion): phase/state controller + exogenous time-scheduled burn are a
 * candidate engine primitive (authored schedule, not a state-derived cost); the
 * engine has no scheduled-drain today. See `candidate-primitives.md`
 * § "Exogenous time-scheduled burn + run phase controller". N=2 is multiverse-hr.
 */

/** Beat labels for where the run turns — measured windows, never authored. */
export type CyclePhase = 'setup' | 'comfortable' | 'first-bite' | 'under-review' | 'merge-bell';

export type RunState = 'running' | 'ended';

export interface CycleApi {
  /** Elapsed run-time in minutes (the spine's time unit). */
  elapsedMinutes: ComputedRef<number>;
  /** Current exogenous burn W(t) — the debit rate the capacity must outpace. */
  burn: ComputedRef<Decimal>;
  /** Saturated capacity ceiling D_max the burn is racing. Injected (build). */
  capacity: ComputedRef<Decimal>;
  /** burn / D_max — the tension ratio the phase labels read. */
  pressure: ComputedRef<number>;
  /** The active beat. */
  phase: ComputedRef<CyclePhase>;
  /** 'running' until the burn crosses D_max, then 'ended' (Merge bell). */
  runState: ComputedRef<RunState>;
  /** Measured run length once ended (minutes); null while running. */
  endedAtMinutes: ComputedRef<number | null>;
  /** Pegged baseline W₀ = D_max/H, fixed for the run, re-pegged at run start. */
  w0: ComputedRef<Decimal>;
  /** The scheduled burn as a pure function of run-time — the probe's oracle. */
  burnAt(tMinutes: number): Decimal;
  /** Closed-form predicted run length N* = τ_setup + T_g·log_g(H) at the peg. */
  predictedRunLength(): number;
  /** Re-peg W₀ from current capacity, zero the clock, set state 'running'. */
  startRun(): void;
}

export const CycleKey: InjectionKey<CycleApi> = Symbol('cycler/cycle') as InjectionKey<CycleApi>;

let cycle: CycleApi | null = null;

export function getCycle(): CycleApi {
  if (!cycle) throw new Error('cycler/cycle: not installed yet');
  return cycle;
}

export interface CycleModuleOptions {
  /** Difficulty surface + burn schedule (H, g, T_g, τ_setup). */
  threat?: ThreatBalance;
  /** Board/ceiling constants; default capacity is the layer-0 board ceiling. */
  build?: BuildBalance;
  /**
   * Injected saturated capacity ceiling D_max. Defaults to the layer-0
   * board-fill ceiling (`cells · baseOutputCeiling · adjacencyBoost`) so the
   * kernel is self-bootable before a build module exists; a fork wires the
   * real build capacity trajectory here.
   */
  capacity?: () => Decimal;
  /**
   * Injected burn schedule (g, T_g) — the pace surface. Defaults to the base
   * `threat` constants so the kernel is self-bootable before a burn-tier module
   * exists; a fork wires the live active-tier schedule here (see
   * `modules/burn-tier.ts`). Read ONLY at `startRun` and frozen for the run (like
   * the W₀ peg), so a tier switch applies to the next run and the crossing stays
   * closed-form.
   */
  schedule?: () => { escalationBase: number; escalationTimescale: number };
}

/**
 * Compose the cycle kernel. `capacity` is a getter so it tracks a live build
 * module once one exists; the default freezes it at the layer-0 ceiling.
 */
export function createCycleModule(options: CycleModuleOptions = {}): EngineModule {
  const threat = options.threat ?? THREAT_BALANCE;
  const build = options.build ?? BUILD_BALANCE;
  const defaultCapacity = new Decimal(
    build.boardCells * build.baseOutputCeiling * build.adjacencyBoost,
  );
  const capacityOf = options.capacity ?? (() => defaultCapacity);

  const { headroom: H, escalationBase: g0, escalationTimescale: Tg0, setupGrace: setup } = threat;
  // The pace surface (g, T_g). Default freezes the base `threat` schedule; a
  // burn-tier module wires the live active-tier schedule. Only read at startRun.
  const scheduleOf = options.schedule ?? (() => ({ escalationBase: g0, escalationTimescale: Tg0 }));

  return {
    id: 'cycler/cycle',
    install(ctx) {
      // Persistent run state. `elapsedSeconds` is the raw clock the loop
      // advances; minutes derive from it (the spine's time unit). `w0Raw` is the
      // pegged burn baseline and `gRaw`/`tgRaw` are the active pace surface — all
      // three are frozen for the run and re-read only at run start, so a re-peg or
      // a burn-tier switch never reshapes a run already in flight.
      const state = withPersistentContext('cycler/cycle', () => ({
        elapsedSeconds: persistent<number>(0, { name: 'elapsed-seconds' }),
        w0Raw: persistent<string>(capacityOf().div(H).toString(), { name: 'w0' }),
        gRaw: persistent<number>(g0, { name: 'g' }),
        tgRaw: persistent<number>(Tg0, { name: 'tg' }),
        runState: persistent<RunState>('running', { name: 'run-state' }),
        endedAtRaw: persistent<number | null>(null, { name: 'ended-at-minutes' }),
      }));

      const elapsedMinutes = computed(() => state.elapsedSeconds.value / 60);
      const w0 = computed(() => new Decimal(state.w0Raw.value));
      const capacity = computed(() => capacityOf());

      /**
       * The exogenous scheduled burn. Flat at W₀ through the setup grace, then
       * geometric: `W(t) = W₀ · g^((t − τ_setup)/T_g)`. Crosses D_max exactly at
       * `N* = τ_setup + T_g·log_g(D_max/W₀)`; under the peg D_max/W₀ = H.
       */
      const burnAt = (tMinutes: number): Decimal => {
        const past = Math.max(0, tMinutes - setup);
        return w0.value.mul(Decimal.pow(state.gRaw.value, past / state.tgRaw.value));
      };

      const burn = computed(() => burnAt(elapsedMinutes.value));
      const pressure = computed(() => burn.value.div(capacity.value).toNumber());

      const phase = computed<CyclePhase>(() => {
        if (state.runState.value === 'ended') return 'merge-bell';
        if (elapsedMinutes.value <= setup) return 'setup';
        const p = pressure.value;
        if (p < 0.5) return 'comfortable';
        if (p < 0.85) return 'first-bite';
        if (p < 1) return 'under-review';
        return 'merge-bell';
      });

      const runState = computed(() => state.runState.value);
      const endedAtMinutes = computed(() => state.endedAtRaw.value);

      const predictedRunLength = (): number =>
        setup + state.tgRaw.value * (Math.log(H) / Math.log(state.gRaw.value));

      const startRun = (): void => {
        state.elapsedSeconds.value = 0;
        // Freeze the active pace surface for this run (like the W₀ peg): a
        // burn-tier switch between runs lands here, never mid-run.
        const s = scheduleOf();
        state.gRaw.value = s.escalationBase;
        state.tgRaw.value = s.escalationTimescale;
        state.w0Raw.value = capacityOf().div(H).toString();
        state.runState.value = 'running';
        state.endedAtRaw.value = null;
      };

      // The run clock + crossing detector. Advance while running; when the burn
      // overtakes the ceiling the run ends (and, once a payout module exists,
      // banks its currency — the Merge bell, not a fail state).
      ctx.onTick((dt) => {
        if (state.runState.value !== 'running') return;
        state.elapsedSeconds.value += dt;
        if (burn.value.gte(capacity.value)) {
          state.runState.value = 'ended';
          state.endedAtRaw.value = elapsedMinutes.value;
        }
      });

      const api: CycleApi = {
        elapsedMinutes,
        burn,
        capacity,
        pressure,
        phase,
        runState,
        endedAtMinutes,
        w0,
        burnAt,
        predictedRunLength,
        startRun,
      };
      cycle = api;
      ctx.provide(CycleKey, api);
    },
  };
}
