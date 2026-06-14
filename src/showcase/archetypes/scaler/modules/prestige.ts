/**
 * Prestige tier module — owns the prestige substrate of the Scaler archetype.
 *
 * Surfaces:
 * - `prestigePoints` (cumulative across prestige; in `keep:`).
 * - `prestigeShards` (per-cycle; zeroes on every prestige reset).
 * - `coinsThisPrestige` (per-cycle counter — accumulates per-tick coin
 *   emission so the prestige conversion's gain formula reads coins-earned-
 *   this-cycle, not the live coin balance, matching `Synergism.ts:3184`).
 * - Diamond producer category (5 rows). Diamond-1 emits to `prestigeShards`
 *   directly via the engine's continuous tick; diamond-2..5 are
 *   `trigger: 'manual'` so tickContinuousProducer skips them, and their
 *   `computedRate × count` feeds the cascade hand-roll below
 *   (`Synergism.ts:3227-3238`). The cascade is unconditional canonical —
 *   no upgrade-gate (contrast with coin tier `upgrades[101..105]`).
 * - Crystal upgrade group (8 rows) — uses the new `costFormula` opt on
 *   `createScalingPurchasable` (OL-894) for super-exponential cost
 *   `10^(baseLogCost + costIncrement·((n-0.5)²/2 - 1/8))` per `Buy.ts:657-694`.
 *   Levels reset on prestige (`Reset.ts:1442+1449`); not in `keep:`.
 * - Prestige-upgrades category (band 21-40) — same `UpgradeDef` shape as the
 *   coin band 1-20, costs `prestigePoints`. Resets on prestige
 *   (`Reset.ts:1430-1432`).
 * - Prestige reset bundling `['scaler-coin', 'scaler-prestige']` with
 *   `keep: [prestigePoints]` — the load-bearing `keep:` exemption preserves
 *   the gain currency the conversion just wrote (`conversion.ts:204-211`).
 * - Prestige conversion gated via `anyOf(coinsThresholdRequirement,
 *   createBooleanRequirement({ requirement: gainGteFloor }))` — canonical disjunction lift from
 *   `Synergism.ts:3620` enabled by the OL-893 combinators.
 *
 * Cross-tier modifier bindings (Crystal upgrades into coin / diamond
 * rateChains) flow through `composables/scaler-game-state.ts`'s
 * `expandUpgradeGrant` — the prestige module imports `getCoinProducers`
 * indirectly through the shared accessor, keeping module-level imports
 * one-way.
 */

import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Resource,
  type Purchasable,
  type ProducerCategory,
  type PurchasableCategory,
  type Reset,
  type Conversion,
  type Persistent,
  bn,
  createResource,
  createProducerCategory,
  createPurchasableCategory,
  createScalingPurchasable,
  createCostRequirement,
  createBooleanRequirement,
  anyOf,
  allOf,
  createReset,
  createConversion,
  persistent,
} from '@open-loop/engine';
import {
  DIAMOND_PRODUCERS,
  CRYSTAL_UPGRADES,
  PRESTIGE_UPGRADES,
  type ProducerDef,
  type UpgradeDef,
  type ScalerGameState,
} from '../data';

// Canonical Synergism prestige conversion constants
// (`open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts`):
//   :3563-3565  prestigePointGain = floor((coinsThisPrestige / 1e12) ^ 0.5)
//   :3620       prestige threshold disjunction
//               (coinsThisPrestige ≥ 1e16 OR PP gain ≥ 100)
// First-arc port omits upgrade-16 / corruption / deflation modifiers that
// compound on top in canonical — they bind in their respective leaves.
const CANONICAL_PRESTIGE_DIVISOR = 1e12;
const CANONICAL_PRESTIGE_POW = 0.5;
const CANONICAL_PRESTIGE_THRESHOLD = 1e16;
const CANONICAL_PRESTIGE_GAIN_FLOOR = 100;
import { buildScalerGameState, expandUpgradeGrant } from '../composables/scaler-game-state';
import { getCoinResource, getCoinProducers } from './coin';
import { getChallengesCategory } from './challenges';

/**
 * Lazy sibling-import accessor returning Ch5's active state + its completion
 * count. Resolved at gain-formula call time (post-install) — challenges
 * module installs after prestige but `prestigePointGainComputed` is a Vue
 * `computed` evaluated lazily on `.value` reads, so first access happens after
 * the engine's full install pass completes.
 */
function ch5State(): { active: boolean; completions: number } {
  try {
    const ch = getChallengesCategory()?.getChallenge('challenge-5');
    if (!ch) return { active: false, completions: 0 };
    return { active: ch.active.value, completions: ch.completions.value };
  } catch {
    return { active: false, completions: 0 };
  }
}

