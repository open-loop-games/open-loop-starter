/**
 * Idle Loops accessor pack — typed wrappers over `bootMod` plus a
 * shared `reset` helper for the idle-loops mod.
 */
import { Decimal } from 'open-loop-engine';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import {
  idleLoopsModule,
  IdleLoopsKey,
  type IdleLoopsState,
} from '@/modules/mods/idle-loops';
import { bootMod, type BootHandle } from '@/test/bootMod';

export interface ILBoot {
  handle: BootHandle;
  state: IdleLoopsState;
}

export function bootIL(): ILBoot {
  const handle = bootMod({
    modules: [settingsModule, uiRegistryModule, idleLoopsModule],
    namespacePrefix: 'il',
  });
  const state = handle.engine.tryInject(IdleLoopsKey);
  if (!state) {
    handle.dispose();
    throw new Error('IdleLoops state not provided after start()');
  }
  return { handle, state };
}

/**
 * Reset a booted fixture to a clean state. Restores mana, resets cursor,
 * clears stat XP (permanent bonuses are preserved — call clearBonuses too
 * if you need a fully fresh state).
 */
export function reset(state: IdleLoopsState): void {
  state.mana.value = state.maxMana;
  for (const entry of state.stats.getAll()) {
    entry.skill.xp.value = 0;
    if (entry.skill.permanentBonus) {
      entry.skill.permanentBonus.value = Decimal.dZero;
    }
  }
  state.queue.resetCursor();
  state.actions.progress.reset();
}
