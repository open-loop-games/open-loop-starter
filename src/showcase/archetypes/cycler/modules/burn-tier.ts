import {
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { BURN_TIERS, THREAT_BALANCE, type BurnTier, type ThreatBalance } from '../data/threat';
import { getBuild } from './build';

/**
 * Burn-tier module — the escalation-content ladder (see `../IDENTITY.md`
 * § Growth ports, `addBurnTier`). It owns the PACE surface: a reach-gated sequence
 * of burn presets, each authoring its own `(g, T_g)`. The active tier's schedule
 * feeds the cycle kernel, which FREEZES it at run start (exactly like the W₀ peg),
 * so a tier switch applies to the next run and the crossing stays closed-form.
 *
 * It does NOT re-own the peg or the crossing — those are the kernel's. It supplies
 * one thing (the active `(g, T_g)`) and gates one action (`advanceTier`) behind
 * reach. Deeper tiers raise `g` — steeper escalation, a shorter/sharper run
 * (Increlution Part 3: the escalation base is the high-leverage lever). The reach
 * gate is the permanent power level L (the prestige currency's sink), so the pace
 * surface can never outrun the board-fill/power that must clear it.
 *
 * Advancement is DELIBERATE and manual (not derived from L), which is what keeps
 * the prestige decoupling invariant intact: raising power alone re-pegs to +0 run
 * length (within a tier the peg holds flat); only an explicit `advanceTier` — under
 * the gate — moves run length. That deliberate, gated pace move is precisely what
 * the later `addUpgrade` g-bender pushes back on.
 *
 * SCOPE: the pace surface only. A harder tier is a pure difficulty step here (it
 * even mints LESS currency, since production ∝ N* shrinks); the incentive to opt in
 * belongs to a per-tier yield multiplier / content gate a fork or the currency
 * layer adds. See `data/threat.ts` § Balance (burn tiers).
 */
export interface BurnTierApi {
  /** The active tier's index (0-based). Persistent, monotone via `advanceTier`. */
  activeIndex: ComputedRef<number>;
  /** The active tier's config. */
  activeTier: ComputedRef<BurnTier>;
  /** Total tiers in the ladder. */
  tierCount: number;
  /** Highest tier index reach (build power level L) has unlocked. */
  unlockedIndex: ComputedRef<number>;
  /** A higher tier is unlocked and not yet active — `advanceTier` would move. */
  canAdvance: ComputedRef<boolean>;
  /** Power level L that unlocks the next tier; null when at the last tier. */
  nextUnlockPowerLevel: ComputedRef<number | null>;
  /** The live burn schedule (active tier's g, T_g). The kernel freezes this at run start. */
  schedule(): { escalationBase: number; escalationTimescale: number };
  /** Closed-form authored run length for tier `index` under the shared peg (H, τ_setup). */
  runLengthAt(index: number): number;
  /**
   * Advance to the next tier if reach has unlocked it (L ≥ its gate). Returns
   * whether it moved (a no-op false when the next tier is still gated or the ladder
   * is exhausted). Takes effect at the NEXT run — the kernel freezes the schedule
   * at `startRun`, so the current run keeps the tier it began under.
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
  /** The burn-tier ladder (pace surface). Defaults to `BURN_TIERS`. */
  burnTier?: readonly BurnTier[];
  /** Shared peg constants (H, τ_setup) the per-tier run length is authored against. */
  threat?: ThreatBalance;
}

export function createBurnTierModule(options: BurnTierModuleOptions = {}): EngineModule {
  const tiers = options.burnTier ?? BURN_TIERS;
  const threat = options.threat ?? THREAT_BALANCE;
  const { headroom: H, setupGrace: setup } = threat;

  // Per-tier authored run length: N*(tier) = τ_setup + T_g·log_g(H). H and τ_setup
  // are shared across the ladder (the peg is one knob); only g/T_g vary per tier.
  const runLengthAt = (index: number): number => {
    const tier = tiers[index];
    return setup + tier.escalationTimescale * (Math.log(H) / Math.log(tier.escalationBase));
  };

  return {
    id: 'cycler/burn-tier',
    install(ctx) {
      const state = withPersistentContext('cycler/burn-tier', () => ({
        activeIndexRaw: persistent<number>(0, { name: 'active-index' }),
      }));

      const activeIndex = computed(() => Math.min(state.activeIndexRaw.value, tiers.length - 1));
      const activeTier = computed(() => tiers[activeIndex.value]);

      // Reach gate: the highest tier whose unlock threshold the permanent power
      // level L has reached. Tiers are ordered by widening gate, so the last
      // satisfied index is the frontier.
      const unlockedIndex = computed(() => {
        const L = getBuild().powerLevel.value;
        let idx = 0;
        for (let i = 0; i < tiers.length; i++) if (tiers[i].unlockPowerLevel <= L) idx = i;
        return idx;
      });
      const canAdvance = computed(() => activeIndex.value < unlockedIndex.value);
      const nextUnlockPowerLevel = computed(() => {
        const next = activeIndex.value + 1;
        return next < tiers.length ? tiers[next].unlockPowerLevel : null;
      });

      const schedule = (): { escalationBase: number; escalationTimescale: number } => ({
        escalationBase: activeTier.value.escalationBase,
        escalationTimescale: activeTier.value.escalationTimescale,
      });

      const advanceTier = (): boolean => {
        if (activeIndex.value >= unlockedIndex.value) return false; // still gated / exhausted
        state.activeIndexRaw.value = activeIndex.value + 1;
        return true;
      };

      const api: BurnTierApi = {
        activeIndex,
        activeTier,
        tierCount: tiers.length,
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
