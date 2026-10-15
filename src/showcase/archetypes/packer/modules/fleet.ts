import {
  computed,
  persistent,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  CARRIERS,
  CONDITIONS,
  HONOUR_MULT,
  SHIPS,
  type CarrierDef,
  type ConditionId,
  type PieceId,
  type ShipId,
} from '../data';

/**
 * Fleet module — what a recommission never clears: the ship in service, the honours its
 * carriers paid, the schematics decrypted, and how far the breach line has been pushed.
 * The yard and the board read it; it reads nothing of theirs.
 */

/** The carrier holding the line's current sector: authored, or one the line raises past a ship's last. */
export interface SectorCarrier {
  def: CarrierDef;
  /** carriers raised past the ship's last authored one, this one included; 0 for an authored carrier */
  beyond: number;
}

export interface FleetApi {
  /** index into SHIPS of the ship in service */
  shipIndex: Persistent<number>;
  ship: ComputedRef<ShipId>;
  /** carriers destroyed, every ship */
  honours: Persistent<number>;
  /** the multiplier honours put on every weapon */
  honourMult: ComputedRef<number>;
  /** authored carriers destroyed, in breach-line order */
  authoredFallen: Persistent<number>;
  /** carriers destroyed past the ship's last authored one, this ship */
  beyond: Persistent<number>;
  /** whether the breach line has opened: sectors, conditions and carriers */
  lineOpen: Persistent<boolean>;
  decrypted: Persistent<PieceId[]>;
  /** the carrier holding the current sector, or null before the line opens */
  carrier: ComputedRef<SectorCarrier | null>;
  /** the carrier after it, whose sector's conditions are announced ahead */
  nextCarrier: ComputedRef<SectorCarrier | null>;
  /** what the current sector brings while its carrier holds */
  conditions: ComputedRef<readonly ConditionId[]>;
  /** whether the ship's last authored carrier has fallen, so the next ship can be commissioned */
  shipDone: ComputedRef<boolean>;
  /** whether the Dreadnought has fallen: the story's end */
  storyEnded: Persistent<boolean>;
}

export const FleetKey: InjectionKey<FleetApi> = Symbol('packer/fleet') as InjectionKey<FleetApi>;

const fleetApi = createModuleApi(FleetKey);

/** The ship in service, its carriers and what a recommission keeps. Read it after the engine starts. */
export const getFleet = fleetApi.get;

/** The conditions a carrier raised past a ship's last brings: one, then two, seeded by its count. */
function raisedConditions(sector: number): ConditionId[] {
  const pick = (i: number) => CONDITIONS[(sector * 7 + i * 3) % CONDITIONS.length]!.id;
  return sector % 2 === 0 ? [pick(0), pick(1)] : [pick(0)];
}

export function createFleetModule(): EngineModule {
  return {
    id: 'packer/fleet',
    install(ctx) {
      const shipIndex = persistent(0, { id: 'shipIndex' });
      const honours = persistent(0, { id: 'honours' });
      const authoredFallen = persistent(0, { id: 'authoredFallen' });
      const beyond = persistent(0, { id: 'beyond' });
      const lineOpen = persistent(false, { id: 'lineOpen' });
      const decrypted = persistent<PieceId[]>([], { id: 'decrypted' });
      const storyEnded = persistent(false, { id: 'storyEnded' });
      const ship = computed(() => SHIPS[shipIndex.value]!.id);

      const carrierAt = (fallen: number, past: number): SectorCarrier | null => {
        if (!lineOpen.value) return null;
        const next = CARRIERS[fallen];
        if (next && next.ship === ship.value && past === 0) return { def: next, beyond: 0 };
        const last = [...CARRIERS].reverse().find((c) => c.ship === ship.value)!;
        const sector = last.sector + past + 1;
        return {
          def: {
            ...last,
            id: `${last.id}+${past + 1}`,
            sector,
            name: `${last.name} remnant ${past + 1}`,
            conditions: raisedConditions(sector),
          },
          beyond: past + 1,
        };
      };
      const carrier = computed(() => carrierAt(authoredFallen.value, beyond.value));
      const nextCarrier = computed(() => {
        const c = carrier.value;
        if (!c) return null;
        return c.beyond === 0
          ? carrierAt(authoredFallen.value + 1, 0)
          : carrierAt(authoredFallen.value, c.beyond);
      });

      const api: FleetApi = {
        shipIndex,
        ship,
        honours,
        honourMult: computed(() => Math.pow(HONOUR_MULT, honours.value)),
        authoredFallen,
        beyond,
        lineOpen,
        decrypted,
        carrier,
        nextCarrier,
        conditions: computed(() => carrier.value?.def.conditions ?? []),
        shipDone: computed(() => {
          const last = [...CARRIERS].reverse().find((c) => c.ship === ship.value);
          return !!last && authoredFallen.value > CARRIERS.indexOf(last);
        }),
        storyEnded,
      };
      fleetApi.publish(ctx, api);
    },
  };
}
