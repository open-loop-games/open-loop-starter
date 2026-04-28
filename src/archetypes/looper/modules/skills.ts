import { computed, type ComputedRef, type Ref } from 'vue';
import {
  createSkill,
  createSkillCategory,
  createSequentialModifier,
  Decimal,
  Formula,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type LevelDrivenSkill,
  type Modifier,
  type Persistent,
  type SkillCategory,
} from 'open-loop-engine';
import type { LooperData, SkillDef } from '../data/types';
import { LooperTuningRegistryKey } from './mana';

/**
 * Per-skill state attached to each registered SkillDef. `gen` and `instinct`
 * are each `LevelDrivenSkill` instances, both XP-driven via Formula curves.
 * `gen` resets per loop (added to retention's `thingsToReset` shape via
 * `loop.ts`); `instinct` persists across loops via the retention policy's
 * `keep` list. The composite `totalModifier` chain sequences gen × instinct
 * (extension targets — tool, global — wire onto the shared `chainMods` array
 * in fork-extension code).
 */
export interface LooperSkillState {
  gen: LevelDrivenSkill;
  instinct: LevelDrivenSkill;
  /** Composite chain modifier — gen × instinct, multiplicative. */
  totalModifier: Modifier;
  /** Effective multiplier (apply(1)) — used by retention readouts and balance probes. */
  effectiveMultiplier: ComputedRef<DecimalSource>;
}

export const SkillsKey: InjectionKey<SkillCategory<SkillDef, LooperSkillState>> = Symbol(
  'looper/skills',
) as InjectionKey<SkillCategory<SkillDef, LooperSkillState>>;

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

/**
 * Two-tier (gen + instinct) skill category — the load-bearing shape lifted
 * from `incloneution/src/modules/skills.ts:47-118`. `mapSkill` builds the gen
 * tier; `mapState` builds the instinct tier alongside it (within the
 * category's per-def persistent context, so instinct.xp lives at
 * `looper/skills/<id>/skill:<id>-instinct/xp`). The composite chain is the
 * fork-extension target — adding a tool-bonus or global-bonus modifier means
 * pushing onto the `mods` array in this module, not introducing a new
 * primitive.
 *
 * The XP curves are sqrt-based — `level = floor(sqrt(xp / divisor))` —
 * matching idle-loops vanilla. The level-to-multiplier curve is the doc
 * retention shape `1 + (level / retentionDivisor) ^ retentionExponent`,
 * applied uniformly to both tiers; gen and instinct differ only in which
 * level feeds the curve. The cost-acceleration path in `actions.ts` consumes
 * `instinct.modifier` directly so retentionExponent perturbations flow into
 * sim-time.
 *
 * `gen.xp` is added to retention's `thingsToReset` indirectly via the engine's
 * `Loop` reset walking persistent refs; `instinct.xp` is included in the
 * retention policy's `keep` list (built lazily in `loop.ts`).
 */
export function createSkillsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/skills',
    dependencies: ['looper/mana'],
    install(ctx) {
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      // Retention curve constants — wrapped once so both gen and instinct
      // Formula instances close over the same scope-aware refs. pushScope
      // on either key retunes the curve everywhere it's evaluated.
      const retentionDivisor = asRef(
        tunable<DecimalSource>(
          tuningRegistry,
          'balance/retentionDivisor',
          () => data.balance.retentionDivisor,
        ),
      );
      const retentionExponent = asRef(
        tunable<DecimalSource>(
          tuningRegistry,
          'balance/retentionExponent',
          () => data.balance.retentionExponent,
        ),
      );

      const skills = createSkillCategory<SkillDef, LooperSkillState>({
        id: 'looper/skills',
        mapSkill: (def) => ({
          xpToLevel: (xp) => Formula.variable(xp).div(50).max(1).sqrt().floor(),
          levelToMultiplier: (level) =>
            Formula.variable(level).div(retentionDivisor).pow(retentionExponent).add(1),
          description: `${def.name} (gen)`,
        }),
        mapState: (def, genSkill) => {
          const instinct = createSkill({
            id: `${def.id}-instinct`,
            xpToLevel: (xp) => Formula.variable(xp).div(50).max(1).sqrt().floor(),
            levelToMultiplier: (level) =>
              Formula.variable(level).div(retentionDivisor).pow(retentionExponent).add(1),
            description: `${def.name} (instinct)`,
          });

          const mods: Modifier[] = [genSkill.modifier, instinct.modifier];
          const totalModifier = createSequentialModifier(mods);
          const effectiveMultiplier = computed<DecimalSource>(() => totalModifier.apply(1));

          return {
            gen: genSkill as LevelDrivenSkill,
            instinct,
            totalModifier,
            effectiveMultiplier,
          };
        },
      });

      skills.register(data.skills);

      ctx.provide(SkillsKey, skills);
    },
  };
}

/**
 * Award XP to a skill — gen full amount, instinct scaled by
 * `balance.instinctXpRatio`. Called by `actions.ts`'s tick dispatcher on
 * action completion.
 */
export function grantSkillXp(
  skills: SkillCategory<SkillDef, LooperSkillState>,
  skillId: string,
  amount: DecimalSource,
  instinctRatio: DecimalSource,
): void {
  const state = skills.getState(skillId);
  if (!state) return;
  state.gen.addXp(amount);
  state.instinct.addXp(Decimal.mul(amount, instinctRatio));
}

/** Helper for cross-module retention-key collection — instinct refs in registration order. */
export function getInstinctXpRefs(
  skills: SkillCategory<SkillDef, LooperSkillState>,
): Persistent<DecimalSource>[] {
  return skills.getAll().map((entry) => entry.state.instinct.xp);
}
