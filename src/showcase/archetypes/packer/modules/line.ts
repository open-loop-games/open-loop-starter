import {
  computed,
  createCycle,
  Decimal,
  shallowRef,
  watch,
  type ComputedRef,
  type Cycle,
  type EngineModule,
  type InjectionKey,
  type ShallowRef,
} from '@open-loop/engine';
import {
  CARRIER_WINDOW_S,
  CARRIERS,
  COMMISSION_PURSE,
  LINE_OPENS,
  PULSE_COST0,
  SHIPS,
  carrierHull,
} from '../data';
import { BOARD_CONTEXT, BoardKey } from './board';
import { FleetKey, type SectorCarrier } from './fleet';
import { YARD_CONTEXT, YardKey } from './yard';

/**
 * Line module — the breach line in front of the bow: engaging the carrier that holds the
 * current sector, and recommissioning into the next ship once the last carrier the ship
 * was built for has fallen.
 *
 * An engagement is a firepower check: the board fires at the carrier's hull for at most a
 * window, and the carrier falls or withdraws. A withdrawal costs nothing; the player
 * re-fits and engages again. A fall opens the next sector and pays an honour.
 */

/** Hull a raised carrier gains over the one before it, past a ship's last authored carrier. */
export const RAISED_HULL_RATIO = 2;

export interface Engagement {
  carrier: SectorCarrier;
  hull: number;
  remaining: number;
  /** seconds since it began */
  elapsed: number;
}

export interface LineApi {
  engagement: ShallowRef<Engagement | null>;
  /** how the last engagement ended */
  last: ShallowRef<'fell' | 'withdrew' | null>;
  /** a carrier's hull: solved by the spine for an authored one, doubled sector on sector past it */
  hullOf(c: SectorCarrier): number;
  /** whether the current carrier can be engaged: its section plated, no engagement running */
  canEngage: ComputedRef<boolean>;
  engage(): boolean;
  /** whether the next ship can be commissioned */
  canRecommission: ComputedRef<boolean>;
  /** clear the hull, the yard and the bay, and commission the next ship with its grant */
  recommission(): boolean;
  cycle: Cycle;
}

export const LineKey: InjectionKey<LineApi> = Symbol('packer/line') as InjectionKey<LineApi>;

let api: LineApi;

export function getLine(): LineApi {
  return api;
}

export function createLineModule(): EngineModule {
  return {
    id: 'packer/line',
    dependencies: ['packer/board'],
    install(ctx) {
      const fleet = ctx.inject(FleetKey);
      const yard = ctx.inject(YardKey);
      const board = ctx.inject(BoardKey);

      watch(
        () =>
          fleet.ship.value !== 'frigate' || !!yard.hull.getPurchasable(LINE_OPENS)?.active.value,
        (open) => {
          if (open && !fleet.lineOpen.value) fleet.lineOpen.value = true;
        },
        // Sync: a headless driver reads the line in the same turn the plate lands.
        { immediate: true, flush: 'sync' },
      );

      const hullOf = (c: SectorCarrier) => {
        if (c.beyond === 0) return carrierHull(c.def.id);
        const last = [...CARRIERS].reverse().find((d) => d.ship === c.def.ship)!;
        return carrierHull(last.id) * Math.pow(RAISED_HULL_RATIO, c.beyond);
      };

      const engagement = shallowRef<Engagement | null>(null);
      const last = shallowRef<'fell' | 'withdrew' | null>(null);
      const canEngage = computed(() => {
        const c = fleet.carrier.value;
        if (!c || engagement.value) return false;
        return c.beyond === 0 ? yard.plated(c.def.after) : true;
      });

      ctx.onTick((dt) => {
        const e = engagement.value;
        if (!e) return;
        const remaining = e.remaining - board.firepower.value * dt;
        const elapsed = e.elapsed + dt;
        if (remaining <= 0) {
          engagement.value = null;
          last.value = 'fell';
          fleet.honours.value++;
          if (e.carrier.beyond === 0) {
            fleet.authoredFallen.value++;
            if (e.carrier.def.id === CARRIERS[CARRIERS.length - 1]!.id)
              fleet.storyEnded.value = true;
          } else fleet.beyond.value++;
        } else if (elapsed >= CARRIER_WINDOW_S) {
          engagement.value = null;
          last.value = 'withdrew';
        } else engagement.value = { ...e, remaining, elapsed };
      });

      const cycle = createCycle({
        resetPersistentContexts: [YARD_CONTEXT, BOARD_CONTEXT],
        // A lifetime ref survives a context reset unless named: the next ship's gates count from zero.
        thingsToReset: [yard.salvage.cumulative!],
        registerTick: ctx.onTick,
        onBeforeEnd: () => (canRecommission.value ? undefined : false),
        onEnd: () => {
          fleet.shipIndex.value++;
          fleet.beyond.value = 0;
          engagement.value = null;
        },
      });
      // The grant is a gain after the reset, so it reaches the new ship's cumulative salvage.
      cycle.on('afterEnd', () => {
        yard.salvage.value = Decimal.add(
          yard.salvage.value,
          COMMISSION_PURSE[fleet.ship.value] - PULSE_COST0,
        );
      });
      const canRecommission = computed(
        () => fleet.shipDone.value && fleet.shipIndex.value < SHIPS.length - 1 && !engagement.value,
      );

      api = {
        engagement,
        last,
        hullOf,
        canEngage,
        engage() {
          const c = fleet.carrier.value;
          if (!c || !canEngage.value) return false;
          const hull = hullOf(c);
          engagement.value = { carrier: c, hull, remaining: hull, elapsed: 0 };
          return true;
        },
        canRecommission,
        recommission: () => cycle.end(),
        cycle,
      };
      ctx.provide(LineKey, api);
    },
  };
}
