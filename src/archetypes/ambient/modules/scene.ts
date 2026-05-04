import { computed, watch, type ComputedRef } from 'vue';
import {
  createZoneSystem,
  type EngineModule,
  type InjectionKey,
  type ZoneSystem,
} from 'open-loop-engine';
import type { AmbientData, SceneVariantDef } from '../data/types';
import { getUnlocks } from './unlocks';

export interface SceneState {
  zones: ZoneSystem;
  /**
   * Highest-ordered unlocked variant id — the canvas reads this to paint
   * the active scene. Always equals the last-unlocked variant in
   * registration order; `select`/`current` from ZoneSystem are over-
   * specified for ambient (no picker UI) so we derive the visible id
   * outside `current`.
   */
  currentVariantId: ComputedRef<string>;
  /** Current variant def — closes over the registered scene-variant set. */
  currentVariant: ComputedRef<SceneVariantDef>;
  /** Look up a variant def by id; UI panels use this to render reveal labels. */
  getVariant(id: string): SceneVariantDef | undefined;
}

export const SceneKey: InjectionKey<SceneState> = Symbol(
  'ambient/scene',
) as InjectionKey<SceneState>;

const SCENE_CONTEXT_ID = 'ambient/scenes';

/**
 * ZoneSystem as a named-current-variant state machine for costume cycling.
 * No spatial gating, no per-zone content, no picker UI — the variant set is
 * the registered zone set, the unlocked subset is the visible-so-far set,
 * and the canvas reads the highest-ordered entry from that subset.
 *
 * The threshold gate lives in `unlocks.ts` (one canonical place); scene
 * subscribes to scene-variant unlock purchasables and bridges flips into
 * `zones.unlock(variantId)`. Scene-variant data still owns its own file
 * (`data/scene-variants.ts`) because the variant carries `visualKey` and
 * label metadata the unlock doesn't — the unlock is the gate, the variant
 * is what it reveals.
 *
 * Engine surface caveat: `archetypes/ambient.md` § 3 lists `createZoneSystem`
 * as "typically implies depth (spatial progression, worker assignment)."
 * That warning applies to selection-gated content; the no-gate costume use
 * here doesn't move beat timing or cognitive load. Doc clarification is a
 * follow-up.
 */
export function createSceneModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/scene',
    dependencies: ['ambient/unlocks'],
    install(ctx) {
      const unlocks = getUnlocks();

      const zones = createZoneSystem({
        id: SCENE_CONTEXT_ID,
        zones: data.sceneVariants.map((variant, index) => ({
          id: variant.id,
          name: variant.label,
          order: index,
        })),
        initiallyUnlocked: [data.sceneVariants[0].id],
      });

      // Bridge: when a scene-variant unlock's purchasable flips bought,
      // call zones.unlock(variantId). `immediate: true` handles the initial
      // pass (e.g. the default-visible tilled-earth case where the unlock
      // is bought before scene installs). zones.unlock guards against
      // repeat flips so the watcher is naturally idempotent.
      for (const def of data.unlocks) {
        if (def.reveals.kind !== 'scene-variant') continue;
        const variantId = def.reveals.variantId;
        const purchasable = unlocks.getPurchasable(def.id);
        if (!purchasable) continue;
        watch(
          () => purchasable.active.value,
          (bought) => {
            if (bought) zones.unlock(variantId);
          },
          { immediate: true },
        );
      }

      const variantsById = new Map<string, SceneVariantDef>(
        data.sceneVariants.map((v) => [v.id, v]),
      );
      const defaultVariant = data.sceneVariants[0];
      const currentVariantId = computed(() => {
        const ordered = zones.ordered.value;
        for (let i = ordered.length - 1; i >= 0; i--) {
          if (zones.isUnlocked(ordered[i].id)) return ordered[i].id;
        }
        return defaultVariant.id;
      });
      const currentVariant = computed(
        () => variantsById.get(currentVariantId.value) ?? defaultVariant,
      );

      ctx.provide(SceneKey, {
        zones,
        currentVariantId,
        currentVariant,
        getVariant: (id) => variantsById.get(id),
      });
    },
  };
}
