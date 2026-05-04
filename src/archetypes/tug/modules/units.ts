import {
  createCostRequirement,
  createPurchasableCategory,
  createSequencer,
  persistent,
  tunable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type PurchasableCategory,
  type Sequencer,
} from 'open-loop-engine';
import type { TugData, UnitDef } from '../data/types';
import { getIncome } from './income';
import { LaneKey } from './lane';
import { type Side, TugTuningRegistryKey } from './tuning';

/** Sequencer metadata — single field carrying the unit's archetype id so
 *  `canRun` can route to the right cooldown bucket and `'start'` handlers
 *  can spawn into the lane. */
export interface UnitSendMeta {
  archetypeId: string;
}

const unitsBySide = {} as Record<Side, PurchasableCategory<UnitDef>>;

export function getUnits(side: Side): PurchasableCategory<UnitDef> {
  return unitsBySide[side];
}

export const SequencerKey: Record<Side, InjectionKey<Sequencer<UnitSendMeta>>> = {
  player: Symbol('tug/match/player/sequencer') as InjectionKey<Sequencer<UnitSendMeta>>,
  ai: Symbol('tug/match/ai/sequencer') as InjectionKey<Sequencer<UnitSendMeta>>,
};

/** Per-archetype send cooldown timers, exposed so the UI's UnitShop can render
 *  cooldown progress reactively. The sequencer's `canRun` already gates dispatch
 *  via these refs — exposure is consumer-side display only. */
export const UnitsCooldownKey: Record<Side, InjectionKey<Record<string, Persistent<number>>>> = {
  player: Symbol('tug/match/player/units-cooldown') as InjectionKey<
    Record<string, Persistent<number>>
  >,
  ai: Symbol('tug/match/ai/units-cooldown') as InjectionKey<Record<string, Persistent<number>>>,
};

// Unit ids whose `cost` is registered with the tuning registry. Other units
// pass `def.cost` through unchanged. Mirrors Ambient's `TUNABLE_BASE_COST_IDS`
// pattern — opt-in keeps the leaf-6 bisection surface narrow and greppable.
const TUNABLE_COST_IDS = new Set<string>(['marine', 'siege-tank']);

// TODO(expansion): mirrored-instance — `createUnitsSideModule(data, side)`
// hand-rolls a per-side install pair. Engine candidate
// `createSymmetricModuleSet` (open-loop-engine `candidate-primitives.md`)
// collapses the pair into one factory call once a second adversarial-state
// consumer lands.

export function createUnitsSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/units`,
    dependencies: ['tug/tuning', `tug/match/${side}/income`, 'tug/match/lane'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const income = getIncome(side);
      const lane = ctx.inject(LaneKey);

      // Per-archetype send cooldown. One persistent ref per archetype, named
      // `cooldown-<archetypeId>` so save keys stay stable + greppable. Reset
      // to `def.sendCooldownSec` on each `'start'` event; ticked down to 0
      // each frame; gates the sequencer via `canRun`.
      const cooldown: Record<string, Persistent<number>> = {};
      for (const def of data.units) {
        cooldown[def.id] = persistent<number>(0, { name: `cooldown-${def.id}` });
      }

      // The shop's `Purchasable.purchase()` flow handles cost subtraction
      // through the cost requirement; `onPurchase` enqueues into the
      // sequencer (one enqueue per level bought, so a buy-N covers N sends).
      // The sequencer's `canRun` then paces dispatch against per-archetype
      // cooldowns; the `'start'` handler spawns into the lane.
      let sequencerRef: Sequencer<UnitSendMeta> | null = null;

      const shop = createPurchasableCategory<UnitDef>({
        id: `tug/match/${side}/units`,
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.role },
          requirements: createCostRequirement({
            resource: income,
            cost: TUNABLE_COST_IDS.has(def.id)
              ? tunable(registry, `units/${def.id}/cost`, () => def.cost)
              : def.cost,
          }),
          limit: Infinity,
          onPurchase: (amount) => {
            if (!sequencerRef) return;
            // amount is `DecimalSource`; for unit sends it'll be 1 per
            // single-purchase, or N for purchaseMax (rare in shop UI but
            // valid). Coerce to number for a tight loop.
            const n = Number(amount);
            for (let i = 0; i < n; i++) {
              sequencerRef.enqueue({ id: def.id, metadata: { archetypeId: def.id } });
            }
          },
        }),
      });
      shop.register(data.units);

      const sequencer = createSequencer<UnitSendMeta>({
        id: `tug/match/${side}/sequencer`,
        mode: 'queue',
        canRun: (item) => {
          const remaining = cooldown[item.metadata.archetypeId];
          if (!remaining) return 'never';
          return remaining.value <= 0 ? 'now' : 'notNow';
        },
        registerTick: ctx.onTick,
      });
      sequencerRef = sequencer;

      // On dispatch: spawn the unit, reset its archetype cooldown, complete
      // the queue slot so the next item can dispatch (which may itself hold
      // on `'notNow'` and ride the retry tick until cooldown clears).
      sequencer.on('start', (item) => {
        const def = data.units.find((u) => u.id === item.metadata.archetypeId);
        if (!def) {
          sequencer.complete();
          return;
        }
        lane.spawn(side, def.id);
        cooldown[def.id].value = def.sendCooldownSec;
        sequencer.complete();
      });

      // Decrement cooldowns each tick. The sequencer's retry tick handles
      // re-evaluation of `canRun` independently — we just keep the timers
      // moving. Floor at 0 so saved snapshots in the past still restart
      // cleanly without negative drift.
      ctx.onTick((dt) => {
        for (const id of Object.keys(cooldown)) {
          const r = cooldown[id];
          if (r.value > 0) r.value = Math.max(0, r.value - dt);
        }
      });

      unitsBySide[side] = shop;
      ctx.provide(SequencerKey[side], sequencer);
      ctx.provide(UnitsCooldownKey[side], cooldown);
    },
  };
}
