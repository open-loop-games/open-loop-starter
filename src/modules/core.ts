/**
 * Core base game — village gathering sandbox.
 *
 * Showcases a broad spread of engine primitives without going deep on any
 * one of them. Mods layer on top of this (add prestige, swap UI, etc).
 *
 * Creates: resources × 3, skills × 2, zones × 3, actions × 6,
 * producers × 3, upgrades × 3, achievements × 5.
 */
import { computed } from 'vue';
import {
  Decimal,
  Formula,
  createResource,
  createSkill,
  createZoneSystem,
  createAction,
  createActionQueue,
  createActionRunner,
  createProducerCategory,
  createScalingPurchasable,
  createPurchasableGroup,
  additiveEffect,
  createSimpleAchievement,
  createAchievementGroup,
  createMultiplicativeModifier,
  countEarned,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Action,
  type ActionQueue,
  type ActionRunner,
  type AccumulatorSkill,
  type ZoneSystem,
  type ProducerCategory,
  type Purchasable,
  type PurchasableGroup,
  type Achievement,
  type AchievementGroup,
} from 'open-loop-engine';
import { useAutomation, type UseAutomationReturn } from '@/composables/useAutomation';

// ============================================================================
// Types
// ============================================================================

interface ProducerDef {
  id: string;
  name: string;
  baseRate: number;
  resource: Resource<DecimalSource>;
  costResource: Resource<DecimalSource>;
  baseCost: number;
  costScaling: number;
}

export interface CoreState {
  resources: {
    wood: Resource<DecimalSource>;
    stone: Resource<DecimalSource>;
    gold: Resource<DecimalSource>;
  };
  skills: {
    woodcutting: AccumulatorSkill;
    mining: AccumulatorSkill;
  };
  zones: ZoneSystem;
  actions: Map<string, Action>;
  actionZones: Map<string, string>;
  producers: ProducerCategory<ProducerDef>;
  upgrades: {
    sharpAxe: Purchasable;
    ironPickaxe: Purchasable;
    foreman: Purchasable;
    group: PurchasableGroup;
  };
  achievements: {
    list: Achievement[];
    group: AchievementGroup;
  };
  queue: ActionQueue;
  runner: ActionRunner;
  automation: UseAutomationReturn;
}

export let coreState: CoreState | null = null;

// ============================================================================
// Module
// ============================================================================

