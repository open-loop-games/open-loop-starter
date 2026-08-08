import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { DraftKey } from '../modules/draft';
import { RunKey } from '../modules/run';

/**
 * Keyboard control for a player-driven seat.
 *
 * This is the whole of "a policy swapped for input" on the UI side: it owns the
 * held-key set, posts a unit heading to `ArenaApi.setControl` whenever that set
 * changes, and routes the number keys to the draft. Nothing else in the tree
 * knows a keyboard exists.
 *
 * Two properties worth keeping if a fork reshapes this:
 *
 *  - **It posts on change, not per frame.** The sim samples the control value at
 *    its own 20 Hz; pushing on `keydown`/`keyup` means a held key costs two
 *    events for its whole duration.
 *  - **It is inert for a policy seat**, and the guard is at the listener rather
 *    than in the handler, so an AI run leaves the arrow keys to the page.
 */

/** Held key → unit contribution. Both key sets, and neither is primary. */
const AXES: Record<string, { x: number; y: number }> = {
  w: { x: 0, y: -1 },
  a: { x: -1, y: 0 },
  s: { x: 0, y: 1 },
  d: { x: 1, y: 0 },
  arrowup: { x: 0, y: -1 },
  arrowleft: { x: -1, y: 0 },
  arrowdown: { x: 0, y: 1 },
  arrowright: { x: 1, y: 0 },
};

export interface PlayerControl {
  /** True when the assigned seat takes input rather than running a policy. */
  active: import('vue').ComputedRef<boolean>;
  /** True while any movement key is held — the HUD's "you are driving" tell. */
  moving: import('vue').Ref<boolean>;
}

export function usePlayerControl(): PlayerControl {
  const arena = useModule(ArenaKey);
  const draft = useModule(DraftKey);
  const run = useModule(RunKey);

  const active = computed(() => arena.seat.value.driver === 'player');
  const moving = ref(false);
  const held = new Set<string>();

  function post(): void {
    let x = 0;
    let y = 0;
    for (const key of held) {
      const axis = AXES[key];
      if (axis) {
        x += axis.x;
        y += axis.y;
      }
    }
    // Opposite keys held cancel to zero, which is a legitimate "stop" rather
    // than a heading — hand back null so the sim holds position and keeps aim.
    if (x === 0 && y === 0) {
      moving.value = false;
      arena.setControl(null);
      return;
    }
    moving.value = true;
    arena.setControl({ x, y });
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!active.value || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();

    // The draft holds the floor, so while a pick is owed the number keys ARE the
    // controls. Taking them only in that window keeps them free the rest of the
    // time and means the overlay needs no focus management.
    if (run.pendingPicks.value > 0) {
      const index = Number(key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < draft.offers.value.length) {
        event.preventDefault();
        draft.choose(index);
      }
      return;
    }

    if (!(key in AXES)) return;
    // Arrow keys scroll the page otherwise, which in the gallery host moves the
    // whole floor out from under the run.
    event.preventDefault();
    if (!held.has(key)) {
      held.add(key);
      post();
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (!held.delete(key)) return;
    post();
  }

  /** Alt-tabbing away with a key down would otherwise leave it held forever. */
  function onBlur(): void {
    if (held.size === 0) return;
    held.clear();
    post();
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    held.clear();
    arena.setControl(null);
  });

  return { active, moving };
}
