/**
 * Transcend tier module — owns the transcend substrate of the Scaler archetype.
 *
 * Surfaces:
 * - `transcendPoints` (cumulative across transcend; in `keep:`).
 * - `transcendShards` (per-cycle; zeroes on every transcend reset).
 * - `coinsThisTranscension` (per-cycle counter — accumulates per-tick coin
 *   emission so the transcend conversion's gain formula reads coins-earned-
 *   this-cycle, not the live coin balance, matching `Synergism.ts:3185`).
 *   Survives prestige reset (only zeroes on transcend reset per
 *   `Reset.ts:482`'s `coinsThisTranscension = new Decimal('100')` inside the
 *   transcend path), so the persistent ref is owned by this module rather
 *   than the prestige module.
 * - `transcendCount` (number — increments inside `transcendConversion.afterConvert`).
 *   Read by transcend upgrade 43's grant builder; lifetime-tagged so it
 *   survives the transcend reset that fires on conversion.
 * - Mythos producer category (5 rows). Mythos-1 emits to `transcendShards`
 *   directly via the engine's continuous tick; mythos-2..5 are
 *   `trigger: 'manual'` so tickContinuousProducer skips them, and their
 *   `computedRate × count` feeds the cascade hand-roll below
 *   (`Synergism.ts:3274-3285`). The cascade is unconditional canonical —
 *   no upgrade-gate (contrast with coin tier `upgrades[101..105]`).
 *   Identical pattern to leaf 2's diamond cascade.
 * - Transcend-upgrades category (band 41-60) — same `UpgradeDef` shape as the
 *   coin band 1-20 / prestige band 21-40, costs `transcendPoints`. Resets on
 *   transcend (band falls out of `resetModules` walking — the engine sweeps
 *   the transcend module's persistent refs on reset).
 * - Transcend reset bundling `['scaler-coin', 'scaler-prestige', 'scaler-transcend']`
 *   with `keep: [transcendPoints, transcendCount]`. Note the canonical
 *   inversion from prestige reset's `keep: [prestigePoints]` — transcend
 *   reset zeros `prestigePoints` (`Reset.ts:504`).
 * - Transcend conversion gated via `anyOf(coinsThresholdRequirement,
 *   booleanRequirement(gainGteFloor))` — canonical disjunction lift from
 *   `Synergism.ts:3631-3633` mirroring leaf 2's prestige conversion shape.
 *   Gain formula uses `createPolynomialFormula(transcendPow, transcendDivisor)`
 *   from the engine — `Synergism.ts:3583-3585` is `floor((c/1e100)^0.03)`,
 *   exactly the polynomial-with-sub-1-exponent shape `createPolynomialFormula`
 *   exposes (`open-loop-engine/src/systems/conversion.ts:256-263`).
 *
 * Cross-tier modifier bindings (transcend upgrades into coin / mythos
 * rateChains) flow through `composables/scaler-game-state.ts`'s
 * `expandUpgradeGrant` — the transcend module imports `getCoinProducers`
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
  type ProducerCategory,
  type PurchasableCategory,
  type Reset,
  type Conversion,
  type Persistent,
  createResource,
  createProducerCategory,
  createPurchasableCategory,
  createCostRequirement,
  createBooleanRequirement,
  anyOf,
  createReset,
  createConversion,
  createPolynomialFormula,
  persistent,
} from 'open-loop-engine';
import {
  MYTHOS_PRODUCERS,
  TRANSCEND_UPGRADES,
  SCALER_BALANCE,
  type ProducerDef,
  type UpgradeDef,
  type ScalerGameState,
} from '../data';
import { buildScalerGameState, expandUpgradeGrant } from '../composables/scaler-game-state';
import { getCoinResource, getCoinProducers } from './coin';

// ============================================================================
// Module state (populated in install)
// ============================================================================

let transcendPoints: Resource<DecimalSource> & Persistent<DecimalSource>;
let transcendShards: Resource<DecimalSource> & Persistent<DecimalSource>;
let coinsThisTranscension: Persistent<DecimalSource>;
let transcendCount: Persistent<number>;

let firstGeneratedMythos: Persistent<DecimalSource>;
let secondGeneratedMythos: Persistent<DecimalSource>;
let thirdGeneratedMythos: Persistent<DecimalSource>;
let fourthGeneratedMythos: Persistent<DecimalSource>;

let mythosCategory: ProducerCategory<ProducerDef, void>;
let transcendUpgradesCategory: PurchasableCategory<UpgradeDef, void>;
let transcendResetRef: Reset;
let transcendConversion: Conversion;

let transcendPointGainComputed: ComputedRef<DecimalSource>;

// ============================================================================
// Public access
// ============================================================================

export function getTranscendPoints(): Resource<DecimalSource> {
  return transcendPoints;
}

export function getTranscendShards(): Resource<DecimalSource> {
  return transcendShards;
}

export function getCoinsThisTranscension(): Persistent<DecimalSource> {
  return coinsThisTranscension;
}

export function getTranscendCount(): Persistent<number> {
  return transcendCount;
}

export function getMythosProducers(): ProducerCategory<ProducerDef, void> {
  return mythosCategory;
}

export function getTranscendUpgrades(): PurchasableCategory<UpgradeDef, void> {
  return transcendUpgradesCategory;
}

export function getTranscendReset(): Reset {
  return transcendResetRef;
}

export function getTranscendConversion(): Conversion {
  return transcendConversion;
}

/**
 * Reactive readout of the conversion's expected gain at the current
 * `coinsThisTranscension` — the canonical `transcendPointGain` formula
 * (`Synergism.ts:3583-3585`). Read by both the threshold disjunction and the
 * conversion's output-amount closure.
 */
