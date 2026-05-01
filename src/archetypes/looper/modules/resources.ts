/**
 * Resource module — per-loop resources that reset each loop.
 *
 * Gold only in the slim demo. All resources are simple accumulators set to
 * 0 on loop restart. Actions add/subtract via the helper functions.
 *
 * Reference: idleLoops/saving.js lines 34-43, idleLoops/driver.js lines 102-131
 */

import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Resource,
  createResource,
  addResource,
  subtractResource,
  resetResource,
  hasResource,
  withPersistentContext,
} from 'open-loop-engine';
import { RESOURCE_DEFS, type ResourceId } from '../data/resources';

// ============================================================================
// Module State (populated in install)
// ============================================================================

const resources = new Map<ResourceId, Resource<DecimalSource>>();

// ============================================================================
// Public API — resource access
// ============================================================================

/** Get a resource by id */
export function getResource(id: ResourceId): Resource<DecimalSource> {
  const r = resources.get(id);
  if (!r) throw new Error(`Resource ${id} not initialized`);
  return r;
}

/** Get all resources (for iteration / UI) */
export function getAllResources(): ReadonlyMap<ResourceId, Resource<DecimalSource>> {
  return resources;
}

/** Get the current value of a resource */
export function getResourceValue(id: ResourceId): Decimal {
  return new Decimal(getResource(id).value);
}

/** Check if player has at least `amount` of a resource */
export function hasEnough(id: ResourceId, amount: DecimalSource): boolean {
  return hasResource(getResource(id), amount);
}

// ============================================================================
// Public API — resource mutation
// ============================================================================

/** Add to a resource */
export function addResourceAmount(id: ResourceId, amount: DecimalSource): void {
  addResource(getResource(id), amount);
}

/**
 * Subtract from a resource. Returns false if insufficient (does not go negative).
 */
export function subtractResourceAmount(id: ResourceId, amount: DecimalSource): boolean {
  if (!hasEnough(id, amount)) return false;
  subtractResource(getResource(id), amount);
  return true;
}

/**
 * Reset all per-loop resources to zero. Called on loop restart.
 *
 * Reference: idleLoops/driver.js restart() — zeroes gold via add(-current)
 */
export function resetAllResources(): void {
  for (const r of resources.values()) {
    resetResource(r);
  }
}

// ============================================================================
// Module
// ============================================================================

export const resourcesModule: EngineModule = {
  id: 'resources',
  install(_ctx: EngineContext) {
    withPersistentContext('resources', () => {
      for (const def of RESOURCE_DEFS) {
        resources.set(
          def.id as ResourceId,
          createResource(0, { displayName: def.name, precision: def.precision }),
        );
      }
    });
  },
};
