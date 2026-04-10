/**
 * UI Slot Registry — lets EngineModules contribute Vue components for
 * well-known layout slots. GameScreen.vue reads from the registry with
 * sensible fallbacks, so mods can swap the whole layout or individual panels
 * without the app shell knowing about them.
 *
 * This is the precursor to a future `open-loop-ui` package.
 */
import { shallowReactive, markRaw, type Component } from 'vue';
import type { EngineModule } from 'open-loop-engine';

export type SlotId =
  | 'game-layout'
  | 'resources-panel'
  | 'actions-panel'
  | 'producers-panel'
  | 'upgrades-panel'
  | 'achievements-panel'
  | 'loop-panel'
  | 'prestige-panel'
  | 'ledger-panel';

const slots = shallowReactive<Partial<Record<SlotId, Component>>>({});

export function setSlot(id: SlotId, component: Component): void {
  slots[id] = markRaw(component);
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
