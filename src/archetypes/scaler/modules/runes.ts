/**
 * Runes module — owns the offerings + base 5 rune substrate.
 *
 * Surfaces:
 * - `offerings` — Prestige-tier cumulative-across-prestige currency. Lifetime-
 *   tagged so `lifetime: true` flag on the underlying persistent (resource
 *   wrapped via `createResource`'s existing-ref overload) keeps it out of the
 *   prestige reset's automatic ref-zeroing scope.
 * - 5 per-rune EXP refs (`<rune>RuneEXP`), all lifetime-tagged. Levels are
 *   `computed` from EXP via the canonical curve `costCoefficient × (10^(L /
 *   levelsPerOOM) − 1)` (`Runes.ts:791-794` `computeEXPToLevel`); the inverse
 *   `floor(levelsPerOOM × log10(EXP/costCoefficient + 1))` lifts from
 *   `Runes.ts:874-885` `updateLevelsFromEXP` (with the +1 imprecision-fix
 *   branch).
 * - 5 per-rune effect computeds — each evaluates `def.effects(level)` against
 *   the live integer level. First-arc-active effect keys bind into coin
 *   producers' rateChains as named multiplicative grants; the rest port inert
 *   (canonical effect closures still evaluate, but no surface consumes them
 *   yet — see § Effect routing).
 * - `sacrifice(runeId, budget)` action — consumes offerings into the named
 *   rune's EXP at 1 EXP per offering (first-arc port: `universalRuneEXPMult`
 *   reads later-arc state and ports inert at identity 1 — `Runes.ts:309-351`).
 * - Offerings accrual on every prestige reset — subscribed to the prestige
 *   reset's `afterReset` event, lifting canonical `Reset.ts:406`'s
 *   `resetOfferings()` call. `prestigeReset.onReset` is a closure-bound option
 *   captured at construction (`reset.ts:303` references the destructured
 *   variable, not `this.onReset`), so post-construction subscription routes
 *   through the event emitter rather than a property mutation.
 *
 * Effect routing (per spec § 5 + walkthrough closure gate):
 * - Speed.multiplicativeAccelerators → coin producers' rateChain
 *   (named entry "Rune: Speed (mAcc)" surfaces in producer-row attribution).
 * - Duplication.multiplicativeMultipliers → coin producers' rateChain
 *   (named entry "Rune: Duplication (mMult)").
 * - Prism.productionLog10 → coin producers' rateChain via 10^x
 *   (named entry "Rune: Prism (10^prod)").
 * - SI.offeringMult → multiplies the offering accrual closure (not a chain).
 * - Speed.acceleratorPower / Speed.globalSpeed / Duplication.multiplierBoosts
 *   / Duplication.taxReduction / Prism.costDivisorLog10 / all Thrift effects
 *   / SI.obtainiumMult / SI.antSpeed — port inert at first arc. Effect
 *   closures still evaluate (computeds stay live for UI readout), but no
 *   surface consumes them. `TODO(expansion)` breadcrumbs at the bind site so
 *   later-arc systems pick them up.
 *
 * `firstFiveEffectiveRuneLevelMult` (`Runes.ts:282-288`) collapses to identity
 * 1 at first arc — the canonical reduce composes only later-arc multipliers
 * (corruption / talisman / blessing). Ports as a static `1` constant.
 *
 * Sacrifice loop is bespoke per spec § 7 — `createSacrificeProgression` is a
 * predicted engine gap awaiting a 2nd consumer (Skill / Stat / Cultivation
 * archetypes) before graduation. See
 * `open-loop-engine/docs/candidate-primitives.md` for the duplicate-means-
 * ticket entry.
 */

// TODO(expansion): graduate the offerings → per-rune EXP → integer level →
// multiplicative grant loop to a `createSacrificeProgression` engine helper
// once a 2nd consumer derives the same shape. Predicted at archetypes/scaler.md
// § 7. See `open-loop-engine/docs/candidate-primitives.md`.

import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Resource,
  type Persistent,
  createResource,
  persistent,
  addResource,
  subtractResource,
  createMultiplicativeModifier,
} from 'open-loop-engine';
import {
  SCALER_RUNES,
  SCALER_BALANCE,
  type RuneDef,
  type RuneId,
  type RuneEffectMap,
} from '../data';
import { getCoinProducers } from './coin';
import { getPrestigeReset } from './prestige';

