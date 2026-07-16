/**
 * UI Slot Registry — lets EngineModules contribute Vue components for
 * well-known layout slots, so mods can swap the whole layout or individual
 * panels without the app shell knowing about them. A shell reads a slot via
 * `getSlot` and falls back to its own default when nothing is registered.
 */
import { shallowReactive, markRaw, type Component } from 'vue';
import type { EngineModule } from '@open-loop/engine';

export type SlotId = 'game-layout' | (string & {});

const slots = shallowReactive<Partial<Record<SlotId, Component>>>({});

/**
 * When false, `setSlot` silently drops writes. Used by the benchmark
 * runner to prevent inner-engine installs from mutating the outer app's
 * slot registry during async measurement loops — an async run can't rely
 * on Vue batching across `await nextTick()` points, so snapshot+restore
 * doesn't work the way it would for a fully-sync mutation.
 */
let writesEnabled = true;

export function setSlot(id: SlotId, component: Component): void {
  if (!writesEnabled) return;
  slots[id] = markRaw(component);
}

export function setSlotWritesEnabled(enabled: boolean): void {
  writesEnabled = enabled;
}

export function getSlot(id: SlotId): Component | undefined {
  return slots[id];
}

export function hasSlot(id: SlotId): boolean {
  return slots[id] !== undefined;
}

export function resetSlots(): void {
  for (const key of Object.keys(slots) as SlotId[]) {
    delete slots[key];
  }
}

/**
 * Sentinel module. Its only job is to exist so mods can declare
 * `dependencies: ['ui-registry']` and get predictable install order.
 */
export const uiRegistryModule: EngineModule = {
  id: 'ui-registry',
  install() {
    // Slots are populated by other modules during their install().
  },
};
