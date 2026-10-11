import {
  persistent,
  tunable,
  unref,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { DEFENSE_BALANCE, SALVO_POSTURES, type SalvoPosture } from '../data/defense';
import { getBuild } from './build';
import { CyclerTuningRegistryKey } from './tuning';

/**
 * Salvo-posture module — the pace surface (see `../IDENTITY.md` § Growth ports,
 * `addBurnTier`; studio/open-loop-starter#21 leaf 3). It owns the PER-WAVE pace: a
 * reach-gated sequence of postures, each authoring its own salvo base `g`. The active
 * posture's schedule feeds the cycle kernel, which FREEZES it at run start (exactly
 * like the W₀ peg), so a switch applies to the next run and the crossing stays
 * closed-form.
 *
 * It does NOT re-own the peg or the crossing — those are the kernel's. It supplies
 * one thing (the active `salvoBase`) and gates one action (`advanceTier`) behind
 * reach. Deeper postures raise `g` — a steeper salvo, a shorter/sharper run
 * (Increlution Part 3: the escalation base is the high-leverage lever). The reach
 * gate is the permanent power level L (the prestige currency's sink), so the pace
 * surface can never outrun the board-fill/power that must clear it.
 *
 * Advancement is DELIBERATE and manual (not derived from L), which keeps the prestige
 * decoupling invariant intact: raising power alone re-pegs to +0 run length (within a
 * posture the peg holds flat); only an explicit `advanceTier` — under the gate — moves
 * run length. That gated pace move is what the later `addUpgrade` g-bender pushes on.
 *
 * SCOPE (this leaf): the mechanic — a reach-gated, peg-preserving step in the per-wave
 * pace. Absolute per-posture g, the Prophecy-draft surfacing, and a per-posture yield
 * incentive are leaf-4 balance work (see `data/defense.ts` § Salvo postures).
 */
export interface BurnTierApi {
  /** The active posture's index (0-based). Persistent, monotone via `advanceTier`. */
  activeIndex: ComputedRef<number>;
  /** The active posture's config. */
  activeTier: ComputedRef<SalvoPosture>;
  /** Total postures in the ladder. */
  tierCount: number;
  /** Highest posture index reach (build power level L) has unlocked. */
  unlockedIndex: ComputedRef<number>;
  /** A higher posture is unlocked and not yet active — `advanceTier` would move. */
  canAdvance: ComputedRef<boolean>;
  /** Power level L that unlocks the next posture; null when at the last one. */
  nextUnlockPowerLevel: ComputedRef<number | null>;
  /** The live salvo schedule (active posture's g). The kernel freezes this at run start. */
  schedule(): { salvoBase: number };
  /** Closed-form pegged crossing in WAVES for posture `index` under the shared peg (H): log_g(H). Excludes the Δ_wall tail. */
  runLengthAt(index: number): number;
  /**
   * Advance to the next posture if reach has unlocked it (L ≥ its gate). Returns
   * whether it moved (a no-op false when the next posture is still gated or the ladder
   * is exhausted). Takes effect at the NEXT run — the kernel freezes the schedule at
   * `startRun`, so the current run keeps the posture it began under.
   */
  advanceTier(): boolean;
}

export const BurnTierKey: InjectionKey<BurnTierApi> = Symbol(
  'cycler/burn-tier',
) as InjectionKey<BurnTierApi>;

let burnTier: BurnTierApi | null = null;

export function getBurnTier(): BurnTierApi {
  if (!burnTier) throw new Error('cycler/burn-tier: not installed yet');
  return burnTier;
}

export interface BurnTierModuleOptions {
  /** The salvo-posture ladder (pace surface). Defaults to `SALVO_POSTURES`. */
  posture?: readonly SalvoPosture[];
}

export function createBurnTierModule(options: BurnTierModuleOptions = {}): EngineModule {
  const postures = options.posture ?? SALVO_POSTURES;

  return {
    id: 'cycler/burn-tier',
    dependencies: ['cycler/tuning'],
    install(ctx) {
      const H = tunable(
        ctx.inject(CyclerTuningRegistryKey),
        'peg/headroom',
        () => DEFENSE_BALANCE.headroom,
      );

      // Per-posture pegged crossing in waves: N_c(posture) = log_g(H). H is shared
      // across the ladder (the peg is one knob); only g varies per posture. The
      // Δ_wall tail is measured (kernel `predictedRunLengthWaves`), not authored.
      const runLengthAt = (index: number): number => {
        const posture = postures[index];
        return Math.log(Number(unref(H))) / Math.log(posture.salvoBase);
      };
      const state = withPersistentContext('cycler/burn-tier', () => ({
        activeIndexRaw: persistent<number>(0, { id: 'active-index' }),
      }));

      const activeIndex = computed(() => Math.min(state.activeIndexRaw.value, postures.length - 1));
      const activeTier = computed(() => postures[activeIndex.value]);

      // Reach gate: the highest posture whose unlock threshold the permanent power
      // level L has reached. Postures are ordered by widening gate, so the last
      // satisfied index is the frontier.
      const unlockedIndex = computed(() => {
        const L = getBuild().powerLevel.value;
        let idx = 0;
        for (let i = 0; i < postures.length; i++) if (postures[i].unlockPowerLevel <= L) idx = i;
        return idx;
      });
      const canAdvance = computed(() => activeIndex.value < unlockedIndex.value);
      const nextUnlockPowerLevel = computed(() => {
        const next = activeIndex.value + 1;
        return next < postures.length ? postures[next].unlockPowerLevel : null;
      });

      const schedule = (): { salvoBase: number } => ({ salvoBase: activeTier.value.salvoBase });

      const advanceTier = (): boolean => {
        if (activeIndex.value >= unlockedIndex.value) return false; // still gated / exhausted
        state.activeIndexRaw.value = activeIndex.value + 1;
        return true;
      };

      const api: BurnTierApi = {
        activeIndex,
        activeTier,
        tierCount: postures.length,
        unlockedIndex,
        canAdvance,
        nextUnlockPowerLevel,
        schedule,
        runLengthAt,
        advanceTier,
      };
      burnTier = api;
      ctx.provide(BurnTierKey, api);
    },
  };
}
