import {
  Decimal,
  integerRoot,
  persistent,
  withPersistentContext,
  createResource,
  addResource,
  type DecimalSource,
  type Resource,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { PRESTIGE_BALANCE, type PrestigeBalance } from '../data/prestige';
import { getCycle } from './cycle';
import { getBuild } from './build';

/**
 * Prestige (Merge) layer — the boundary that CLOSES the Cycler loop (see
 * `../IDENTITY.md` § Growth ports, `addPrestigeLayer`). The kernel ends a run at
 * the burn crossing; this layer turns that ending into progress:
 *
 *   run-end (crossing) → PAYOUT (auto-bank sublinear currency) → the player buys
 *   REACH from the upgrade catalog between runs → merge() RE-PEGS (W₀ = D_max/H,
 *   restart the clock) for the next run.
 *
 * The Merge bell is a payout, NOT a fail state (Industry-Idle, not Thronefall):
 * the run ALWAYS pays out on the crossing, which is what lets the exogenous burn
 * guarantee termination without punishing the player.
 *
 * Two design decisions this layer commits (studio/open-loop-starter#6, #7):
 *   1. Payout auto-banks on the `runState==='ended'` crossing; the player spends
 *      the banked currency between runs. (IDENTITY: run-end always pays out.)
 *   2. Spending is OWNED BY THE UPGRADE CATALOG. `merge()` is re-peg-only — reach
 *      is a freely-sold catalog permanent (`modules/upgrades.ts`), not a buy folded
 *      into the Merge. (This supersedes the earlier "the base power buy lives in the
 *      prestige layer" split, now that the wallet is an engine Resource the catalog
 *      spends via `createCostRequirement`; see `data/prestige.ts` § Balance.)
 *
 * The wallet is an engine `Resource` — auto-persisted, registered for
 * balance-workbench discovery, with a built-in `cumulative` tracker that IS
 * `lifetimeFragments` (it accrues on payout and is untouched by spends).
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
  /** Spendable banked currency (Fragments), as a Decimal view. */
  fragments: ComputedRef<Decimal>;
  /** The Fragments engine Resource — the wallet the upgrade catalog spends. */
  fragmentsResource: Resource<DecimalSource>;
  /** Lifetime Fragments ever banked (the resource's `cumulative` tracker) — the reach-climb signal. */
  lifetimeFragments: ComputedRef<Decimal>;
  /** Run-long production accumulator ∫ capacity dt (primary source), reset per run. */
  runOutput: ComputedRef<Decimal>;
  /** Run-long endurance accumulator ∫ burn dt (secondary source), reset per run. */
  runEndurance: ComputedRef<Decimal>;
  /** Fragments the current run has accrued so far — monotone over a run. */
  pendingFragments: ComputedRef<Decimal>;
  /** Merges performed (prestige count). */
  mergeCount: ComputedRef<number>;
  /** The sublinear payout for a given run output — the cbrt-per-source transform. */
  fragmentsFor(production: Decimal, endurance: Decimal): Decimal;
  /**
   * The Merge bell → next run: re-peg (restart the run at the current D_max).
   * Reach is bought separately from the upgrade catalog between runs; this only
   * re-pegs. Returns whether it re-pegged (false unless the run has ended — the
   * bell must ring first).
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
}

/** The cbrt-per-source transform: ⌊∛(total/scale)⌋, floored via the engine's
 *  scale-robust integer root (see consumer-guide § Sublinear per-source payouts). */
function sublinear(total: Decimal, scale: number): Decimal {
  return integerRoot(total.div(scale), 3);
}

export function createPrestigeModule(options: PrestigeModuleOptions = {}): EngineModule {
  const data = options.prestige ?? PRESTIGE_BALANCE;
  const { fragmentScalePrimary, fragmentScaleSecondary } = data;

  const fragmentsFor = (production: Decimal, endurance: Decimal): Decimal =>
    sublinear(production, fragmentScalePrimary).add(sublinear(endurance, fragmentScaleSecondary));

  return {
    id: 'cycler/prestige',
    install(ctx) {
      // Persistent meta + run state. `banked` guards against double-paying one
      // ended run (and, flipped, signals a fresh run needs its accumulators
      // zeroed) — so a save/reload mid-`ended` never re-banks. Accumulators are
      // run-scoped strings (the local Decimal-as-string pattern, cf. cycle.ts).
      // `wallet` is the graduated Fragments Resource; its `cumulative` tracker is
      // lifetimeFragments.
      const state = withPersistentContext('cycler/prestige', () => ({
        wallet: createResource<DecimalSource>(0, { displayName: 'fragments', precision: 0 }),
        outputRaw: persistent<string>('0', { name: 'run-output' }),
        enduranceRaw: persistent<string>('0', { name: 'run-endurance' }),
        banked: persistent<boolean>(false, { name: 'banked' }),
        mergeCountRaw: persistent<number>(0, { name: 'merge-count' }),
      }));

      const wallet = state.wallet;
      const fragments = computed(() => new Decimal(wallet.value));
      const lifetimeFragments = computed(() => new Decimal(wallet.cumulative?.value ?? 0));
      const runOutput = computed(() => new Decimal(state.outputRaw.value));
      const runEndurance = computed(() => new Decimal(state.enduranceRaw.value));
      const pendingFragments = computed(() => fragmentsFor(runOutput.value, runEndurance.value));
      const mergeCount = computed(() => state.mergeCountRaw.value);

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
          // Auto-bank the payout. addResource grows the wallet (and, via its sync
          // watch, the cumulative tracker == lifetimeFragments); spends never
          // touch cumulative, so it stays exactly lifetime-banked.
          addResource(wallet, pendingFragments.value);
          state.banked.value = true;
        }
      });

      const merge = (): boolean => {
        const cycle = getCycle();
        const build = getBuild();
        if (cycle.runState.value !== 'ended') return false; // the bell must ring first
        build.resetRun(); // clear placements; permanent level L survives
        cycle.startRun(); // re-peg W₀ = D_max/H, zero the clock (accumulators reset next tick)
        state.mergeCountRaw.value += 1;
        return true;
      };

      const api: PrestigeApi = {
        fragments,
        fragmentsResource: wallet,
        lifetimeFragments,
        runOutput,
        runEndurance,
        pendingFragments,
        mergeCount,
        fragmentsFor,
        merge,
      };
      prestige = api;
      ctx.provide(PrestigeKey, api);
    },
  };
}
