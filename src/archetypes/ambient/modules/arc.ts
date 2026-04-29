import { computed, watch } from 'vue';
import {
  Decimal,
  persistent,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type EngineRef,
  type InjectionKey,
} from 'open-loop-engine';
import type { AmbientData } from '../data/types';
import { AmbientTuningRegistryKey, PrimaryResourceKey } from './auto-producers';
import { UnlocksKey } from './unlocks';

export interface ArcState {
  /** True when arc-closure conditions are currently satisfied. */
  complete: ComputedRef<boolean>;
  /** Latches true the first time `complete` flips true — survives save/load. */
  announced: EngineRef<boolean>;
  /** End-of-arc flavour line — surfaced by the UI on first crossing. */
  flavour: string;
}

export const ArcKey: InjectionKey<ArcState> = Symbol('ambient/arc') as InjectionKey<ArcState>;

const DEFAULT_FLAVOUR =
  'A full year, kept patiently. The garden hums on its own — no urgency, just continuance.';

/**
 * Arc-closure detection for Ambient. Beat 7's "prestige-eligible state
 * reached" condition is `primary >= balance.prestigeEligibleThreshold`
 * AND the deepest scene-variant unlock visible. The latch announces once
 * on rising edge and survives save/load.
 *
 * Session-clock state lives in `modules/session-clock.ts` — kept separate
 * so this module mirrors `producer/modules/arc.ts`'s single-concern shape.
 */
export function createArcModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/arc',
    dependencies: ['ambient/auto-producers', 'ambient/unlocks'],
    install(ctx) {
      const primary = ctx.inject(PrimaryResourceKey);
      const unlocks = ctx.inject(UnlocksKey);
      const tuningRegistry = ctx.inject(AmbientTuningRegistryKey);

      const announced = persistent<boolean>(false, { name: 'arcAnnounced' });

      const prestigeThreshold = tunable<DecimalSource>(
        tuningRegistry,
        'balance/prestigeEligibleThreshold',
        () => data.balance.prestigeEligibleThreshold,
      );

      // Deepest scene-variant unlock = the closure target ("year-cycles" in
      // default data). Filter to scene-variant kind so a future fork adding
      // a higher-threshold UI-affordance unlock can't displace the closure
      // signal silently.
      const deepestUnlockId = data.unlocks
        .filter((u) => u.reveals.kind === 'scene-variant')
        .slice()
        .sort((a, b) => Number(b.threshold) - Number(a.threshold))[0]?.id;

      const complete = computed(() => {
        if (!Decimal.gte(primary.value, prestigeThreshold.value)) return false;
        if (!deepestUnlockId) return false;
        const purchasable = unlocks.getPurchasable(deepestUnlockId);
        return purchasable?.bought.value ?? false;
      });

      watch(
        complete,
        (isComplete) => {
          if (isComplete && !announced.value) announced.value = true;
        },
        { immediate: true },
      );

      ctx.provide(ArcKey, {
        complete,
        announced,
        flavour: DEFAULT_FLAVOUR,
      });
    },
  };
}