export function getTranscendPointGain(): ComputedRef<DecimalSource> {
  return transcendPointGainComputed;
}

// ============================================================================
// Engine module
// ============================================================================

export const transcendModule: EngineModule = {
  id: 'scaler-transcend',
  dependencies: ['scaler-coin', 'scaler-prestige'],

  install(ctx: EngineContext) {
    const coins = getCoinResource();

    // ─── Resources ─────────────────────────────────────────────────────────
    transcendPoints = createResource(0, { displayName: 'transcend points', precision: 0 });
    transcendShards = createResource(0, { displayName: 'transcend shards', precision: 0 });

    // Per-cycle coin counter. Default 100 mirrors canonical `Reset.ts:482`
    // (resets to 100 inside the transcend path, not 0). Used as the input to
    // `transcendPointGain` so spending coins on producers doesn't disqualify
    // the player from transcending.
    coinsThisTranscension = persistent<DecimalSource>(100, { name: 'coinsThisTranscension' });

    // Conversion counter — incremented inside `afterConvert`. Lifetime-tagged
    // so it survives the transcend reset that fires immediately after.
    transcendCount = persistent<number>(0, { name: 'transcendCount', lifetime: true });

    // Cascade-feed accumulators per `Synergism.ts:3274-3285`. Mythos-1's
    // `extraCount` reads `firstGeneratedMythos`, etc. Mythos-5 has no
    // upstream source so no `fifthGeneratedMythos` ref is needed.
    firstGeneratedMythos = persistent<DecimalSource>(0, { name: 'firstGeneratedMythos' });
    secondGeneratedMythos = persistent<DecimalSource>(0, { name: 'secondGeneratedMythos' });
    thirdGeneratedMythos = persistent<DecimalSource>(0, { name: 'thirdGeneratedMythos' });
    fourthGeneratedMythos = persistent<DecimalSource>(0, { name: 'fourthGeneratedMythos' });

    // ─── Mythos producer category ──────────────────────────────────────────
    // Mythos-1: `trigger: 'continuous'` emits to `transcendShards` via
    // tickContinuousProducer. Mythos-2..5: `trigger: 'manual'` so the
    // engine's continuous tick skips them (we never call .activate()); their
    // computedRate × count is read by the cascade onTick handler below.
    const generatedByPosition: Record<number, () => DecimalSource> = {
      1: () => firstGeneratedMythos.value,
      2: () => secondGeneratedMythos.value,
      3: () => thirdGeneratedMythos.value,
      4: () => fourthGeneratedMythos.value,
      5: () => 0,
    };

    mythosCategory = createProducerCategory<ProducerDef>({
      id: 'mythos-producers',
      registerTick: ctx.onTick,
      mapProducer: (def) => ({
        resource: transcendShards,
        baseRate: def.baseRate,
        trigger: def.position === 1 ? 'continuous' : 'manual',
        display: def.name,
        purchase: {
          costResource: transcendPoints,
          baseCost: def.baseCost,
          costScaling: def.costScaling,
        },
        extraCount: () => generatedByPosition[def.position](),
      }),
    });
    mythosCategory.register(MYTHOS_PRODUCERS);

    // ─── Transcend upgrades category (band 41-60) ──────────────────────────
    const gameState: ScalerGameState = buildScalerGameState();
    transcendUpgradesCategory = createPurchasableCategory<UpgradeDef>({
      id: 'transcend-upgrades',
      mapPurchasable: (def) => {
        const grants = def.effects
          .map((e) => expandUpgradeGrant(e, gameState))
          .filter((g): g is NonNullable<typeof g> => g !== undefined);
        return {
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: transcendPoints,
            cost: Decimal.pow(10, def.costLog),
          }),
          limit: 1,
          grants,
        };
      },
    });
    transcendUpgradesCategory.register(TRANSCEND_UPGRADES);

    // ─── Per-tick mirrors: coinsThisTranscension + mythos cascade ──────────
    // Coin emission mirror — every tick, accumulate sum-of-coin-rates × dt
    // into `coinsThisTranscension`. Independent of the live `coins` balance
    // (which spending reduces) and of `coinsThisPrestige` (which zeros on
    // prestige); transcend eligibility tracks earnings since the last
    // transcend, not the last prestige.
    //
    // Mythos cascade — produceXMythos × dt accumulates into (X-1)Generated.
    // Engine-side ordering: producer-category-tick (which emits
    // transcendShards from mythos-1 reading firstGeneratedMythos.value
    // *before* this handler updates it) registers first via the category's
    // setupCategoryTick; this onTick registers after, so each tick uses the
    // previous tick's cascade output — a single-tick lag, equivalent to
    // canonical's per-frame cascade.
    ctx.onTick((dt: number) => {
      const coinRate = getCoinProducers().getTotalRate(coins);
      if (Decimal.gt(coinRate, 0)) {
        coinsThisTranscension.value = Decimal.add(
          coinsThisTranscension.value,
          Decimal.mul(coinRate, dt),
        );
      }

      const m2 = mythosCategory.getProducer('mythos-2');
      const m3 = mythosCategory.getProducer('mythos-3');
      const m4 = mythosCategory.getProducer('mythos-4');
      const m5 = mythosCategory.getProducer('mythos-5');

      if (m5) {
        const rate = Decimal.mul(m5.computedRate.value, m5.count.value);
        if (Decimal.gt(rate, 0)) {
          fourthGeneratedMythos.value = Decimal.add(
            fourthGeneratedMythos.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (m4) {
        const rate = Decimal.mul(m4.computedRate.value, m4.count.value);
        if (Decimal.gt(rate, 0)) {
          thirdGeneratedMythos.value = Decimal.add(
            thirdGeneratedMythos.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (m3) {
        const rate = Decimal.mul(m3.computedRate.value, m3.count.value);
        if (Decimal.gt(rate, 0)) {
          secondGeneratedMythos.value = Decimal.add(
            secondGeneratedMythos.value,
            Decimal.mul(rate, dt),
          );
        }
      }
      if (m2) {
        const rate = Decimal.mul(m2.computedRate.value, m2.count.value);
        if (Decimal.gt(rate, 0)) {
          firstGeneratedMythos.value = Decimal.add(
            firstGeneratedMythos.value,
            Decimal.mul(rate, dt),
          );
        }
      }
    });

    // ─── transcendPointGain formula ────────────────────────────────────────
    // Canonical (`Synergism.ts:3583-3585`):
    //   transcendPointGain = floor((coinsThisTranscension / 1e100) ^ transcendPow)
    // Engine's `createPolynomialFormula(exponent, scale)` evaluates
    // `floor((x/scale)^exponent)` — exact match. First-arc port omits the
    // upgrade-44 / corruption / deflation modifiers that compound on top in
    // canonical (upgrade 44 deferred — see `data/upgrades.ts § Skeleton`).
    const transcendGainFormula = createPolynomialFormula(
      SCALER_BALANCE.transcendPow,
      SCALER_BALANCE.transcendDivisor,
    );
    transcendPointGainComputed = computed(
      (): DecimalSource => transcendGainFormula(coinsThisTranscension.value),
    );

    // ─── Transcend reset ───────────────────────────────────────────────────
    // Bundles coin + prestige + transcend scope. `keep: [transcendPoints,
    // transcendCount]` — without transcendPoints in keep, `afterConvert →
    // transcendReset.reset()` would zero them one tick after the conversion
    // writes them (`conversion.ts:204-211`). transcendCount stays in keep
    // for symmetry — its lifetime tag would protect it on its own, but
    // listing it explicit documents intent.
    //
    // Canonical inversion from prestige reset's `keep: [prestigePoints]`:
    // here `prestigePoints` is *omitted* from keep, so the prestige module's
    // refs zero on transcend (`Reset.ts:504` `prestigePoints = new Decimal('0')`).
    transcendResetRef = createReset({
      resetModules: ['scaler-coin', 'scaler-prestige', 'scaler-transcend'],
      keep: [transcendPoints, transcendCount],
    });

    // ─── Transcend conversion ──────────────────────────────────────────────
    // Threshold disjunction lifts canonical `Synergism.ts:3631-3633`:
    // `coinsThisTranscension >= 1e100 OR transcendPointGain >= 0.5`. The
    // coin-threshold branch is a pure gate (no payment — canonical doesn't
    // subtract coins on transcend; the reset zeros them via `resetModules`),
    // and the gain-floor branch is a pure boolean. Both branches are
    // non-pay, so anyOf invokes nothing at convert-time. The reset wipe is
    // the actual "spend." First-arc port omits the in-challenge guard
    // (`player.currentChallenge.transcension === 0`) — challenges land in
    // leaf 6.
    transcendConversion = createConversion({
      inputs: {
        threshold: anyOf(
          createCostRequirement({
            resource: coins,
            cost: SCALER_BALANCE.transcendThreshold,
            requiresPay: false,
          }),
          createBooleanRequirement({
            requirement: () =>
              Decimal.gte(transcendPointGainComputed.value, SCALER_BALANCE.transcendGainFloor),
          }),
        ),
      },
      outputs: {
        transcendPoints: {
          resource: transcendPoints,
          amount: () => transcendPointGainComputed.value,
        },
      },
      afterConvert: () => {
        transcendCount.value += 1;
        transcendResetRef.reset();
      },
    });
  },
};
