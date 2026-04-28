import { computed, type ComputedRef } from 'vue';
import {
  createSkill,
  createSkillCategory,
  Decimal,
  Formula,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type LevelDrivenSkill,
  type Persistent,
  type SkillCategory,
} from 'open-loop-engine';
import type { CapabilityDef, LooperData } from '../data/types';

/**
 * Per-capability state. Two tiers with different roles per the canonical
 * Looper shape:
 *
 * - **`level`** — XP-driven skill that resets per loop (cleared via
 *   `thingsToReset` in `loop.ts`). Reduces action cost via
 *   `1 + level / costDivisor` in `actions.ts`. The within-loop "skills get
 *   cheaper as you train them" feel.
 *
 * - **`talent`** — XP-driven skill that persists across loops (kept via the
 *   loop's retention policy). Talent does NOT directly reduce cost — it
 *   multiplies the per-completion XP-gain rate, so cross-loop compounding
 *   flows through *faster Level training* in subsequent runs. The
 *   "loop N+1 starts faster" feel is thus mediated by Talent → faster Level
 *   ramp → cheaper actions.
 *
 * `talentMult` is the live multiplier (`1 + sqrt(talentLevel) / 5`, the
 * vanilla canonical curve). Read by the action-completion XP path and by
 * the capability panel readout.
 */
export interface LooperCapabilityState {
  level: LevelDrivenSkill;
  talent: LevelDrivenSkill;
  talentMult: ComputedRef<DecimalSource>;
}

export const CapabilitiesKey: InjectionKey<SkillCategory<CapabilityDef, LooperCapabilityState>> =
  Symbol('looper/capabilities') as InjectionKey<
    SkillCategory<CapabilityDef, LooperCapabilityState>
  >;

/**
 * Single-axis capability category — Level + Talent two-tier role split lives
 * inside `mapState`. `mapSkill` builds the Level tier; `mapState` builds the
 * Talent tier alongside it (within the category's per-def persistent context,
 * so talent.xp lives at `looper/capabilities/<id>/skill:<id>-talent/xp`).
 *
 * The XP curves are sqrt-based — `level = floor(sqrt(xp) / 2)` — matching
 * idle-loops vanilla. The level-to-multiplier returns the level itself for
 * Level (downstream formulas read the bare level via `state.level.level.value`);
 * Talent's multiplier is the canonical `1 + sqrt(talentLevel) / 5` curve.
 *
 * `level.xp` is added to retention's `thingsToReset` indirectly via the
 * engine's `Loop` reset walking persistent refs; `talent.xp` is included in
 * the retention policy's `keep` list (built lazily in `loop.ts`).
 */
export function createCapabilitiesModule(data: LooperData): EngineModule {
  return {
    id: 'looper/capabilities',
    dependencies: ['looper/mana'],
    install(ctx) {
      const capabilities = createSkillCategory<CapabilityDef, LooperCapabilityState>({
        id: 'looper/capabilities',
        mapSkill: (def) => ({
          xpToLevel: (xp) => Formula.variable(xp).max(1).sqrt().div(2).floor(),
          levelToMultiplier: (level) => level,
          description: `${def.name} (Level)`,
        }),
        mapState: (def, levelSkill) => {
          const talent = createSkill({
            id: `${def.id}-talent`,
            xpToLevel: (xp) => Formula.variable(xp).max(1).sqrt().div(2).floor(),
            levelToMultiplier: (level) => level,
            description: `${def.name} (Talent)`,
          });

          // Vanilla canonical: 1 + sqrt(talentLevel) / 5.
          const talentMult = computed<DecimalSource>(() => {
            const tl = new Decimal(talent.level.value);
            if (tl.lte(0)) return 1;
            return tl.sqrt().div(5).add(1);
          });

          return {
            level: levelSkill as LevelDrivenSkill,
            talent,
            talentMult,
          };
        },
      });

      capabilities.register(data.capabilities);

      ctx.provide(CapabilitiesKey, capabilities);
    },
  };
}

/**
 * Award XP to a capability — Level full amount, Talent fractional (per
 * `balance.talentAccrualRatio`). Called by `actions.ts`'s tick dispatcher on
 * action completion. Per-grant the canonical formula already multiplied
 * `talentMult` into the Level XP; this helper splits the result across tiers
 * without re-applying the multiplier.
 */
export function grantCapabilityXp(
  capabilities: SkillCategory<CapabilityDef, LooperCapabilityState>,
  capabilityId: string,
  amount: DecimalSource,
  talentAccrualRatio: DecimalSource,
): void {
  const state = capabilities.getState(capabilityId);
  if (!state) return;
  state.level.addXp(amount);
  state.talent.addXp(Decimal.mul(amount, talentAccrualRatio));
}

/** Helper for cross-module retention-key collection — talent.xp refs in registration order. */
export function getTalentXpRefs(
  capabilities: SkillCategory<CapabilityDef, LooperCapabilityState>,
): Persistent<DecimalSource>[] {
  return capabilities.getAll().map((entry) => entry.state.talent.xp);
}