// ============================================================================
// Module state (populated in install)
// ============================================================================

let offerings: Resource<DecimalSource>;
const runeEXP: Partial<Record<RuneId, Persistent<DecimalSource>>> = {};
const runeLevel: Partial<Record<RuneId, ComputedRef<number>>> = {};
const runeEffects: Partial<{ [K in RuneId]: ComputedRef<RuneEffectMap[K]> }> = {};

// Effective-level multiplier — canonical reduces over later-arc-only stats at
// first arc, so it collapses to 1. Ported as a constant rather than a computed
// to make the inert-port shape explicit.
const FIRST_FIVE_EFFECTIVE_RUNE_LEVEL_MULT = 1;

// Per-rune def lookup for accessor methods.
const RUNE_DEFS: { [K in RuneId]: RuneDef<K> } = {
  speed: SCALER_RUNES[0],
  duplication: SCALER_RUNES[1],
  prism: SCALER_RUNES[2],
  thrift: SCALER_RUNES[3],
  superiorIntellect: SCALER_RUNES[4],
};

// ============================================================================
// Public access
// ============================================================================

/** The offerings resource. Cumulative-across-prestige (lifetime-tagged). */
export function getOfferings(): Resource<DecimalSource> {
  return offerings;
}

/** Persistent EXP ref for a named rune. */
export function getRuneEXP(id: RuneId): Persistent<DecimalSource> {
  const ref = runeEXP[id];
  if (!ref) throw new Error(`Rune EXP not initialized: ${id}`);
  return ref;
}

/** Current integer level computed from EXP via the canonical curve. */
export function getRuneLevel(id: RuneId): ComputedRef<number> {
  const ref = runeLevel[id];
  if (!ref) throw new Error(`Rune level not initialized: ${id}`);
  return ref;
}

/** Live per-rune effect map (`def.effects(effectiveLevel)`). */
export function getRuneEffects<K extends RuneId>(id: K): ComputedRef<RuneEffectMap[K]> {
  const ref = runeEffects[id] as ComputedRef<RuneEffectMap[K]> | undefined;
  if (!ref) throw new Error(`Rune effects not initialized: ${id}`);
  return ref;
}

/** Read the rune def list (canonical sacrifice / display order). */
export function getRuneDefs(): readonly RuneDef[] {
  return SCALER_RUNES;
}

// ============================================================================
// EXP-from-level / level-from-EXP curve (canonical port)
// ============================================================================

/**
 * Total EXP required to reach a given level — `Runes.ts:791-794`
 * `computeEXPToLevel`. Inverse of `levelFromEXP`.
 */
export function computeEXPToLevel(rune: RuneId, level: number): DecimalSource {
  const def = RUNE_DEFS[rune];
  return Decimal.mul(def.costCoefficient, Decimal.pow(10, level / def.levelsPerOOM).sub(1));
}

/**
 * Floor integer level given accumulated EXP, with the canonical floating-
 * point imprecision fix from `Runes.ts:874-885`. When `EXP === computeEXPToLevel(level + 1)`
 * exactly but float math makes log10 evaluate just below an integer, level
 * promotes by 1.
 */
function levelFromEXP(rune: RuneId, exp: DecimalSource): number {
  const def = RUNE_DEFS[rune];
  const ratio = Decimal.div(exp, def.costCoefficient).add(1);
  const log10 = new Decimal(Decimal.log10(ratio)).toNumber();
  const levels = Math.floor(def.levelsPerOOM * log10);
  // Imprecision fix — promote when `levels + 1` is exactly attainable.
  const targetExp = computeEXPToLevel(rune, levels + 1);
  if (Decimal.eq(Decimal.sub(targetExp, exp), 0)) {
    return levels + 1;
  }
  return levels;
}

// ============================================================================
// Sacrifice action (canonical port — bespoke per spec § 7)
// ============================================================================

/**
 * Sacrifice a budget of offerings into a rune's EXP, recomputing level on
 * read. Lifts canonical `levelRune` (`Runes.ts:847-866`) shape: budget is the
 * cap on offerings spent; EXP-per-offering is `universalRuneEXPMult` which
 * reads later-arc state at canonical and ports inert at identity 1. First-arc
 * sacrifice consumes `min(offerings, budget)` and credits 1 EXP per offering.
 *
 * Returns the actual offerings consumed.
 */
