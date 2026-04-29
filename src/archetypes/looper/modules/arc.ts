import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { Decimal, persistent, type EngineModule, type InjectionKey } from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { LoopKey } from './loop';
import { CapabilitiesKey } from './capabilities';
import { ZonesKey } from './zones';

export interface ArcState {
  /** True when arc-closure conditions are currently satisfied. */
  complete: ComputedRef<boolean>;
  /** Latches true the first time `complete` flips true — survives save/load. */
  announced: Ref<boolean>;
  /** End-of-arc flavour line — surfaced by the UI on first crossing. */
  flavour: string;
  /** Average Talent multiplier across capabilities. Drives the closure check. */
  averageTalentMultiplier: ComputedRef<number>;
}

export const ArcKey: InjectionKey<ArcState> = Symbol('looper/arc') as InjectionKey<ArcState>;

const DEFAULT_FLAVOUR =
  'The spire falls quiet. You stand where the loop began and feel the difference — every gesture rehearsed, every fight remembered.';

/**
 * Arc closure: `currentZone === finalZone AND retention compound visible
 * over a window of ≥ 5 loops`. The retention compound check uses the
 * loop counter and a running window of "average Talent multiplier across
 * capabilities"; once `loop.count >= 5` and the multiplier exceeds 1.05
 * (gentle threshold over a flat baseline of 1.0), the closure latches.
 *
 * The window math is intentionally simple — the design-assertion probe
 * (looper.md § 6 `cost-reduction-perceptibility`) is the formal verification
 * of "Talent → cost reduction is perceptible"; this latch is the
 * player-visible counterpart.
 */
export function createArcModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/arc',
    dependencies: ['looper/loop', 'looper/capabilities', 'looper/zones'],
    install(ctx) {
      const loop = ctx.inject(LoopKey);
      const capabilities = ctx.inject(CapabilitiesKey);
      const zones = ctx.inject(ZonesKey);

      const announced = persistent<boolean>(false, { name: 'arcAnnounced' });

      const averageTalentMultiplier = computed<number>(() => {
        const entries = capabilities.getAll();
        if (entries.length === 0) return 1;
        let sum = 0;
        for (const entry of entries) {
          sum += new Decimal(entry.state.talentMult.value).toNumber();
        }
        return sum / entries.length;
      });

      const finalZoneId = zones.ordered.value[zones.ordered.value.length - 1]?.id ?? '';

      const complete = computed(() => {
        if (!finalZoneId) return false;
        if (!zones.isUnlocked(finalZoneId)) return false;
        if (loop.count.value < 5) return false;
        return averageTalentMultiplier.value > 1.05;
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
        averageTalentMultiplier,
      });
    },
  };
}
