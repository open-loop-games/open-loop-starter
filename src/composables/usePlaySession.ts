import { ref, type Ref } from 'vue';
import type { EngineModule, SaveLoadResult, Engine } from '@open-loop/engine';
import { Screen } from '@/types';
import { useGame } from './useGame';

export interface PlaySessionOptions {
  /**
   * Runs after `engine.load()`, before the screen flips to `Game`.
   *
   * This is the seam games actually differ on. The load result carries
   * `timestamp`, so a game can measure the offline gap and decide what that
   * means for it: advance the tick driver over it, bracket a resource across
   * it, ignore it. First-run state that needs a started engine (auto-starting
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
  /** Active mod's modules — feeds `BalanceWorkbench`'s `:modules`. */
  getActiveModules: () => EngineModule[];
}

/**
 * The play-session lifecycle every game on the engine needs: pick a slot, start,
 * load, play, save and come back. Games supply what differs via `onLoaded`
 * and render whatever they like around `currentScreen`.
 */
export function usePlaySession(options: PlaySessionOptions = {}): PlaySession {
  const { engine } = useGame();
  const currentScreen = ref<Screen>(Screen.Slots);

  function startGame(slotId: number, modId?: string): void {
    engine.saveManager!.selectSlot(slotId);
    if (modId) engine.selectMod(modId);
    engine.start();
    const result = engine.load();
    options.onLoaded?.(result);
    currentScreen.value = Screen.Game;
  }

  function returnToSlots(): void {
    engine.saveManager?.save();
    engine.stop();
    currentScreen.value = Screen.Slots;
  }

  function getActiveModules(): EngineModule[] {
    const activeId = engine.activeModId;
    if (!activeId) return [];
    return engine.mods.find((m) => m.id === activeId)?.modules ?? [];
  }

  return { engine, currentScreen, startGame, returnToSlots, getActiveModules };
}
