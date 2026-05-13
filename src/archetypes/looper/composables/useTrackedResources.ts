/**
 * Vue bridge exposing the header-band tracked resources strip.
 *
 * A resource is "tracked" if its def has `tracked: true`. If the def also
 * has `initiallyHidden: true`, it stays hidden until its value is > 0.
 */

import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { RESOURCE_DEFS, type ResourceDef } from '../data/resources';
import { getResourceValue } from '../modules/resources';

export function useTrackedResources() {
  const trackedDefs = RESOURCE_DEFS.filter((def) => def.tracked);

  const visibleResources = computed<ResourceDef[]>(() =>
    trackedDefs.filter((def) => {
      if (!def.initiallyHidden) return true;
      return Decimal.gt(getResourceValue(def.id as Parameters<typeof getResourceValue>[0]), 0);
    }),
  );

  return {
    visibleResources,
    getResourceValue,
  };
}
