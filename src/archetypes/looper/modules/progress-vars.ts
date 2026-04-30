import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  Formula,
  createSkillCategory,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type LevelDrivenSkill,
  type Persistent,
  type SkillCategory,
} from 'open-loop-engine';
import type { LooperData, ProgressVarDef } from '../data/types';
import { LooperTuningRegistryKey, type LooperTunables } from './mana';
import { RegularVarsKey } from './regular-vars';

// Manapot-driver pair: `roam → cache` carries the manapot pool's primary
// sizing contribution. Wrapped via `tunable()` so the leaf-5
// `manapot-perceptibility` probe has a perturbation channel. Other (progressVar,
// regularVar) pairs pass through unwrapped — keeps the tunable surface tight
// (mirrors the `TUNABLE_MANA_COST_IDS` selectivity in `actions.ts`).
const TUNABLE_PERLEVEL_PAIRS = new Set<string>(['roam:cache']);

function pairKey(progressVarId: string, regularVarId: string): string {
  return `${progressVarId}:${regularVarId}`;
}

/**
 * Per-progressVar state. ProgressVars are level-driven skills with persistent
 * XP that survives the loop reset (kept by retention policy in `loop.ts`).
 * Unlike capabilities, level does NOT multiply cost or XP rate — it sizes
 * regularVar pools via the def's `scales` table. Wander-shape, generalized.
 *
 * `level.modifier` is unused (we only read `level.level.value`); the
 * `levelToMultiplier: (level) => level` curve exists to satisfy the
 * level-driven skill contract — the canonical Looper coupling reads the bare
 * level rather than a multiplier.
 */
export interface LooperProgressVarState {
  level: LevelDrivenSkill;
}

export const ProgressVarsKey: InjectionKey<SkillCategory<ProgressVarDef, LooperProgressVarState>> =
  Symbol('looper/progress-vars') as InjectionKey<
    SkillCategory<ProgressVarDef, LooperProgressVarState>
  >;

/**
 * ProgressVars use a second `createSkillCategory` instance — same engine
 * primitive as capabilities, different role:
 *
 * - **Capabilities** — Level resets per loop and multiplies cost reduction;
 *   Talent persists and multiplies XP gain rate.
 * - **ProgressVars** — XP persists across loops; level sizes regularVar pools
 *   via the `scales` table (Wander × 5 → Pots; Forest × 5 + Shortcut × 2 → Herbs).
 *
 * The XP curve mirrors vanilla idle-loops progress vars (`zones.ts:476`):
 * `level = floor((sqrt(8 × xp / 100 + 1) - 1) / 2)` → `xpForLevel(N) = 50N(N+1)`.
 * Distinct from capabilities' `floor(sqrt(xp)/2)` curve (`xpForLevel(N) = 4N²`)
 * — progress vars need a flatter ramp because their XP grants are large
 * fixed values (`progressAmount: 200`/completion) rather than the
 * cost-derived sub-1 capability XP. The level-up callback closes over the regularVars
 * module's `setRegularTotal`; on any contributor's level-up, every affected
 * regularVar (every entry in the changed progressVar's `scales` table)
 * recomputes its `total` by summing `level × perLevel` across all
 * contributors.
 *
 * Multi-axis: when `forage` has two contributors (`trail × 5` + `mark × 2`),
 * either contributor's level-up triggers a recompute; the recompute walks
 * every progressVar's `scales` table and sums all entries that reference
 * `forage`. Mirrors `idle-loops-ng/src/modules/zones.ts:441,445` — both
 * `Forest` and `Shortcut` callbacks compute `setRegularTotal('Herbs',
 * Forest * 5 + Shortcut * 2)`.
 */
export function createProgressVarsModule(data: LooperData): EngineModule {
  return {
    id: 'looper/progress-vars',
    dependencies: ['looper/regular-vars'],
    install(ctx) {
      const regularVars = ctx.inject(RegularVarsKey);
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      // Capture data in closure so the level-up callback can iterate every
      // progressVar's scales table at recompute time. Local lookup is faster
      // than category traversal during recompute.
      const allDefs = data.progressVars;

      // Pre-build per-pair perLevel readers. Gated entries route through
      // `tunable()` for solver pushScope; ungated entries are static refs.
      const perLevelReaders = new Map<string, ComputedRef<DecimalSource>>();
      for (const def of allDefs) {
        for (const scale of def.scales) {
          const key = pairKey(def.id, scale.regularVarId);
          const reader: ComputedRef<DecimalSource> = TUNABLE_PERLEVEL_PAIRS.has(key)
            ? tunable<DecimalSource>(
                tuningRegistry,
                `progressVars/${def.id}/scales/${scale.regularVarId}/perLevel` as keyof LooperTunables,
                () => scale.perLevel,
              )
            : computed(() => scale.perLevel);
          perLevelReaders.set(key, reader);
        }
      }

      function recomputeRegularVarTotal(regularVarId: string): void {
        let total = new Decimal(0);
        for (const def of allDefs) {
          const scale = def.scales.find((s) => s.regularVarId === regularVarId);
          if (!scale) continue;
          const skill = progressVars.getSkill(def.id);
          if (!skill) continue;
          const perLevel = perLevelReaders.get(pairKey(def.id, regularVarId))!.value;
          total = total.add(Decimal.mul(skill.level.value, perLevel));
        }
        regularVars.setRegularTotal(regularVarId, total);
      }

      function onProgressVarLevelUp(progressVarId: string): void {
        const def = allDefs.find((d) => d.id === progressVarId);
        if (!def) return;
        for (const scale of def.scales) {
          recomputeRegularVarTotal(scale.regularVarId);
        }
      }

      const progressVars = createSkillCategory<ProgressVarDef, LooperProgressVarState>({
        id: 'looper/progress-vars',
        mapSkill: (def) => ({
          xpToLevel: (xp) =>
            Formula.variable(xp).mul(8).div(100).add(1).sqrt().sub(1).div(2).floor(),
          levelToMultiplier: (level) => level,
          description: `${def.name} (Progress)`,
          onLevelUp: () => onProgressVarLevelUp(def.id),
        }),
        mapState: (_def, levelSkill) => ({
          level: levelSkill as LevelDrivenSkill,
        }),
      });

      progressVars.register(data.progressVars);

      // After save/load rehydration, levels jump from 0 to whatever the save
      // contained without firing the levelUp event (per engine docs:
      // "Events fire only on gameplay XP gain, not on save-load"). Recompute
      // every regularVar's total once at install so the persistent-derived
      // total stays consistent with the rehydrated progressVar levels.
      for (const def of data.regularVars) {
        recomputeRegularVarTotal(def.id);
      }

      ctx.provide(ProgressVarsKey, progressVars);
    },
  };
}

/** Helper for cross-module retention-key collection — progressVar.xp refs (kept across loops). */
export function getProgressVarXpRefs(
  category: SkillCategory<ProgressVarDef, LooperProgressVarState>,
): Persistent<DecimalSource>[] {
  return category.getAll().map((entry) => entry.skill.xp);
}