export const coreModule: EngineModule = {
  id: 'core',
  dependencies: ['settings', 'ui-registry'],
  install(ctx: EngineContext) {
    // --- Resources ----------------------------------------------------------
    beginPersistentContext('core-resources');
    const wood = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Wood' });
    const stone = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Stone' });
    const gold = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Gold' });
    endPersistentContext();

    // --- Skills -------------------------------------------------------------
    const woodcutting = createSkill({
      id: 'woodcutting',
      xpToLevel: (xp) => Formula.variable(xp).div(10).floor(),
      retentionFormula: (level) => Formula.variable(level).mul(0.1),
      description: 'Woodcutting',
    });

    const mining = createSkill({
      id: 'mining',
      xpToLevel: (xp) => Formula.variable(xp).div(12).floor(),
      retentionFormula: (level) => Formula.variable(level).mul(0.1),
      description: 'Mining',
    });

    // --- Zones --------------------------------------------------------------
    const zones = createZoneSystem({
      id: 'zones',
      zones: [
        { id: 'village', name: 'Village', order: 0 },
        { id: 'forest', name: 'Forest', order: 1 },
        { id: 'quarry', name: 'Quarry', order: 2 },
      ],
      initiallyUnlocked: ['village'],
    });

    // --- Upgrades (scaling purchasables) ------------------------------------
    beginPersistentContext('core-upgrades');
    const sharpAxe = createScalingPurchasable({
      id: 'sharp-axe',
      resource: wood,
      baseCost: 15,
      costScaling: 1.6,
      limit: 5,
      effect: additiveEffect(0.5, 1),
      title: 'Sharp Axe',
      description: '+50% wood yield per level',
    });

    const ironPickaxe = createScalingPurchasable({
      id: 'iron-pickaxe',
      resource: gold,
      baseCost: 8,
      costScaling: 1.7,
      limit: 5,
      effect: additiveEffect(0.5, 1),
      title: 'Iron Pickaxe',
      description: '+50% stone yield per level',
    });

    const foreman = createScalingPurchasable({
      id: 'foreman',
      resource: gold,
      baseCost: 25,
      costScaling: 2,
      limit: 10,
      effect: additiveEffect(0.25, 1),
      title: 'Foreman',
      description: '+25% producer rate per level',
    });
    endPersistentContext();

    const upgradeGroup = createPurchasableGroup({
      purchasables: [sharpAxe, ironPickaxe, foreman],
    });

    // --- Actions ------------------------------------------------------------
    function gainWood(base: DecimalSource) {
      wood.value = Decimal.add(wood.value, Decimal.mul(base, sharpAxe.effect.value));
    }
    function gainStone(base: DecimalSource) {
      stone.value = Decimal.add(stone.value, Decimal.mul(base, ironPickaxe.effect.value));
    }
    function gainGold(base: DecimalSource) {
      gold.value = Decimal.add(gold.value, base);
    }

    const gatherSticks = createAction({
      id: 'gather-sticks',
      display: 'Gather Sticks',
      duration: 1.5,
      registerTick: ctx.onTick,
      onComplete() {
        gainWood(1);
        woodcutting.addXp(2);
      },
    });

    const gatherWood = createAction({
      id: 'gather-wood',
      display: 'Gather Wood',
      duration: 3,
      registerTick: ctx.onTick,
      onComplete() {
        gainWood(3);
        woodcutting.addXp(5);
      },
    });

    const chopTree = createAction({
      id: 'chop-tree',
      display: 'Chop Tree',
      duration: 5,
      registerTick: ctx.onTick,
      onComplete() {
        gainWood(8);
        woodcutting.addXp(15);
      },
    });

    const gatherStone = createAction({
      id: 'gather-stone',
      display: 'Gather Loose Stones',
      duration: 3,
      registerTick: ctx.onTick,
      onComplete() {
        gainStone(2);
        mining.addXp(5);
      },
    });

    const mineOre = createAction({
      id: 'mine-ore',
      display: 'Mine Ore',
      duration: 6,
      registerTick: ctx.onTick,
      onComplete() {
        gainStone(5);
        gainGold(1);
        mining.addXp(12);
      },
    });

    const barter = createAction({
      id: 'barter',
      display: 'Barter at Market',
      duration: 4,
      registerTick: ctx.onTick,
      onComplete() {
        // Convert wood into gold (if any)
        const cost = new Decimal(3);
        if (Decimal.gte(wood.value, cost)) {
          wood.value = Decimal.sub(wood.value, cost);
          gainGold(2);
        }
      },
    });

    const actions = new Map<string, Action>([
      ['gather-sticks', gatherSticks],
      ['gather-wood', gatherWood],
      ['chop-tree', chopTree],
      ['gather-stone', gatherStone],
      ['mine-ore', mineOre],
      ['barter', barter],
    ]);

    const actionZones = new Map<string, string>([
      ['gather-sticks', 'village'],
      ['gather-wood', 'village'],
      ['barter', 'village'],
      ['chop-tree', 'forest'],
      ['gather-stone', 'quarry'],
      ['mine-ore', 'quarry'],
    ]);

    // --- Producers ----------------------------------------------------------
    beginPersistentContext('core-producers');
    const producers = createProducerCategory<ProducerDef>({
      id: 'producers',
      registerTick: ctx.onTick,
      mapProducer: (def) => ({
        resource: def.resource,
        trigger: 'continuous',
        baseRate: def.baseRate,
        display: def.name,
        purchase: {
          costResource: def.costResource,
          baseCost: def.baseCost,
          costScaling: def.costScaling,
        },
      }),
    });

    producers.register([
      {
        id: 'woodcutter',
        name: 'Woodcutter',
        baseRate: 0.4,
        resource: wood,
        costResource: wood,
        baseCost: 20,
        costScaling: 1.5,
      },
      {
        id: 'miner',
        name: 'Miner',
        baseRate: 0.2,
        resource: stone,
        costResource: gold,
        baseCost: 10,
        costScaling: 1.6,
      },
      {
        id: 'merchant-cart',
        name: 'Merchant Cart',
        baseRate: 0.1,
        resource: gold,
        costResource: stone,
        baseCost: 15,
        costScaling: 1.7,
      },
    ]);
    endPersistentContext();

    // Foreman multiplier applies to every producer's rate chain
    const foremanModifier = createMultiplicativeModifier({
      multiplier: () => foreman.effect.value,
      description: 'Foreman',
    });

    for (const entry of producers.getAll()) {
      entry.producer.rateChain.add(foremanModifier);
    }

    // --- Achievements -------------------------------------------------------
    beginPersistentContext('core-achievements');
    const achievements: Achievement[] = [
      createSimpleAchievement(
        'first-wood',
        'First Wood',
        'Gather any wood.',
        () => Decimal.gt(wood.value, 0),
      ),
      createSimpleAchievement(
        'lumberjack',
        'Lumberjack',
        'Accumulate 100 wood.',
        () => Decimal.gte(wood.value, 100),
      ),
      createSimpleAchievement(
        'stonecarver',
        'Stonecarver',
        'Accumulate 50 stone.',
        () => Decimal.gte(stone.value, 50),
      ),
      createSimpleAchievement(
        'merchant',
        'Merchant',
        'Earn 20 gold.',
        () => Decimal.gte(gold.value, 20),
      ),
      createSimpleAchievement(
        'master-woodcutter',
        'Master Woodcutter',
        'Reach Woodcutting level 10.',
        () => Decimal.gte(woodcutting.level.value, 10),
      ),
    ];

    const achievementGroup = createAchievementGroup({
      id: 'core-achievements',
      name: 'Village Milestones',
      achievements,
    });
    endPersistentContext();

    // --- Action queue + automation tiers -----------------------------------
    // Tiers unlock as the player earns achievements, gating queue execution,
    // conditional rules, and priority fill in that order. Rules/candidates are
    // empty by default — mods can extend coreState.automation to wire them.
    const earnedCount = computed(() => countEarned(achievements));

    const queue = createActionQueue({
      id: 'core-queue',
      mode: 'queue',
    });

    const automation = useAutomation({
      id: 'core-automation',
      tiers: [
        { id: 'manual', name: 'Manual', order: 0 },
        {
          id: 'sequencer',
          name: 'Sequencer',
          order: 1,
          requirement: () => earnedCount.value >= 1,
        },
        {
          id: 'conditionals',
          name: 'Conditionals',
          order: 2,
          requirement: () => earnedCount.value >= 3,
        },
        {
          id: 'priorities',
          name: 'Priorities',
          order: 3,
          requirement: () => earnedCount.value >= 5,
        },
      ],
      conditionalTier: 'conditionals',
      priorityTier: 'priorities',
      getRules: () => [],
      getCandidates: () => [],
      throttleInterval: 0.5,
    });

    queue.fillStrategy = automation.strategy;

    const runner = createActionRunner({
      queue,
      getAction: (item) => actions.get(item.id),
      registerTick: ctx.onTick,
    });

    // --- Zone unlock + achievement watcher + auto-fill ---------------------
    ctx.onTick((dt) => {
      queue.resetAdvanceCount();

      if (!zones.isUnlocked('forest') && Decimal.gte(wood.value, 10)) {
        zones.unlock('forest');
      }
      if (!zones.isUnlocked('quarry') && Decimal.gte(woodcutting.level.value, 2)) {
        zones.unlock('quarry');
      }
      for (const a of achievements) {
        if (!a.earned.value && a.canComplete.value) a.complete();
      }

      // Pull from fill strategy when idle, throttled by the automation tier.
      if (
        automation.shouldAutoBuy(dt) &&
        !queue.currentItem &&
        queue.items.value.length === 0
      ) {
        queue.dequeueNext();
      }
    });

    // --- Expose state -------------------------------------------------------
    coreState = {
      resources: { wood, stone, gold },
      skills: { woodcutting, mining },
      zones,
      actions,
      actionZones,
      producers,
      upgrades: {
        sharpAxe,
        ironPickaxe,
        foreman,
        group: upgradeGroup,
      },
      achievements: {
        list: achievements,
        group: achievementGroup,
      },
      queue,
      runner,
      automation,
    };
  },
};
