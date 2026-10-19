import { computed, type ComputedRef } from 'vue';
import { getAutomation, type CrewTier, type Lieutenant } from '../modules';

/** A lieutenant's first name: "Moth, your fixer" → "Moth". */
export function firstName(l: Lieutenant): string {
  return l.def.name.split(',')[0]!;
}

/**
 * The lieutenant who works this part of the deck for you, by first name, while they are
 * hired and on the job; otherwise undefined.
 *
 * @param tier - the lieutenant's automation tier.
 * @returns their first name ("Moth"), or undefined while you run it yourself.
 */
export function useHandledBy(tier: Exclude<CrewTier, 'none'>): ComputedRef<string | undefined> {
  const auto = getAutomation();
  const lt = auto.lieutenants.find((l) => l.def.id === tier)!;
  return computed(() => (auto.isUnlocked(tier) && lt.enabled.value ? firstName(lt) : undefined));
}
