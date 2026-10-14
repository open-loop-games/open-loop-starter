import {
  addResource,
  computed,
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
  createResource,
  Decimal,
  Formula,
  persistent,
  toNumber,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  TROOPS,
  gateHp,
  startSilver,
  titheBaseCost,
  titheCostRatio,
  troop,
  type TroopDef,
  type TroopId,
} from '../data';
import { CausewayKey } from './causeway';
import { ChronicleKey } from './chronicle';
import type { Side } from './sides';
import { TugTuningRegistryKey } from './tuning';

export interface KeepApi {
  side: Side;
  silver: Resource;
  /** Silver a second, every multiplier applied. */
  income: ComputedRef<number>;
  tithe: Purchasable;
  troops: PurchasableCategory<TroopDef>;
  /** Damage the gate has taken this battle; it falls at `gateMax`. */
  gateDamage: Persistent<number>;
  gateMax: ComputedRef<number>;
  /** Whether this keep can raise the troop now: chartered, and arrived. */
  isOpen(id: TroopId): boolean;
  /** Raise up to `squads` squads into the bailey, as many as silver and the muster allow. */
  raise(id: TroopId, squads?: number): number;
  /** Squads the keep could raise of a troop right now. */
  affordable(id: TroopId): number;
  accrue(dt: number): void;
  /** Opens a battle: the opening purse, a whole gate. */
  open(): void;
}

export const KeepKeys: Record<Side, InjectionKey<KeepApi>> = {
  player: Symbol('tug/keep-player') as InjectionKey<KeepApi>,
  rival: Symbol('tug/keep-rival') as InjectionKey<KeepApi>,
};

const apis: Partial<Record<Side, KeepApi>> = {};

export function getKeep(side: Side): KeepApi {
  return apis[side]!;
}

/**
 * One keep's battle economy, built once per side from the same code, so the two economies
 * are symmetric by construction. Only the chains they bind into differ: boons on Fairhold's,
 * the rung on the rival's. The harvest is flat: ground held on the causeway pays nothing.
 */
// TODO(expansion): symmetric module set — one per-side factory whose persistent context,
// resource and category ids are suffixed by hand with the side.
export function createKeepModule(side: Side): EngineModule {
  return {
    id: `tug/keep-${side}`,
    dependencies: ['tug/tuning', 'tug/chronicle', 'tug/causeway'],
    install(ctx) {
      const tuning = ctx.inject(TugTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);
      const causeway = ctx.inject(CausewayKey);
      const chains = chronicle.chains[side];
      const baseIncome = tunable(tuning, 'income/base', () => ANCHORS.income);

      const silver = createResource(startSilver, { id: `${side}-silver`, displayName: 'Silver' });
      const gateDamage = persistent(0, { id: 'gate-damage' });
      const gateMax = computed(() => toNumber(chains.gate.apply(gateHp)));

      const isOpen = (id: TroopId): boolean => {
        const def = troop(id);
        if (def.arrivesAt !== undefined && causeway.clock.value < def.arrivesAt) return false;
        if (!def.charter) return true;
        if (side === 'rival') return chronicle.rung.value >= def.charter.rivalRung;
        return chronicle.level(def.charter.boon) > 0;
      };

      const troops = createPurchasableCategory<TroopDef>({
        id: `${side}-troops`,
        mapPurchasable: (def) => ({
          display: { title: def.ours.name, description: def.ours.role },
          requirements: [
            createCostRequirement({
              resource: silver,
              cost: () => def.costSeconds * baseIncome.value,
              // A squad's price does not move with how many are raised, so a wave is priced
              // exactly; the default cap of one would silently shrink every wave to a squad.
              maxBulkCount: Decimal.dInf,
            }),
            createBooleanRequirement({ met: () => isOpen(def.id), description: 'Troop open' }),
            createBooleanRequirement({
              met: () => causeway.room(side) >= def.squad,
              description: 'Room under the muster',
            }),
          ],
          visible: () => side === 'rival' || !def.charter || isOpen(def.id),
          onPurchase: (count) => {
            causeway.stage(side, def.id, toNumber(count));
            if (side === 'player' && !chronicle.raised.value[def.id])
              chronicle.raised.value = { ...chronicle.raised.value, [def.id]: true };
          },
        }),
      });
      troops.register(TROOPS);

      const titheStep = ANCHORS.titheStep;
      const tithes: PurchasableCategory<{ id: string }> = createPurchasableCategory<{ id: string }>(
        {
          id: `${side}-tithe`,
          mapPurchasable: () => ({
            display: {
              title: 'Raise the tithe',
              description: `+${titheStep * 100}% silver. The villages grumble.`,
            },
            requirements: (level) =>
              createCostRequirement({
                resource: silver,
                // The ladder is priced in seconds of income, so it follows `income/base`.
                cost: Formula.exponential(
                  level,
                  computed(() => (titheBaseCost / ANCHORS.income) * baseIncome.value),
                  titheCostRatio,
                ),
              }),
            purchaseMaxByDefault: false,
            grants: [
              {
                chain: chains.income,
                multiplier: (): number =>
                  1 + titheStep * toNumber(tithes.getPurchasable('tithe')?.count.value ?? 0),
                description: 'Raised tithe',
              },
            ],
          }),
        },
      );
      tithes.register({ id: 'tithe' });
      const tithe = tithes.getPurchasable('tithe')!;

      const income = computed(() => toNumber(chains.income.apply(baseIncome.value)));

      function affordable(id: TroopId): number {
        const def = troop(id);
        if (!isOpen(id)) return 0;
        const price = def.costSeconds * baseIncome.value;
        const bySilver = Math.floor(toNumber(silver.value) / price);
        const byMuster = Math.floor(causeway.room(side) / def.squad);
        return Math.max(0, Math.min(bySilver, byMuster));
      }

      function raise(id: TroopId, squads = 1): number {
        const n = Math.min(squads, affordable(id));
        if (n <= 0) return 0;
        return toNumber(troops.getPurchasable(id)!.purchase(n));
      }

      apis[side] = {
        side,
        silver,
        income,
        tithe,
        troops,
        gateDamage,
        gateMax,
        isOpen,
        raise,
        affordable,
        accrue: (dt) => addResource(silver, income.value * dt),
        open: () => {
          silver.value = ANCHORS.startSeconds * baseIncome.value;
          gateDamage.value = 0;
        },
      };
      ctx.provide(KeepKeys[side], apis[side]!);
    },
  };
}
