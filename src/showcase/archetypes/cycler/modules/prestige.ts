import {
  Decimal,
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { PRESTIGE_BALANCE, type PrestigeBalance } from '../data/prestige';
import { UPGRADE_BALANCE, type UpgradeBalance } from '../data/upgrades';
import { getCycle } from './cycle';
import { getBuild } from './build';

/**
 * Prestige (Merge) layer — the boundary that CLOSES the Cycler loop (see
 * `../IDENTITY.md` § Growth ports, `addPrestigeLayer`). The kernel already ends a
 * run at the burn crossing; this layer turns that ending into progress:
 *
 *   run-end (crossing) → PAYOUT (auto-bank sublinear currency) → buy REACH
 *   (raise permanent power, D_max ×ratio) → RE-PEG (W₀ = D_max/H, restart clock).
 *
 * It ORCHESTRATES existing wiring, it does not rebuild it: `build.raisePower()`
 * raises the permanent level L and `cycle.startRun()` re-pegs W₀ from the current
 * D_max. The +0-run-length-after-re-peg invariant is the kernel's (locked in
 * `sim/build.test.ts`); prestige is the sequence around it.
 *
 * The Merge bell is a payout, NOT a fail state (Industry-Idle, not Thronefall):
 * the run ALWAYS pays out on the crossing, which is what lets the exogenous burn
 * guarantee termination without punishing the player.
 *
 * Two design decisions this layer commits (studio/open-loop-starter#7):
 *   1. Payout auto-banks on the `runState==='ended'` crossing; the player spends
 *      the banked currency between runs. (IDENTITY: run-end always pays out.)
 *   2. The BASE power purchase lives here — the minimal spend that closes the loop
 *      and lets reach climb (without it the prestige probe can't show D_max rising
 *      while run length stays flat). The later `addUpgrade` port generalizes to a
 *      CATALOG of permanents on this same wallet (adding the gated g-bender — the
 *      sole pacing lever); it does not re-own this base reach purchase.
 *
 * Currency shape (grounded in multiverse-hr `merge.ts`, studio/multiverse-hr#17):
 * a sublinear cube-root of run output, summed PER SOURCE (not pooled before the
 * root) so each source's diminishing returns bite independently:
 *
 *   fragments = ⌊∛(production / S_p)⌋ + ⌊∛(endurance / S_s)⌋
 *
 * with production = ∫ capacity dt (throughput) and endurance = ∫ burn dt (pressure
 * weathered) — two run-long accumulators, both ∝ D_max, so banked currency climbs
 * sublinearly across merges as D_max climbs.
 */
export interface PrestigeApi {
  /** Spendable banked currency (Fragments). Rises on payout, falls on power buys. */
  fragments: ComputedRef<Decimal>;
  /** Lifetime Fragments ever banked (never spent down) — the reach-climb signal. */
  lifetimeFragments: ComputedRef<Decimal>;
  /** Run-long production accumulator ∫ capacity dt (primary source), reset per run. */
  runOutput: ComputedRef<Decimal>;
  /** Run-long endurance accumulator ∫ burn dt (secondary source), reset per run. */
  runEndurance: ComputedRef<Decimal>;
  /** Fragments the current run has accrued so far — monotone over a run. */
  pendingFragments: ComputedRef<Decimal>;
  /** Merges performed (prestige count). */
  mergeCount: ComputedRef<number>;
  /** Cost of the next power level: mergeQuorum · powerUpgradeCostRatio^L. */
  nextPowerCost: ComputedRef<Decimal>;
  /** Whether the wallet can afford the next power level right now. */
  canRaisePower: ComputedRef<boolean>;
  /** The sublinear payout for a given run output — the cbrt-per-source transform. */
  fragmentsFor(production: Decimal, endurance: Decimal): Decimal;
  /**
   * The Merge: buy one power level if affordable (reach, not pacing), then re-peg
   * (restart the run at the possibly-raised D_max). Returns whether power rose.
   * A no-op that returns false unless the run has ended (the bell must ring first).
   */
  merge(): boolean;
}

export const PrestigeKey: InjectionKey<PrestigeApi> = Symbol(
  'cycler/prestige',
) as InjectionKey<PrestigeApi>;

let prestige: PrestigeApi | null = null;

export function getPrestige(): PrestigeApi {
  if (!prestige) throw new Error('cycler/prestige: not installed yet');
  return prestige;
}

export interface PrestigeModuleOptions {
  prestige?: PrestigeBalance;
  upgrade?: UpgradeBalance;
}

/**
 * `Decimal.root(x, 3)` computes pow(x, 1/3), so exact cubes land a hair under
 * their true value (∛8 ≈ 1.9999…); nudge before flooring. Same fix as
 * multiverse-hr's `sublinearFragments`.
 *
 * TODO(expansion): the sublinear-per-source prestige payout (this `⌊∛(total/scale)⌋`
 * with the +1e-9 root nudge) is a candidate engine primitive at N=2 (mv-hr
 * `merge.ts` + this). See `candidate-primitives.md` § "Sublinear-per-source
 * prestige payout" — the nudge wants a primitives-layer `Decimal.rootExact`, the
 * floor-sum a `createPrestigeCurrency` facade.
 */
function sublinear(total: Decimal, scale: number): Decimal {
  if (total.lte(0)) return new Decimal(0);
  return Decimal.floor(Decimal.root(total.div(scale), 3).add(1e-9));
}

export function createPrestigeModule(options: PrestigeModuleOptions = {}): EngineModule {
  const data = options.prestige ?? PRESTIGE_BALANCE;
  const upgrade = options.upgrade ?? UPGRADE_BALANCE;
  const { fragmentScalePrimary, fragmentScaleSecondary, mergeQuorum } = data;
  const { powerUpgradeCostRatio } = upgrade;

  const fragmentsFor = (production: Decimal, endurance: Decimal): Decimal =>
    sublinear(production, fragmentScalePrimary).add(sublinear(endurance, fragmentScaleSecondary));

  return {
    id: 'cycler/prestige',
    install(ctx) {
      // Persistent meta + run state. `banked` guards against double-paying one
      // ended run (and, flipped, signals a fresh run needs its accumulators
      // zeroed) — so a save/reload mid-`ended` never re-banks. Accumulators are
      // run-scoped strings (the local Decimal-as-string pattern, cf. cycle.ts).
      const state = withPersistentContext('cycler/prestige', () => ({
        fragmentsRaw: persistent<string>('0', { name: 'fragments' }),
        lifetimeRaw: persistent<string>('0', { name: 'lifetime-fragments' }),
        outputRaw: persistent<string>('0', { name: 'run-output' }),
        enduranceRaw: persistent<string>('0', { name: 'run-endurance' }),
        banked: persistent<boolean>(false, { name: 'banked' }),
        mergeCountRaw: persistent<number>(0, { name: 'merge-count' }),
      }));

      const fragments = computed(() => new Decimal(state.fragmentsRaw.value));
      const lifetimeFragments = computed(() => new Decimal(state.lifetimeRaw.value));
      const runOutput = computed(() => new Decimal(state.outputRaw.value));
      const runEndurance = computed(() => new Decimal(state.enduranceRaw.value));
      const pendingFragments = computed(() => fragmentsFor(runOutput.value, runEndurance.value));
      const mergeCount = computed(() => state.mergeCountRaw.value);

      // Next power level costs mergeQuorum · ratio^L — the quorum is the L=0 price
      // (first competent run banks it, cf. multiverse-hr's first-merge anchor);
      // the geometric ratio makes later levels save-across-runs. Power is REACH:
      // under the peg raising D_max re-baselines W₀, so it buys zero run length.
      const nextPowerCost = computed(() =>
        new Decimal(mergeQuorum).mul(
          Decimal.pow(powerUpgradeCostRatio, getBuild().powerLevel.value),
        ),
      );
      const canRaisePower = computed(() => fragments.value.gte(nextPowerCost.value));

      // The run accumulators + auto-bank, driven by the live kernel. While a run
      // is live, integrate throughput (capacity) and pressure weathered (burn) in
      // minutes — the spine's time unit, matching `cycle.burnAt`. On the ended
      // crossing, auto-bank the payout once (the Merge bell). On the ended→running
      // transition (a Merge, or a direct startRun) reset the run accumulators, so
      // this stays correct regardless of who restarts the clock.
      ctx.onTick((dt) => {
        const cycle = getCycle();
        if (cycle.runState.value === 'running') {
          if (state.banked.value) {
            state.outputRaw.value = '0';
            state.enduranceRaw.value = '0';
            state.banked.value = false;
          }
          const dtMinutes = dt / 60;
          // Throughput = the capacity the kernel actually races the burn against
          // (cycle.capacity = the operative D_max, whatever wires into it), NOT
          // build.capacity (live placement, 0 until a fork adds a placement loop).
          state.outputRaw.value = runOutput.value
            .add(cycle.capacity.value.mul(dtMinutes))
            .toString();
          state.enduranceRaw.value = runEndurance.value
            .add(cycle.burn.value.mul(dtMinutes))
            .toString();
        } else if (!state.banked.value) {
          const payout = pendingFragments.value;
          state.fragmentsRaw.value = fragments.value.add(payout).toString();
          state.lifetimeRaw.value = lifetimeFragments.value.add(payout).toString();
          state.banked.value = true;
        }
      });

      const merge = (): boolean => {
        const cycle = getCycle();
        const build = getBuild();
        if (cycle.runState.value !== 'ended') return false; // the bell must ring first
        let raised = false;
        if (fragments.value.gte(nextPowerCost.value)) {
          state.fragmentsRaw.value = fragments.value.sub(nextPowerCost.value).toString();
          build.raisePower(); // D_max ×ratio — reach, re-pegged below to +0 run length
          raised = true;
        }
        build.resetRun(); // clear placements; permanent level L survives
        cycle.startRun(); // re-peg W₀ = D_max/H, zero the clock (accumulators reset next tick)
        state.mergeCountRaw.value += 1;
        return raised;
      };

      const api: PrestigeApi = {
        fragments,
        lifetimeFragments,
        runOutput,
        runEndurance,
        pendingFragments,
        mergeCount,
        nextPowerCost,
        canRaisePower,
        fragmentsFor,
        merge,
      };
      prestige = api;
      ctx.provide(PrestigeKey, api);
    },
  };
}
