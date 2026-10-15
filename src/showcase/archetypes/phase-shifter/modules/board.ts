import {
  Decimal,
  computed,
  createCostRequirement,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  persistent,
  tunable,
  unref,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Producer,
  type Purchasable,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  BOARD_PRICES,
  BOARD_SIDE,
  BOARD_SIDES,
  DECK,
  IDS,
  NOTES_PER_CARD,
  TIPLINE_NOTES_PER_S,
  boardStrength,
  cellAt,
} from '../data';
import { BoxKey } from './box';
import { CaseKey } from './case';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Board module — Phase II. The box is gone; the phone brings in notes, and
 * the clerks write notes up into cards, one sighting each. The player pins the
 * cards on a corkboard, and red string runs between neighbours that share a
 * person, a place or an hour. String earns leads; leads clear more wall.
 *
 * The board is a persistent cell array, and adjacency is the four-neighbour
 * arithmetic in `../data/evidence.ts`. `createSpatialGrid` is declined: the
 * spine walks the same arrangement without an engine, and one adjacency rule
 * shared by both is what keeps the prediction honest.
 */
export interface BoardApi {
  leads: Resource;
  /** Cards written up and not pinned, oldest first. */
  inbox: Persistent<string[]>;
  /** The corkboard: cell → card id, over the full 6×6. */
  pins: Persistent<(string | null)[]>;
  /** The open board's side: 3, then 4, 5, 6 as wall is cleared. */
  side: ComputedRef<number>;
  /** Clearing wall space: each purchase opens the next ring. */
  wall: Purchasable;
  /** String strength over the open board. */
  strength: ComputedRef<number>;
  /** Leads per second the string earns. */
  rate: ComputedRef<Decimal>;
  /** Cards written up so far, of the deck. */
  written: Persistent<number>;
  tipline: Producer;
  /** Pin a card from the inbox, or move a pinned one, to an open empty cell. */
  pin(cardId: string, x: number, y: number): boolean;
  /** Take a pinned card back to the inbox. */
  unpin(x: number, y: number): boolean;
}

export const BoardKey: InjectionKey<BoardApi> = Symbol(
  'phase-shifter/board',
) as InjectionKey<BoardApi>;

const boardApi = createModuleApi(BoardKey);

/** The corkboard, its inbox and the leads the string earns. Read it after the engine starts. */
export const getBoard = boardApi.get;

export function createBoardModule(): EngineModule {
  return {
    id: 'phase-shifter/board',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const { life } = ctx.inject(CaseKey);
      const box = ctx.inject(BoxKey);
      const notesPerCard = tunable(registry, 'board/notesPerCard', () => NOTES_PER_CARD);
      const cardsPerClerk = tunable(
        registry,
        'board/clerk/cardsPerS',
        () => ANCHORS.clerkCardsPerS,
      );
      const tiplineRate = tunable(registry, 'board/tipline/notesPerS', () => TIPLINE_NOTES_PER_S);
      const leadsPerStrength = tunable(
        registry,
        'board/leadsPerStrength',
        () => ANCHORS.leadsPerStrength,
      );
      const wallCosts = [0, 1, 2].map((i) =>
        tunable(registry, `board/wall/${i}/cost`, () => BOARD_PRICES[i]),
      );

      const leads = createResource<Decimal>(Decimal.dZero, { id: IDS.leads, displayName: 'leads' });
      const inbox = persistent<string[]>([], { id: 'inbox' });
      const pins = persistent<(string | null)[]>(Array(BOARD_SIDE * BOARD_SIDE).fill(null), {
        id: 'pins',
      });
      const written = persistent(0, { id: 'written' });
      /** Fraction of a card the clerks have written toward the next one. */
      const writing = persistent(0, { id: 'writing' });

      const walls = createPurchasableCategory<{ id: 'wall' }>({
        id: 'board-space',
        mapPurchasable: () => ({
          display: {
            title: 'Clear more wall',
            description: 'Take down the old notices. The board grows by a row and a column.',
          },
          requirements: (count) =>
            createCostRequirement({
              resource: leads,
              cost: computed(() => wallCosts[Number(unref(count))]?.value ?? Infinity),
            }),
          limit: BOARD_SIDES.length - 1,
          visible: life.liveGate('board-space'),
        }),
      });
      walls.register({ id: 'wall' });
      const wall = walls.getPurchasable('wall')!;
      const side = computed(() => BOARD_SIDES[Number(wall.count.value)]);
      const strength = computed(() => boardStrength(pins.value, side.value));

      // The phone's notes, and the string's leads, as two producers the doors scope.
      const sources = createProducerCategory<{ id: 'tipline' | 'strings' }>({
        id: 'board-sources',
        registerTick: ctx.onTick,
        mapProducer: (def) =>
          def.id === 'tipline'
            ? { resource: box.notes, baseRate: tiplineRate, trigger: 'continuous' }
            : {
                resource: leads,
                baseRate: computed(() => strength.value * leadsPerStrength.value),
                trigger: 'continuous',
              },
      });
      sources.register([{ id: 'tipline' }, { id: 'strings' }]);
      const tipline = sources.getProducer('tipline')!;
      const strings = sources.getProducer('strings')!;
      life.scope('tipline', [tipline.rateChain]);
      life.scope('strings', [strings.rateChain]);

      // You and your clerks write notes up into cards, as fast as your hands and the
      // notes allow. Your own pair of hands means a board without clerks still fills.
      const writeLive = life.isLive('clerk-write');
      ctx.onTick((dt) => {
        if (!writeLive.value) return;
        writing.value = Math.min(
          writing.value + (box.clerks.value.toNumber() + 1) * cardsPerClerk.value * dt,
          1,
        );
        while (
          writing.value >= 1 &&
          written.value < DECK.length &&
          Decimal.gte(box.notes.value, notesPerCard.value)
        ) {
          box.notes.value = Decimal.sub(box.notes.value, notesPerCard.value);
          writing.value -= 1;
          inbox.value = [...inbox.value, DECK[written.value].id];
          written.value += 1;
        }
      });

      const pinLive = life.isLive('pin');
      const open = (x: number, y: number) => x >= 0 && y >= 0 && x < side.value && y < side.value;

      const api: BoardApi = {
        leads,
        inbox,
        pins,
        side,
        wall,
        strength,
        rate: computed(() => new Decimal(strings.computedRate.value)),
        written,
        tipline,
        pin(cardId, x, y) {
          if (!pinLive.value || !open(x, y) || pins.value[cellAt(x, y)]) return false;
          const from = pins.value.indexOf(cardId);
          if (from < 0 && !inbox.value.includes(cardId)) return false;
          const next = [...pins.value];
          if (from >= 0) next[from] = null;
          next[cellAt(x, y)] = cardId;
          pins.value = next;
          if (from < 0) inbox.value = inbox.value.filter((id) => id !== cardId);
          return true;
        },
        unpin(x, y) {
          const id = pins.value[cellAt(x, y)];
          if (!pinLive.value || !id) return false;
          const next = [...pins.value];
          next[cellAt(x, y)] = null;
          pins.value = next;
          inbox.value = [...inbox.value, id];
          return true;
        },
      };
      boardApi.publish(ctx, api);
    },
  };
}
