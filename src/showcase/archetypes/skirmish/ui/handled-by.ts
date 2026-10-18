import { computed, type ComputedRef } from 'vue';
import { getAutomation, type CrewTier } from '../modules';

/**
 * The lieutenant who works this part of the deck for you, by first name, while they are
 * hired and on the job; otherwise undefined.
 *
 * @param tier - the lieutenant's automation tier.
 * @returns their first name ("Moth"), or undefined while you run it yourself.
 */
export function useHandledBy(tier: Exclude<CrewTier, 'none'>): ComputedRef<string | undefined> {
  const auto = getAutomation();
  const lt = auto.lieutenants.find((l) => l.tier === tier)!;
  return computed(() =>
    auto.isUnlocked(tier) && lt.enabled.value ? lt.name.split(',')[0] : undefined,
  );
}