/**
 * Lazy guard for the in-challenge transcend disjunction. Returns true iff
 * any transcend challenge is currently entered. Coordinated with leaf 5's
 * deferred guard: prestige + transcend conversions short-circuit during
 * any challenge run (Ch5 in particular crushes gain near zero, but the
 * guard applies uniformly — canonical `Synergism.ts:3633` adds the
 * `currentChallenge.transcension === 0` predicate to the prestige gate).
 */
function inAnyTranscensionChallenge(): boolean {
  try {
    return getChallengesCategory()?.active.value !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// Module state (populated in install)
// ============================================================================

let prestigePoints: Resource<DecimalSource> & Persistent<DecimalSource>;
let prestigeShards: Resource<DecimalSource> & Persistent<DecimalSource>;
let coinsThisPrestige: Persistent<DecimalSource>;
let prestigeCount: Persistent<number>;

let firstGeneratedDiamonds: Persistent<DecimalSource>;
let secondGeneratedDiamonds: Persistent<DecimalSource>;
let thirdGeneratedDiamonds: Persistent<DecimalSource>;
let fourthGeneratedDiamonds: Persistent<DecimalSource>;

let diamondCategory: ProducerCategory<ProducerDef, void>;
let crystalUpgradeList: Purchasable[];
let prestigeUpgradesCategory: PurchasableCategory<UpgradeDef, void>;
let prestigeReset: Reset;
let prestigeConversion: Conversion;

// ============================================================================
// Public access
// ============================================================================

export function getPrestigePoints(): Resource<DecimalSource> {
  return prestigePoints;
}

export function getPrestigeShards(): Resource<DecimalSource> {
  return prestigeShards;
}

export function getCoinsThisPrestige(): Persistent<DecimalSource> {
  return coinsThisPrestige;
}

/**
 * Prestige conversion count. Increments inside `prestigeConversion.afterConvert`.
 * Lifetime-tagged so it survives the prestige reset that fires immediately after.
 */
export function getPrestigeCount(): Persistent<number> {
  return prestigeCount;
}

export function getDiamondProducers(): ProducerCategory<ProducerDef, void> {
  return diamondCategory;
}

export function getCrystalUpgrades(): Purchasable[] {
  return crystalUpgradeList;
}

export function getPrestigeUpgrades(): PurchasableCategory<UpgradeDef, void> {
  return prestigeUpgradesCategory;
}

export function getPrestigeReset(): Reset {
  return prestigeReset;
}

export function getPrestigeConversion(): Conversion {
  return prestigeConversion;
}

/**
 * Reactive readout of the conversion's expected gain at the current
 * `coinsThisPrestige` — the canonical `prestigePointGain` formula
 * (`Synergism.ts:3563-3565`). Read by both the threshold disjunction and the
 * conversion's output-amount closure.
 */
export function getPrestigePointGain(): ComputedRef<DecimalSource> {
  return prestigePointGainComputed;
}

let prestigePointGainComputed: ComputedRef<DecimalSource>;

// ============================================================================
// Crystal cost closure
// ============================================================================

/**
 * Canonical Crystal cost (`Buy.ts:657-694`) — super-exponential in level.
 * `n` is the next-purchase index = current level + 1; the formula evaluates
 * at level n's cost.
 */
function crystalCost(
  baseLogCost: number,
  costIncrement: number,
  level: DecimalSource,
): DecimalSource {
  const n = bn(level).toNumber() + 1;
  const adj = n - 0.5;
  const exponent = baseLogCost + costIncrement * ((adj * adj) / 2 - 1 / 8);
  return Decimal.pow(10, exponent);
}

// ============================================================================
// Engine module
// ============================================================================

export const prestigeModule: EngineModule = {
  id: 'scaler-prestige',
  dependencies: ['scaler-coin'],

  install(ctx: EngineContext) {
    const coins = getCoinResource();

    // ─── Resources ─────────────────────────────────────────────────────────
    prestigePoints = createResource(0, { displayName: 'prestige points', precision: 0 });
    prestigeShards = createResource(0, { displayName: 'prestige shards', precision: 0 });

    // Per-cycle coin counter. Default 100 mirrors canonical `Reset.ts:409`
    // (resets to 100, not 0). Used as the input to `prestigePointGain` so
    // spending coins on producers doesn't disqualify the player from prestige.
    coinsThisPrestige = persistent<DecimalSource>(100, { name: 'coinsThisPrestige' });

    // Conversion counter — incremented inside `afterConvert`. Lifetime-tagged
    // so it survives the prestige reset that fires immediately after.
    prestigeCount = persistent<number>(0, { name: 'prestigeCount', lifetime: true });

    // Cascade-feed accumulators per `Synergism.ts:3227-3238`. Diamond-1's
    // `extraCount` reads `firstGeneratedDiamonds`, etc. Diamond-5 has no
    // upstream source so no `fifthGeneratedDiamonds` ref is needed.
    firstGeneratedDiamonds = persistent<DecimalSource>(0, { name: 'firstGeneratedDiamonds' });
    secondGeneratedDiamonds = persistent<DecimalSource>(0, { name: 'secondGeneratedDiamonds' });
    thirdGeneratedDiamonds = persistent<DecimalSource>(0, { name: 'thirdGeneratedDiamonds' });
    fourthGeneratedDiamonds = persistent<DecimalSource>(0, { name: 'fourthGeneratedDiamonds' });

    // ─── Diamond producer category ─────────────────────────────────────────
    // Diamond-1: `trigger: 'continuous'` emits to `prestigeShards` via
    // tickContinuousProducer. Diamond-2..5: `trigger: 'manual'` so the
    // engine's continuous tick skips them (we never call .activate()); their
    // computedRate × count is read by the cascade onTick handler below.
    const generatedByPosition: Record<number, () => DecimalSource> = {
      1: () => firstGeneratedDiamonds.value,
      2: () => secondGeneratedDiamonds.value,
      3: () => thirdGeneratedDiamonds.value,
      4: () => fourthGeneratedDiamonds.value,
      5: () => 0,
    };

    diamondCategory = createProducerCategory<ProducerDef>({
      id: 'diamond-producers',
      registerTick: ctx.onTick,
      mapProducer: (def) => ({
        resource: prestigeShards,
        baseRate: def.baseRate,
        trigger: def.position === 1 ? 'continuous' : 'manual',
        display: def.name,
        purchase: {
          costResource: prestigePoints,
          baseCost: def.baseCost,
          costScaling: def.costScaling,
        },
        extraCount: () => generatedByPosition[def.position](),
      }),
    });
    diamondCategory.register(DIAMOND_PRODUCERS);

    // ─── Crystal upgrades ──────────────────────────────────────────────────
    // 8 leveled purchasables sharing the super-exponential cost shape via the
    // engine's `costFormula` opt (OL-894). The mirror+watch wiring that
    // leaf 1 hand-rolled for Accelerator/Multiplier moved inside
    // `createScalingPurchasable` — consumers don't see it.
    crystalUpgradeList = CRYSTAL_UPGRADES.map((def) =>
      createScalingPurchasable({
        id: def.id,
        title: def.name,
        description: def.description,
        resource: prestigeShards,
        costFormula: (level: DecimalSource) =>
          crystalCost(def.baseLogCost, def.costIncrement, level),
        // Effects ship inert at first arc — see `data/prestige.ts` § Skeleton.
      }),
    );

    // ─── Prestige upgrades category (band 21-40) ───────────────────────────
    const gameState: ScalerGameState = buildScalerGameState();
    prestigeUpgradesCategory = createPurchasableCategory<UpgradeDef>({
      id: 'prestige-upgrades',
      mapPurchasable: (def) => {
        const grants = def.effects
          .map((e) => expandUpgradeGrant(e, gameState))
          .filter((g): g is NonNullable<typeof g> => g !== undefined);
        return {
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: prestigePoints,
            cost: Decimal.pow(10, def.costLog),
          }),
          limit: 1,
          grants,
        };
      },
    });
    prestigeUpgradesCategory.register(PRESTIGE_UPGRADES);

    // ─── Per-tick mirrors: coinsThisPrestige + diamond cascade ─────────────
    // Coin emission mirror — every tick, accumulate sum-of-coin-rates × dt
    // into `coinsThisPrestige`. Independent of the live `coins` balance
    // (which spending reduces), so prestige eligibility tracks earnings.
    //
    // Diamond cascade — produceXDiamonds × dt accumulates into
    // (X-1)Generated. Engine-side ordering: producer-category-tick (which
    // emits prestigeShards from diamond-1 reading firstGeneratedDiamonds.value
    // *before* this handler updates it) registers first via the category's
    // setupCategoryTick; this onTick registers after, so each tick uses the
    // previous tick's cascade output — a single-tick lag, equivalent to
    // canonical's per-frame cascade.
    ctx.onTick((dt: number) => {
      // Sum coin rate × count across the coin tier — canonical ticks coins
      // through `produceTotal = sum(produceFirst..Fifth)`, so coinsThisPrestige
      // tracks the same per-tick number. `getTotalRate(coins)` walks all coin
      // producers emitting to `coins`.
      const coinRate = getCoinProducers().getTotalRate(coins);
      if (Decimal.gt(coinRate, 0)) {
        coinsThisPrestige.value = Decimal.add(coinsThisPrestige.value, Decimal.mul(coinRate, dt));
      }

      const d2 = diamondCategory.getProducer('diamond-2');
      const d3 = diamondCategory.getProducer('diamond-3');
      const d4 = diamondCategory.getProducer('diamond-4');
      const d5 = diamondCategory.getProducer('diamond-5');

      if (d5) {
        const rate = Decimal.mul(d5.computedRate.value, d5.count.value);
        if (Decimal.gt(rate, 0)) {
          fourthGeneratedDiamonds.value = Decimal.add(
            fourthGeneratedDiamonds.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (d4) {
        const rate = Decimal.mul(d4.computedRate.value, d4.count.value);
        if (Decimal.gt(rate, 0)) {
          thirdGeneratedDiamonds.value = Decimal.add(
            thirdGeneratedDiamonds.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (d3) {
        const rate = Decimal.mul(d3.computedRate.value, d3.count.value);
        if (Decimal.gt(rate, 0)) {
          secondGeneratedDiamonds.value = Decimal.add(
            secondGeneratedDiamonds.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (d2) {
        const rate = Decimal.mul(d2.computedRate.value, d2.count.value);
        if (Decimal.gt(rate, 0)) {
          firstGeneratedDiamonds.value = Decimal.add(
            firstGeneratedDiamonds.value,
            Decimal.mul(rate, dt),
          );
        }
      }
    });

    // ─── prestigePointGain formula ─────────────────────────────────────────
    // Canonical (`Synergism.ts:3563-3565`):
    //   prestigePointGain = floor((coinsThisPrestige / 1e12) ^ prestigePow)
    // First-arc port omits the upgrade-16 / corruption / deflation modifiers
    // that compound on top in canonical — they bind in their respective leaves.
    //
    // Ch5 active crushes the exponent toward zero per canonical
    // `Synergism.ts:3563-3565` (the `prestigePow` ref reads from a per-tick
    // Variables update that swaps `0.5` for `0.01 / (1 + completions[5])`
    // when `currentChallenge.transcension === 5`). Engine-side: read Ch5
    // state at evaluation time and substitute the crushed exponent. Out of
    // challenge, evaluates to canonical `prestigePow`.
    prestigePointGainComputed = computed((): DecimalSource => {
      const c = coinsThisPrestige.value;
      const ratio = Decimal.div(c, CANONICAL_PRESTIGE_DIVISOR);
      if (Decimal.lte(ratio, 0)) return Decimal.dZero;
      const ch5 = ch5State();
      const pow = ch5.active ? 0.01 / (1 + ch5.completions) : CANONICAL_PRESTIGE_POW;
      return Decimal.floor(Decimal.pow(ratio, pow));
    });

    // ─── Prestige reset ────────────────────────────────────────────────────
    // Bundles coin + prestige scope. `keep: [prestigePoints]` is load-bearing
    // — without it, `afterConvert → prestigeReset.reset()` zeros prestigePoints
    // one tick after the conversion writes them (`conversion.ts:204-211`).
    prestigeReset = createReset({
      resetModules: ['scaler-coin', 'scaler-prestige'],
      keep: [prestigePoints],
    });

    // ─── Prestige conversion ───────────────────────────────────────────────
    // Threshold disjunction lifts canonical `Synergism.ts:3620`:
    // `coinsThisPrestige >= 1e16 OR prestigePointGain >= 100`. The
    // coin-threshold branch is a pure gate (no payment — canonical doesn't
    // subtract coins on prestige; the reset zeros them via `resetModules`),
    // and the gain-floor branch is a pure boolean. `anyOf` first-satisfied-pays
    // semantics line up: both branches are non-pay, so anyOf invokes nothing
    // at convert-time. The reset wipe is the actual "spend."
    //
    // In-challenge guard (deferred from leaf 5; load-bearing once Ch5 lands).
    // Canonical `Synergism.ts:3633` adds `&& player.currentChallenge.transcension === 0`
    // to the prestige gate. AND-composed via `allOf` so the disjunction
    // remains semantically anyOf-of-thresholds, gated overall on
    // not-in-any-transcend-challenge. Without this, Ch5 active would
    // auto-prestige with crushed gain (~0 PP per cycle).
    prestigeConversion = createConversion({
      inputs: {
        threshold: allOf(
          anyOf(
            createCostRequirement({
              resource: coins,
              cost: CANONICAL_PRESTIGE_THRESHOLD,
              requiresPay: false,
            }),
            createBooleanRequirement({
              requirement: () =>
                Decimal.gte(prestigePointGainComputed.value, CANONICAL_PRESTIGE_GAIN_FLOOR),
            }),
          ),
          createBooleanRequirement({
            requirement: () => !inAnyTranscensionChallenge(),
          }),
        ),
      },
      outputs: {
        prestigePoints: {
          resource: prestigePoints,
          amount: () => prestigePointGainComputed.value,
        },
      },
      afterConvert: () => {
        prestigeCount.value += 1;
        prestigeReset.reset();
      },
    });
  },
};
