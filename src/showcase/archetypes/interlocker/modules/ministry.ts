import {
  computed,
  createSeededRNG,
  persistent,
  subtractResource,
  toNumber,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import {
  CHARTER_EFFECTS,
  EXHIBITED,
  ORDER_LAPSE,
  ORDER_LINES,
  ORDER_PERIOD,
  RAW_EQ,
  RENOWN_OUTPUT_STEP,
  RHO_WORKER,
  ROLES,
  RECIPES,
  orderValue,
  type ResourceId,
} from '../data';
import { EmpireKey } from './empire';
import { TelegraphKey } from './telegraph';
import { InterlockerTuningRegistryKey } from './tuning';
import { WorksKey } from './works';

/**
 * Ministry module — the Ministry of War's orders. Once the works have shown at an
 * Exposition, the Ministry offers an order every ORDER_PERIOD of the run, the first half a
 * period in: one to three
 * worked goods, worth `orderValue` of the full crew shared evenly among its lines, so every
 * order scores alike and only how long it takes to fill depends on the goods. It stands for
 * ORDER_LAPSE. A line can outgrow its bin, so an order is filled in consignments: each
 * delivery sends what the bins hold, and the completed order goes into the dossier, which
 * the jury scores beside the exhibit and no bin caps. A lapsed order's consignments are
 * lost. Its persistent context is cleared by an Exposition.
 */

export interface Order {
  id: number;
  /** goods asked for */
  lines: Partial<Record<ResourceId, number>>;
  /** goods consigned so far */
  filled: Partial<Record<ResourceId, number>>;
  /** run-seconds when it lapses */
  lapsesAt: number;
}

export interface MinistryApi {
  /** orders standing now */
  orders: Persistent<Order[]>;
  /** the jury's score of every order delivered this run */
  dossier: Persistent<number>;
  /** seconds until the next offer; Infinity before the first Exposition */
  nextOfferIn: ComputedRef<number>;
  /** seconds before an order lapses */
  lapsesIn(order: Order): number;
  /** whether the bins hold anything an order still lacks */
  canDeliver(id: number): boolean;
  /** consign what the bins hold to an order; returns the score it adds once complete, else 0 */
  deliver(id: number): number;
}

export const MinistryKey: InjectionKey<MinistryApi> = Symbol(
  'interlocker/ministry',
) as InjectionKey<MinistryApi>;

/** The ministry's persistent context: what an Exposition clears. */
export const MINISTRY_CONTEXT = 'interlocker/ministry';

let api: MinistryApi;

export function getMinistry(): MinistryApi {
  return api;
}

/** The workshop that makes each exhibited good. */
const MAKER = Object.fromEntries(ROLES.map((r) => [RECIPES[r.id].output, r.id])) as Record<
  ResourceId,
  (typeof ROLES)[number]['id']
>;

export function createMinistryModule(): EngineModule {
  return {
    id: MINISTRY_CONTEXT,
    dependencies: ['interlocker/empire', 'interlocker/works'],
    install(ctx) {
      const empire = ctx.inject(EmpireKey);
      const works = ctx.inject(WorksKey);
      const telegraph = ctx.inject(TelegraphKey);
      const period = tunable(
        ctx.inject(InterlockerTuningRegistryKey),
        'ministry/orderPeriod',
        () => ORDER_PERIOD,
      );

      const clock = persistent(0, { id: 'clock' });
      const offered = persistent(0, { id: 'offered' });
      const nextId = persistent(0, { id: 'nextId' });
      const orders = persistent<Order[]>([], { id: 'orders' });
      const dossier = persistent(0, { id: 'dossier' });
      const shown = computed(() => empire.lifetimeRenown.value > 0);

      // Input units a second the full crew moves, as the spine's order is sized on.
      const units = () =>
        works.workersTotal.value *
        RHO_WORKER *
        (1 + RENOWN_OUTPUT_STEP * empire.lifetimeRenown.value) *
        (empire.holds('ecole').value ? CHARTER_EFFECTS.ecole : 1);

      function offer(): void {
        const open = EXHIBITED.filter((r) => works.roleOpen[MAKER[r]].value);
        if (!open.length) return;
        // Seeded by the works' history, so a run replays the same orders.
        const rng = createSeededRNG(
          Math.round(empire.lifetimeRenown.value) * 1009 + offered.value * 7919 + 17,
        );
        const count = Math.min(
          open.length,
          ORDER_LINES[0] + Math.floor(rng() * (ORDER_LINES[1] - ORDER_LINES[0] + 1)),
        );
        const pool = [...open];
        const lines: Order['lines'] = {};
        for (let i = 0; i < count; i++) {
          const r = pool.splice(Math.floor(rng() * pool.length), 1)[0]!;
          lines[r] = Math.max(1, Math.round(orderValue(units()) / count / RAW_EQ[r]));
        }
        orders.value = [
          ...orders.value,
          { id: ++nextId.value, lines, filled: {}, lapsesAt: clock.value + ORDER_LAPSE },
        ];
        telegraph.send(
          `Ministry of War orders ${Object.entries(lines)
            .map(([r, q]) => `${q} ${r}`)
            .join(', ')}`,
          'order',
        );
      }

      ctx.onTick((dt) => {
        clock.value += dt;
        if (orders.value.some((o) => o.lapsesAt <= clock.value))
          orders.value = orders.value.filter((o) => o.lapsesAt > clock.value);
        if (shown.value && clock.value >= (offered.value + 1 / 2) * period.value) {
          offered.value++;
          offer();
        }
      });

      const find = (id: number) => orders.value.find((o) => o.id === id);
      const lacks = (o: Order, r: ResourceId) => o.lines[r]! - (o.filled[r] ?? 0);
      const canDeliver = (id: number) => {
        const o = find(id);
        return (
          !!o &&
          (Object.keys(o.lines) as ResourceId[]).some(
            (r) => lacks(o, r) > 0 && toNumber(works.res[r].value) >= 1,
          )
        );
      };

      api = {
        orders,
        dossier,
        nextOfferIn: computed(() =>
          shown.value ? (offered.value + 1 / 2) * period.value - clock.value : Infinity,
        ),
        lapsesIn: (order) => Math.max(0, order.lapsesAt - clock.value),
        canDeliver,
        deliver(id) {
          if (!canDeliver(id)) return 0;
          const o = find(id)!;
          const filled = { ...o.filled };
          for (const r of Object.keys(o.lines) as ResourceId[]) {
            const sent = Math.min(lacks(o, r), Math.floor(toNumber(works.res[r].value)));
            if (sent <= 0) continue;
            subtractResource(works.res[r], sent);
            filled[r] = (filled[r] ?? 0) + sent;
          }
          const done = (Object.keys(o.lines) as ResourceId[]).every(
            (r) => (filled[r] ?? 0) >= o.lines[r]!,
          );
          if (!done) {
            orders.value = orders.value.map((x) => (x.id === id ? { ...x, filled } : x));
            return 0;
          }
          let score = 0;
          for (const [r, q] of Object.entries(o.lines)) score += q! * RAW_EQ[r as ResourceId];
          dossier.value += score;
          orders.value = orders.value.filter((x) => x.id !== id);
          telegraph.send(
            `Order delivered to the Ministry — dossier +${Math.round(score)}`,
            'order',
          );
          return score;
        },
      };
      ctx.provide(MinistryKey, api);
    },
  };
}
