/**
 * Loop mod content — adds mana as a loop driver and a reset cycle.
 *
 * When mana hits zero, the loop restarts: resources and actions reset,
 * but skill permanent bonuses + producers + upgrades + achievements
 * persist across loops.
 *
 * This module is installed by the "Vanilla", "Prestige" and "Ledger" mods.
 * The "Clicker" mod omits it entirely to show a loop-less game.
 */
import {
  Decimal,
  createResource,
  createLoop,
  createRetentionPolicy,
  beginPersistentContext,
  endPersistentContext,
  SaveManagerKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Loop,
} from 'open-loop-engine';
import { coreState } from '@/modules/core';
import { setSlot } from '@/modules/ui-registry';
import VanillaLayout from '@/ui/layouts/VanillaLayout.vue';

const MAX_MANA = new Decimal(100);
const MANA_DRAIN_PER_SEC = 2;

export interface LoopState {
  mana: Resource<DecimalSource>;
  maxMana: Decimal;
  loop: Loop;
}

export let loopState: LoopState | null = null;

export const loopModule: EngineModule = {
  id: 'loop',
  dependencies: ['core'],
  install(ctx: EngineContext) {
    const core = coreState!;

    beginPersistentContext('loop');
    const mana = createResource<DecimalSource>(MAX_MANA, { displayName: 'Mana' });
    endPersistentContext();

    // Drain mana while the loop is running
    ctx.onTick((dt: number) => {
      if (loop.running.value) {
        const drain = Decimal.mul(MANA_DRAIN_PER_SEC, dt);
        mana.value = Decimal.max(Decimal.sub(mana.value, drain), 0);
      }
    });

    // Retention: keep permanent skill bonuses across loop resets
    const retention = createRetentionPolicy({
      keep: [
        core.skills.woodcutting.permanentBonus!,
        core.skills.mining.permanentBonus!,
      ],
    });

    const loop = createLoop({
      id: 'main-loop',
      endCondition: () => Decimal.lte(mana.value, 0),
      thingsToReset: [
        mana,
        core.skills.woodcutting.xp,
        core.skills.mining.xp,
        core.resources.wood,
        core.resources.stone,
        core.resources.gold,
        ...core.actions.values(),
      ],
      onBeforeRestart() {
        core.skills.woodcutting.accumulateBonus!();
        core.skills.mining.accumulateBonus!();
        retention.snapshot();
      },
      onRestart() {
        mana.value = MAX_MANA;
        retention.restore();
      },
      registerTick: ctx.onTick,
    });

    loop.run();

    // Save metadata for slot cards
    const saveManager = ctx.tryInject(SaveManagerKey);
    if (saveManager) {
      saveManager.setMetadataProvider(() => ({
        loopCount: loop.count.value,
        playtime: loop.elapsed.value,
      }));
    }

    loopState = { mana, maxMana: MAX_MANA, loop };

    // Register the default layout. Mods that override the layout (merchant,
    // clicker) will call setSlot again after us due to dependency order.
    setSlot('game-layout', VanillaLayout);
  },
};
