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
import { DEFENSE_BALANCE, type DefenseBalance } from '../data/defense';
import { getBuild } from './build';
import { getWall } from './wall';

/**
 * Cycle kernel — the wave-indexed phase controller + the exogenous salvo schedule.
 * The load-bearing half of the Cycler spine (see `../IDENTITY.md` § Cycler's
 * realization; studio/open-loop-starter#21 leaf 3): a run alternates hard phases —
 * STANDBY (build/calm, the line repairs) ↔ INBOUND (a salvo descends) — and it ends
 * when the exogenous salvo overwhelms the realized clear-rate faster than the line
 * buffer can absorb (OVERRUN → Redeploy).
 *
 * The salvo is EXOGENOUS and WAVE-indexed: `W_N = W₀ · g^N`, a pure function of the
 * wave count, never derived from within-run wallet state — that is what guarantees
 * termination and keeps the crossing closed-form. Under the peg (`W₀ = cMax / H`)
 * the salvo crosses the ceiling at the AUTHORED wave `N_c = log_g(H)`, independent of
 * how large cMax has grown (power buys reach, only (H, g) move pacing). A bounded,
 * player-controlled `Δ_wall` tail — the line-HP buffer, repaired from MW surplus in
 * STANDBY — extends the run a few waves past the crossing; `N*_waves = log_g(H) + Δ_wall`.
 *
 * Two clear-rates, deliberately distinct (see `modules/build.ts`): the peg freezes
 * `W₀` against the closed-form **cMax** (permanent reach), but each salvo's leak
 * resolves against the **realized** `clearRate` of the board you actually fielded —
 * so under-fielding Lances breaches the line early. The line breach, not a
 * ceiling-crossing arithmetic, is the live run-end.
 *
 * TODO(expansion): the wave-indexed exogenous schedule + the STANDBY↔INBOUND phase
 * controller are a candidate engine primitive — the `TimedInput` candidate
 * (`open-loop-engine/docs/candidate-primitives.md`) re-indexed time→wave, plus a
 * two-phase alternation the single running/ended lifecycle doesn't cover. Graduation
 * dive filed as studio/open-loop-engine#11.
 */

/** Hard phase the run is in. STANDBY/INBOUND cycle; SATURATION marks a boss salvo; OVERRUN is the breach. */
export type CyclePhase = 'standby' | 'inbound' | 'saturation' | 'overrun';

export type RunState = 'running' | 'ended';

export interface CycleApi {
  /** Current wave index N (0-based). The salvo schedule's argument. */
  waveIndex: ComputedRef<number>;
  /** The active hard phase. */
  phase: ComputedRef<CyclePhase>;
  /** Current salvo W_N = W₀·g^N — the exogenous pressure the clear-rate must outpace. */
  salvo: ComputedRef<Decimal>;
  /** Saturated clear-rate ceiling cMax the salvo is racing (HUD ceiling + peg base). Injected off build. */
  capacity: ComputedRef<Decimal>;
  /** salvo / cMax — the authored crossing progress (opens at 1/H, hits 1 at the crossing). */
  pressure: ComputedRef<number>;
  /** 'running' until the line breaches, then 'ended' (OVERRUN → Redeploy). */
  runState: ComputedRef<RunState>;
  /** The wave the line breached on once ended; null while running. */
  endedAtWave: ComputedRef<number | null>;
  /** Measured run length once ended (minutes); null while running. */
  endedAtMinutes: ComputedRef<number | null>;
  /** Elapsed run-time in minutes (a real clock, no longer the crossing driver). */
  elapsedMinutes: ComputedRef<number>;
  /** Run-long Σ of resolved salvos W_n — the wave-native endurance source (prestige reads it). */
  runEndurance: ComputedRef<Decimal>;
  /** Pegged baseline W₀ = cMax/H, fixed for the run, re-pegged at run start. */
  w0: ComputedRef<Decimal>;
  /** The scheduled salvo at wave n — the pure schedule W₀·g^n. */
  salvoAt(n: number): Decimal;
  /** Closed-form authored run length N* (minutes) = log_g(H)·waveCycle; the Δ_wall tail adds a measured bounded tail on top. */
  predictedRunLength(): number;
  /** Closed-form authored crossing in waves = log_g(H) (tail-exclusive). */
  predictedRunLengthWaves(): number;
  /** Re-peg W₀ from current cMax, reset wave/phase/clock + line buffer, set state 'running'. */
  startRun(): void;
}

