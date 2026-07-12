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

/**
 * Build module — the saturating capacity ceiling D_max (see `../IDENTITY.md`
 * § The rate-function spine). Placement-Adjacency on a FINITE grid: each placed
 * producer outputs `baseOutputCeiling`, lifted by an adjacency synergy that grows
 * from 1 (a lone producer, no neighbours) to `adjacencyBoost` at full board.
 * Permanent power scales everything by `producerUpgradeRatio^L`.
 *
 * The load-bearing property (the multiverse-hr #17 correction): capacity is
 * BOUNDED — the finite board caps it at
 * `D_max = boardCells · baseOutputCeiling · adjacencyBoost · producerUpgradeRatio^L`.
 * That hard cap is what makes the burn crossing LOGARITHMIC (`N* = τ_setup +
 * T_g·log_g(D_max/W₀)`), not a geometric race. `D_max` climbs geometrically in the
 * PERMANENT level L (reach across prestige) but is fixed within a run.
 *
 * TODO(expansion): the within-run convergent reinvestment ladder (per-producer
 * output ∝ spend^`reinvestOutputExponent`, `data/upgrades.ts`) is a deferred
 * fidelity layer — the crossing needs only the BOUNDED ceiling, which the finite
 * board already provides. Add it when the placement puzzle earns per-unit depth.
 */
export interface BuildApi {
  /** Permanent power level L (prestige-carried). D_max ∝ producerUpgradeRatio^L. */
  powerLevel: ComputedRef<number>;
  /** Producers placed on the board this run (0..boardCells). */
  placed: ComputedRef<number>;
  /** Current within-run capacity — rises with placement, bounded by D_max. */
  capacity: ComputedRef<Decimal>;
  /** Saturated ceiling at the current L (full board). The peg's D_max. */
  dMax: ComputedRef<Decimal>;
  /** Placement-grid size (the saturation source). */
  boardCells: number;
  /** Place one producer. Returns false if the board is full. */
  placeProducer(): boolean;
  /** Fill the board to capacity — the setup-grace rebuild (automation/UI). */
  fillBoard(): void;
  /** Raise permanent power by one level (called at prestige). Reach, not pacing. */
  raisePower(): void;
  /** Clear placements for a new run; permanent level L survives. */
  resetRun(): void;
}

export const BuildKey: InjectionKey<BuildApi> = Symbol('cycler/build') as InjectionKey<BuildApi>;

let build: BuildApi | null = null;

export function getBuild(): BuildApi {
  if (!build) throw new Error('cycler/build: not installed yet');
  return build;
}

export interface BuildModuleOptions {
  build?: BuildBalance;
}

export function createBuildModule(options: BuildModuleOptions = {}): EngineModule {
  const data = options.build ?? BUILD_BALANCE;
  const { boardCells, baseOutputCeiling, adjacencyBoost, producerUpgradeRatio } = data;

  return {
    id: 'cycler/build',
    install(ctx) {
      const state = withPersistentContext('cycler/build', () => ({
        placed: persistent<number>(0, { name: 'placed' }),
        powerLevel: persistent<number>(0, { name: 'power-level' }),
      }));

      // Adjacency synergy: 1 for a lone producer (no neighbours), rising to the
      // full `adjacencyBoost` once the board is filled. Finite board ⇒ it runs
      // out of neighbours to synergize with — the saturation source.
      const adjacencyAt = (p: number): number =>
        p <= 1 ? 1 : 1 + (adjacencyBoost - 1) * ((p - 1) / (boardCells - 1));

      const powerMult = computed(() => Decimal.pow(producerUpgradeRatio, state.powerLevel.value));
      const capacityFor = (p: number): Decimal =>
        powerMult.value.mul(baseOutputCeiling).mul(p).mul(adjacencyAt(p));

      const capacity = computed(() => capacityFor(state.placed.value));
      const dMax = computed(() => capacityFor(boardCells)); // full-board ceiling

      const placeProducer = (): boolean => {
        if (state.placed.value >= boardCells) return false;
        state.placed.value += 1;
        return true;
      };
      const fillBoard = (): void => {
        state.placed.value = boardCells;
      };
      const raisePower = (): void => {
        state.powerLevel.value += 1;
      };
      const resetRun = (): void => {
        state.placed.value = 0;
      };

      const api: BuildApi = {
        powerLevel: computed(() => state.powerLevel.value),
        placed: computed(() => state.placed.value),
        capacity,
        dMax,
        boardCells,
        placeProducer,
        fillBoard,
        raisePower,
        resetRun,
      };
      build = api;
      ctx.provide(BuildKey, api);
    },
  };
}
