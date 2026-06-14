/**
 * Shared drag-state plumbing for the action column ↔ town column drag pair
 * (ActionColumnPanel.NextActionList + town-column action tiles). Tiny module
 * so the row + tile components can inject without pulling each other in as
 * type imports — same pattern as `idle-loops-ng/src/ui/components/next-action-drag.ts`.
 */

import type { InjectionKey } from 'vue';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

/** pdnd drag-type tag — within-edit-list row reorder. */
export const ROW_DRAG_TYPE = 'looper/edit-row';

/** pdnd drag-type tag — town-column action tile dragged onto the edit list. */
export const AVAILABLE_ACTION_DRAG_TYPE = 'looper/available-action';

export interface DragState {
  /** Index of the row currently being dragged (null when idle). */
  fromIndex: number | null;
  /** Index of the row currently under the pointer (null when none). */
  overIndex: number | null;
  /** Which edge of the over-row the pointer is closest to. */
  overEdge: Edge | null;
}

export const dragStateKey: InjectionKey<DragState> = Symbol('looper/edit-list-drag-state');
