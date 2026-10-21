import { onScopeDispose, ref, type Ref } from 'vue';
import type { SaveLoadResult, Engine } from '@open-loop/engine';
import { Screen } from '@/types';
import { useGame } from './useGame';

export interface PlaySessionOptions {
  /**
   * Runs after `engine.load()`, before the screen flips to `Game`.
   *
   * This is the seam games actually differ on. The load result carries
   * `timestamp`, so a game can measure the offline gap and decide what that
   * means for it: advance the tick driver over it, bracket a resource across
   * it, ignore it. First-launch state that needs a started engine (auto-starting
   * a match) goes here too.
   */
  onLoaded?: (result: SaveLoadResult) => void;
}

export interface PlaySession {
  engine: Engine;
  /** Slot picker vs in-game. Games drive their own `v-if` off this. */
  currentScreen: Ref<Screen>;
  startGame: (slotId: number, modId?: string) => void;
  returnToSlots: () => void;
}

/**
 * The play-session lifecycle every game on the engine needs: pick a slot, start,
 * load, play, save and come back. Games supply what differs via `onLoaded`
 * and render whatever they like around `currentScreen`.
 */
export function usePlaySession(options: PlaySessionOptions = {}): PlaySession {
  const { engine } = useGame();
  const currentScreen = ref<Screen>(Screen.Slots);

  // An engine installs its modules once, on the first start(), and selects its
  // mod only before then; a later start() resumes the same modules. So a slot
  // that loads nothing (a new game, a failed load) would keep the last game's
  // state. It starts instead from the defaults, saved before the first load.
  let started = false;
  let defaults: string | undefined;

  function startGame(slotId: number, modId?: string): void {
    engine.saveManager!.selectSlot(slotId);
    if (modId && engine.activeModId !== modId) engine.selectMod(modId);
    engine.start();
    if (!started) defaults = engine.saveManager?.exportSave();
    const result = engine.load();
    if (started && !result.success && defaults) engine.saveManager!.importSave(defaults);
    started = true;
    options.onLoaded?.(result);
    currentScreen.value = Screen.Game;
  }

  // The autosave writes on an interval, so a page closed between two writes
  // loses what happened since the last one. A hidden page may never run
  // script again, so write the live game now: `pagehide` covers a close or a
  // reload, and a mobile browser that discards a background tab fires only
  // `visibilitychange`. The slot picker has no loaded game, and a write there
  // would put defaults over the slot's save. An autoSaveInterval of 0 is the
  // player's autosave turned off (SystemHeader).
  function saveOnHide(event: Event): void {
    if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
    if (currentScreen.value !== Screen.Game || engine.autoSaveInterval <= 0) return;
    engine.saveManager?.save();
  }
  window.addEventListener('pagehide', saveOnHide);
  document.addEventListener('visibilitychange', saveOnHide);
  onScopeDispose(() => {
    window.removeEventListener('pagehide', saveOnHide);
    document.removeEventListener('visibilitychange', saveOnHide);
  });

  function returnToSlots(): void {
    engine.saveManager?.save();
    engine.stop();
    currentScreen.value = Screen.Slots;
  }

  return { engine, currentScreen, startGame, returnToSlots };
}