export const CycleKey: InjectionKey<CycleApi> = Symbol('cycler/cycle') as InjectionKey<CycleApi>;

let cycle: CycleApi | null = null;

export function getCycle(): CycleApi {
  if (!cycle) throw new Error('cycler/cycle: not installed yet');
  return cycle;
}

export interface CycleModuleOptions {
  /** Difficulty + wave-cycle surface (H, salvoBase, standby/inbound seconds, bossMilestone, lineHP). */
  defense?: DefenseBalance;
  /** Permanent-power surface (producerUpgradeRatio) — scales the line buffer at run start. */
  build?: BuildBalance;
  /**
   * Injected salvo schedule (the active posture's g). Defaults to the base
   * `DEFENSE_BALANCE.salvoBase` so the kernel is self-bootable before a posture
   * module exists; a fork wires the live active-posture schedule here (see
   * `modules/burn-tier.ts` + the g-bender composition in `modules/index.ts`). Read
   * ONLY at `startRun` and frozen for the run, so a switch applies to the next run and
   * the crossing stays closed-form.
   */
  schedule?: () => { salvoBase: number };
}

/**
 * Compose the cycle kernel. Reads the live build + wall modules lazily via their
 * getters (both install before `onTick`/`startRun` fire), so no module-order change.
 */
