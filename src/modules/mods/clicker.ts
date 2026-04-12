/**
 * Clicker mod — a completely different game from the same base modules.
 *
 * No loop, no mana — just manual actions as instant-click buttons backed
 * by continuous producers and upgrade scaling. This is what the engine
 * looks like when you drop loop-driven progression entirely and the same
 * core module still produces a coherent game.
 */
import type { EngineModule, EngineContext } from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import ClickerLayout from '@/ui/layouts/ClickerLayout.vue';

export const clickerModule: EngineModule = {
  id: 'clicker',
  dependencies: ['gathering', 'economy'],
  install(_ctx: EngineContext) {
    setSlot('game-layout', ClickerLayout);
  },
};
