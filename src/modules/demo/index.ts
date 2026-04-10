import {
  Decimal,
  createResource,
  createAction,
  createSkill,
  createLoop,
  createRetentionPolicy,
  createZoneSystem,
  beginPersistentContext,
  endPersistentContext,
  SaveManagerKey,
  type EngineModule,
  type EngineContext,
  type DecimalSource,
} from 'open-loop-engine';
import type { DemoState } from './types';

/** Module-level state — populated during install, used by Vue composables */
export let demoState: DemoState | null = null;

const MAX_MANA = new Decimal(100);

export const demoModule: EngineModule = {
  id: 'demo',
  dependencies: ['settings'],
  install(ctx: EngineContext) {
    // --- Resources ---
    beginPersistentContext('demo');
    const mana = createResource<DecimalSource>(MAX_MANA, { displayName: 'Mana' });
    endPersistentContext();

    // --- Skill (accumulator mode) ---
    const woodcutting = createSkill({
      id: 'woodcutting',
      xpToLevel: (xp) => Decimal.floor(Decimal.div(xp, 10)),
      retentionFormula: (level) => Decimal.mul(level, 0.1),
      description: 'Woodcutting',
    });

    // --- Zone ---
    const zones = createZoneSystem({
      id: 'zones',
      zones: [{ id: 'village', name: 'Village', order: 0 }],
      initiallyUnlocked: ['village'],
    });

    // --- Actions ---
    const gatherWood = createAction({
      id: 'gather-wood',
      display: 'Gather Wood',
      duration: 3,
      registerTick: ctx.onTick,
      onComplete() {
        woodcutting.addXp(5);
      },
    });

    const buildFence = createAction({
      id: 'build-fence',
      display: 'Build Fence',
      duration: 8,
      registerTick: ctx.onTick,
      onComplete() {
        woodcutting.addXp(15);
      },
    });

    const explore = createAction({
      id: 'explore',
      display: 'Explore Surroundings',
      duration: 5,
      registerTick: ctx.onTick,
      onComplete() {
        woodcutting.addXp(8);
      },
    });

    const actions = new Map([
      ['gather-wood', gatherWood],
      ['build-fence', buildFence],
      ['explore', explore],
    ]);

    // --- Mana drain per tick ---
    ctx.onTick((dt: number) => {
      if (loop.running.value) {
        const drain = Decimal.mul(2, dt);
        const newMana = Decimal.max(Decimal.sub(mana.value, drain), 0);
        mana.value = newMana;
      }
    });

    // --- Retention: keep permanent skill bonus across loops ---
    const retention = createRetentionPolicy({
      keep: [woodcutting.permanentBonus!],
    });

    // --- Loop ---
    const loop = createLoop({
      id: 'main-loop',
      endCondition: () => Decimal.lte(mana.value, 0),
      thingsToReset: [mana, woodcutting.xp, ...actions.values()],
      onBeforeRestart() {
        woodcutting.accumulateBonus!();
        retention.snapshot();
      },
      onRestart() {
        mana.value = MAX_MANA;
        retention.restore();
      },
      registerTick: ctx.onTick,
    });

    loop.run();

    // --- Save metadata for slot cards ---
    const saveManager = ctx.tryInject(SaveManagerKey);
    if (saveManager) {
      saveManager.setMetadataProvider(() => ({
        loopCount: loop.count.value,
        playtime: loop.elapsed.value,
      }));
    }

    // --- Expose state ---
    demoState = {
      mana,
      maxMana: MAX_MANA,
      woodcutting,
      zones,
      actions,
      loop,
    };
  },
};