export function createCycleModule(options: CycleModuleOptions = {}): EngineModule {
  const defense = options.defense ?? DEFENSE_BALANCE;
  const build = options.build ?? BUILD_BALANCE;
  const { headroom: H, standbySeconds, inboundSeconds, bossMilestone, lineHP, salvoBase } = defense;
  const { producerUpgradeRatio } = build;
  const waveCycleMinutes = (standbySeconds + inboundSeconds) / 60;
  // The pace surface (g). Default freezes the base salvoBase; a posture module wires
  // the live active-posture schedule. Only read at startRun.
  const scheduleOf = options.schedule ?? (() => ({ salvoBase }));

  return {
    id: 'cycler/cycle',
    install(ctx) {
      // Persistent run state. `waveIndex`/`phaseState`/`phaseElapsed` drive the hard
      // cycle; `elapsedSeconds` is a real clock (for readouts, no longer the crossing
      // driver); `w0Raw`/`gRaw` are the pegged salvo baseline + active pace, both
      // frozen for the run (re-read only at run start). `enduranceRaw` is Σ of
      // resolved salvos this run (the wave-native endurance source).
      const state = withPersistentContext('cycler/cycle', () => ({
        waveIndex: persistent<number>(0, { name: 'wave-index' }),
        phaseState: persistent<'standby' | 'inbound'>('standby', { name: 'phase-state' }),
        phaseElapsed: persistent<number>(0, { name: 'phase-elapsed' }),
        elapsedSeconds: persistent<number>(0, { name: 'elapsed-seconds' }),
        w0Raw: persistent<string>(getBuild().cMax.value.div(H).toString(), { name: 'w0' }),
        gRaw: persistent<number>(salvoBase, { name: 'g' }),
        enduranceRaw: persistent<string>('0', { name: 'run-endurance' }),
        runState: persistent<RunState>('running', { name: 'run-state' }),
        endedAtWaveRaw: persistent<number | null>(null, { name: 'ended-at-wave' }),
      }));

      const waveIndex = computed(() => state.waveIndex.value);
      const elapsedMinutes = computed(() => state.elapsedSeconds.value / 60);
      const w0 = computed(() => new Decimal(state.w0Raw.value));
      const capacity = computed(() => getBuild().cMax.value);

      const salvoAt = (n: number): Decimal => w0.value.mul(Decimal.pow(state.gRaw.value, n));
      const salvo = computed(() => salvoAt(state.waveIndex.value));
      const pressure = computed(() => salvo.value.div(capacity.value).toNumber());
      const runEndurance = computed(() => new Decimal(state.enduranceRaw.value));

      const phase = computed<CyclePhase>(() => {
        if (state.runState.value === 'ended') return 'overrun';
        if (state.phaseState.value === 'standby') return 'standby';
        // INBOUND: a boss milestone salvo is a SATURATION wave (label only this leaf).
        return state.waveIndex.value > 0 && state.waveIndex.value % bossMilestone === 0
          ? 'saturation'
          : 'inbound';
      });

      const runState = computed(() => state.runState.value);
      const endedAtWave = computed(() => state.endedAtWaveRaw.value);
      const endedAtMinutes = computed(() =>
        state.runState.value === 'ended' ? state.elapsedSeconds.value / 60 : null,
      );

      const predictedRunLengthWaves = (): number => Math.log(H) / Math.log(state.gRaw.value);
      const predictedRunLength = (): number => predictedRunLengthWaves() * waveCycleMinutes;

      const startRun = (): void => {
        // Freeze the active pace surface for this run (like the W₀ peg): a posture
        // switch between runs lands here, never mid-run.
        const s = scheduleOf();
        state.gRaw.value = s.salvoBase;
        state.w0Raw.value = getBuild().cMax.value.div(H).toString();
        state.waveIndex.value = 0;
        state.phaseState.value = 'standby';
        state.phaseElapsed.value = 0;
        state.elapsedSeconds.value = 0;
        state.enduranceRaw.value = '0';
        state.runState.value = 'running';
        state.endedAtWaveRaw.value = null;
        // Rescale the line buffer with permanent power so the Δ_wall tail stays
        // power-invariant (leak ∝ C ∝ power; the buffer scales with it).
        const L = getBuild().powerLevel.value;
        getWall().resetRun(lineHP * Math.pow(producerUpgradeRatio, L));
      };

      // The hard-phase controller. STANDBY drips surplus into the line (throughput-
      // gated by Bulwarks); INBOUND resolves one salvo at its close — leak-through
      // `max(0, W_N − realized C)` bleeds the line, and a breach ends the run.
      ctx.onTick((dt) => {
        if (state.runState.value !== 'running') return;
        state.elapsedSeconds.value += dt;
        state.phaseElapsed.value += dt;

        if (state.phaseState.value === 'standby') {
          // Continuous surplus-fed auto-repair: the per-STANDBY total is
          // min(mwSurplus, repairCapacity), dripped across the window.
          const budget = Decimal.min(getBuild().mwSurplus.value, getBuild().repairCapacity.value);
          getWall().repair((budget.toNumber() / standbySeconds) * dt);
          if (state.phaseElapsed.value >= standbySeconds) {
            state.phaseState.value = 'inbound';
            state.phaseElapsed.value = 0;
          }
          return;
        }

        // INBOUND — build locks (enforcement is UI/automation's). Resolve at close.
        if (state.phaseElapsed.value >= inboundSeconds) {
          const wave = salvo.value; // this wave's W_N
          state.enduranceRaw.value = runEndurance.value.add(wave).toString();
          const leak = Decimal.max(0, wave.sub(getBuild().clearRate.value));
          const breached = getWall().applyLeak(leak.toNumber());
          if (breached) {
            state.runState.value = 'ended';
            state.endedAtWaveRaw.value = state.waveIndex.value;
          } else {
            state.waveIndex.value += 1;
            state.phaseState.value = 'standby';
            state.phaseElapsed.value = 0;
          }
        }
      });

      const api: CycleApi = {
        waveIndex,
        phase,
        salvo,
        capacity,
        pressure,
        runState,
        endedAtWave,
        endedAtMinutes,
        elapsedMinutes,
        runEndurance,
        w0,
        salvoAt,
        predictedRunLength,
        predictedRunLengthWaves,
        startRun,
      };
      cycle = api;
      ctx.provide(CycleKey, api);
    },
  };
}
