/**
 * Town column view state — shared between TownColumn and action panels so
 * zone tab focus is consistent across the UI.
 *
 * Plain module-level ref; not persisted — it's pure UI state.
 */

import { ref } from 'vue';

export type TownTab = 'actions';

const activeTab = ref<TownTab>('actions');

export function useTownView() {
  return {
    activeTab,
    setTab(tab: TownTab) {
      activeTab.value = tab;
    },
  };
}
