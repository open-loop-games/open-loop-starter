import {
  createCostRequirement,
  createPurchasableCategory,
  createSequencer,
  persistent,
  tunable,
  type Computable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type OverrideRegistry,
  type Persistent,
  type PurchasableCategory,
  type Sequencer,
} from 'open-loop-engine';
import type { TugData, UnitDef } from '../data/types';
import { IncomeKey } from './income';
import { LaneKey } from './lane';
import { type Side, TugTuningRegistryKey, type TugTunables } from './tuning';

/** Sequencer metadata — single field carrying the unit's archetype id so
 *  `canRun` can route to the right cooldown bucket and `'start'` handlers
 *  can spawn into the lane. */
export interface UnitSendMeta {
  archetypeId: string;
}

export const UnitsKey: Record<Side, InjectionKey<PurchasableCategory<UnitDef>>> = {
  player: Symbol('tug/match/player/units') as InjectionKey<PurchasableCategory<UnitDef>>,
  ai: Symbol('tug/match/ai/units') as InjectionKey<PurchasableCategory<UnitDef>>,
};

export const SequencerKey: Record<Side, InjectionKey<Sequencer<UnitSendMeta>>> = {
  player: Symbol('tug/match/player/sequencer') as InjectionKey<Sequencer<UnitSendMeta>>,
  ai: Symbol('tug/match/ai/sequencer') as InjectionKey<Sequencer<UnitSendMeta>>,
};

// Unit ids whose `cost` is registered with the tuning registry. Other units
// pass `def.cost` through unchanged. Mirrors Ambient's `TUNABLE_BASE_COST_IDS`
// pattern — opt-in keeps the leaf-6 bisection surface narrow and greppable.
const TUNABLE_COST_IDS = new Set<string>(['marine', 'siege-tank']);

// TODO(expansion): mirrored-instance — `createUnitsSideModule(data, side)` is
// hand-rolled v1 for both sides. Engine candidate `createSymmetricModuleSet`
// (open-loop-engine `candidate-primitives.md`, commit `0860b7d`) collapses
// this pair of installs into one factory call once a second adversarial-state
// consumer lands (Auto-battler PvP / Tug fork). Drop the marker here — first
// hand-roll site in leaf-3's module tree.

export function createUnitsSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/units`,
    dependencies: ['tug/tuning', `tug/match/${side}/income`, 'tug/match/lane'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const income = ctx.inject(IncomeKey[side]);
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
            cost: wrapCost(registry, def),
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

      ctx.provide(UnitsKey[side], shop);
      ctx.provide(SequencerKey[side], sequencer);
    },
  };
}

/**
 * Wrap a unit's static cost behind a tunable key for representative archetypes
 * (marine, siege-tank). The default closure reads `def.cost`, so unscoped
 * runs match the data layer; leaf 6's tuner pushes scopes against
 * `units/<id>/cost` to bisect against beat fire-time bands without mutating
 * data.
 */
function wrapCost(
  registry: OverrideRegistry<TugTunables>,
  def: UnitDef,
): Computable<DecimalSource> {
  if (!TUNABLE_COST_IDS.has(def.id)) return def.cost;
  const key = `units/${def.id}/cost`;
  return tunable<DecimalSource>(registry, key, () => def.cost);
}