export function sacrificeRune(runeId: RuneId, budget: DecimalSource): DecimalSource {
  const exp = runeEXP[runeId];
  if (!exp) return 0;

  const available = offerings.value;
  const spend = Decimal.min(available, budget);
  if (Decimal.lte(spend, 0)) return 0;

  // 1 EXP per offering at first arc — `universalRuneEXPMult` ports inert.
  const expGained = spend;
  const ok = subtractResource(offerings, spend);
  if (!ok) return 0;
  exp.value = Decimal.add(exp.value, expGained);
  return spend;
}

// ============================================================================
// Engine module
// ============================================================================

export const runesModule: EngineModule = {
  id: 'scaler-runes',
  dependencies: ['scaler-coin', 'scaler-prestige'],

  install(_ctx: EngineContext) {
    // ─── Offerings resource ────────────────────────────────────────────────
    // `lifetime: true` on the underlying persistent so the prestige reset's
    // module-scoped sweep skips it. Wrap with `createResource`'s existing-ref
    // overload to attach display metadata without re-creating the persistent.
    const offeringsRef = persistent<DecimalSource>(0, {
      name: 'offerings',
      lifetime: true,
    });
    offerings = createResource(offeringsRef, { displayName: 'offerings', precision: 0 });

    // ─── Per-rune EXP refs ─────────────────────────────────────────────────
    // All lifetime-tagged — rune progress survives every prestige reset per
    // spec § 5 ("Rune EXP and offerings are cumulative-across-prestige").
    for (const def of SCALER_RUNES) {
      runeEXP[def.id] = persistent<DecimalSource>(0, {
        name: `${def.id}RuneEXP`,
        lifetime: true,
      });
    }

    // ─── Per-rune level computeds + effect computeds ───────────────────────
    for (const def of SCALER_RUNES) {
      const expRef = runeEXP[def.id]!;
      const levelComputed = computed(() => {
        const base = levelFromEXP(def.id, expRef.value);
        // Effective level applies the shared multiplier (1 at first arc).
        return Math.floor(base * FIRST_FIVE_EFFECTIVE_RUNE_LEVEL_MULT);
      });
      runeLevel[def.id] = levelComputed;

      // Type widens through the partial map; concrete rune-id'd readers go
      // through `getRuneEffects(id)` which casts back to the keyed map shape.
      const effectsComputed = computed(() => def.effects(levelComputed.value));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (runeEffects as any)[def.id] = effectsComputed;
    }

    // ─── Chain bindings into coin producers' rateChains ────────────────────
    // First-arc-active rune effect keys bind as named multiplicative grants.
    // Inert keys evaluate but no surface consumes them — TODO(expansion)
    // breadcrumbs document the deferred routing.
    const speedFx = getRuneEffects('speed');
    const dupFx = getRuneEffects('duplication');
    const prismFx = getRuneEffects('prism');

    for (const entry of getCoinProducers().getAll()) {
      const chain = entry.producer.rateChain;
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => speedFx.value.multiplicativeAccelerators,
          description: 'Rune: Speed (mAcc)',
        }),
      });
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => dupFx.value.multiplicativeMultipliers,
          description: 'Rune: Duplication (mMult)',
        }),
      });
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => Decimal.pow(10, prismFx.value.productionLog10),
          description: 'Rune: Prism (10^prod)',
        }),
      });
      // TODO(expansion): bind Thrift's costDelay / Speed.acceleratorPower /
      // Speed.globalSpeed / Duplication.multiplierBoosts / Prism.costDivisorLog10
      // when later-arc surfaces (cost-chain, global-speed multiplier, etc.)
      // come online.
    }

    // ─── Offerings accrual on every prestige reset ─────────────────────────
    // Subscribe to `afterReset` rather than mutating `prestigeReset.onReset`
    // — the latter is closure-bound at construction (reset.ts:303 references
    // the destructured variable, not the property), so a runtime mutation
    // would silently no-op on subsequent resets.
    const prestigeReset = getPrestigeReset();
    const siFx = getRuneEffects('superiorIntellect');
    prestigeReset.on('afterReset', () => {
      const gain = Decimal.mul(SCALER_BALANCE.offeringBaseGain, siFx.value.offeringMult);
      addResource(offerings, gain);
    });
  },
};
