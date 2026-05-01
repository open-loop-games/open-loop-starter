/**
 * Vue bridge for the resources module.
 */

import { RESOURCE_DEFS, type ResourceId } from '../data/resources';
import {
  getResource,
  getAllResources,
  getResourceValue,
  hasEnough,
  addResourceAmount,
  subtractResourceAmount,
} from '../modules/resources';

export function useResources() {
  return {
    /** Static resource definitions */
    resourceDefs: RESOURCE_DEFS,
    /** All resources (reactive map) */
    allResources: getAllResources(),
    /** Get one resource ref */
    getResource,
    /** Get current value */
    getResourceValue,
    /** Check affordability */
    hasEnough,
    /** Add to a resource */
    addResourceAmount,
    /** Subtract from a resource */
    subtractResourceAmount,
  };
}

export type { ResourceId };
