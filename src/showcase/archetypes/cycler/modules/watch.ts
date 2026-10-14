/**
 * One watch on the rock: the board, the tideline, the tower and the day/night alternation
 * that drives them. The light going out resets this module's whole context; the logbook
 * entries it pays are written after the reset returns, into `./logbook.ts`.
 *
 * Day and night share every piece of state: one salvage pile, one board, one tower. A phase
 * changes which verbs are open and which tick runs:
 *   day:   haul nets, build, take up, mend, take a find, light the lamp early
 *   night: shore up the struck side; the storm's breakers land on a schedule
 * Nets catch through both, more at night, and the night's catch waits on the tideline for
 * the morning, so the board carries one phase into the next.
 */
import {
  addResource,
  computed,
  createCostRequirement,
  createCycle,
  createInventory,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  Formula,
  integerRoot,
  persistent,
  random,
  ref,
  shallowRef,
  subtractResource,
  TickDriverKey,
  toNumber,
  weightedPick,
  type ComputedRef,
  type Cycle,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Inventory,
  type Persistent,
  type PurchasableCategory,
  type Ref,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  BREAKERS_FIRST_NIGHT,
  FIND_EFFECT,
  FINDS,
  KNOWLEDGE_EFFECT,
  OFFER_SIZE,
  PIECES,
  POSTINGS,
  QUARTER_NAME,
  QUARTERS,
  bentG,
  type FindId,
  type PieceDef,
  type PieceKind,
  type PostingDef,
  type Quarter,
} from '../data';
import {
  cellKey,
  groundAt,
  ringAround,
  SHORE_CELLS,
  sideWards,
  viewOf,
  type OccupancyView,
  type Placed,
  type WardFactors,
} from './rock';
import { LogbookKey, type WatchSummary } from './logbook';

export type Phase = 'setup' | 'day' | 'night';

/** One breaker as it landed: what the UI flashes and the log reads. */
export interface Strike {
  index: number;
  quarter: Quarter;
  force: number;
  leak: number;
}

export interface WatchApi {
  phase: Persistent<Phase>;
  /** The night the watch is on: night n follows day n. */
  night: Persistent<number>;
  /** Seconds into the current phase. */
  clock: Persistent<number>;
  phaseLength: ComputedRef<number>;
  /** Tonight's quarter, forecast at dawn. */
  quarter: Persistent<Quarter>;
  posting: ComputedRef<PostingDef>;
  /** Storm growth for this watch, frozen at its start. */
  g: Persistent<number>;
  /** The watch cycle: `count` is the watches kept, `elapsed` this watch's seconds. */
  cycle: Cycle;
  salvage: Resource<DecimalSource>;
  integrity: Resource<DecimalSource>;
  integrityMax: Persistent<number>;
  /** Force the walls turned this watch: one of the payout's two sources. */
  weathered: Resource<DecimalSource>;
  /** Salvage banked this watch: the payout's other source. */
  gathered: Resource<DecimalSource>;
  placed: Persistent<Placed[]>;
  board: ComputedRef<OccupancyView>;
  pieces: PurchasableCategory<PieceDef>;
  tideline: Inventory;
  wards: ComputedRef<Record<Quarter, number>>;
  wardFactors: ComputedRef<WardFactors>;
  /** Tonight's storm: total force across every breaker. */
  storm: ComputedRef<number>;
  breakers: ComputedRef<number>;
  struck: Persistent<number>;
  /** Ward shoring has added to the struck side tonight. */
  shored: Persistent<number>;
  shoreCost: ComputedRef<number>;
  repairCost: (points: number) => number;
  offer: Persistent<FindId[]>;
  /** One net's catch per second in the calm, after every multiplier. */
  netRate: ComputedRef<number>;
  lastStrike: Ref<Strike | null>;
  log: Ref<string[]>;

  startWatch: () => void;
  /** Starts the first watch when none has been kept: there is only one posting yet. */
  openFirstWatch: () => void;
  build: (kind: PieceKind, x: number, y: number) => boolean;
  /** Takes a piece up and refunds its last copy's price in full. */
  clear: (x: number, y: number) => boolean;
  haul: (x: number, y: number) => number;
  haulAll: () => number;
  mend: (points: number) => number;
  take: (find: FindId) => boolean;
  lightLamp: () => boolean;
  shoreUp: () => boolean;
  /** The price of the next copy of a piece. */
  priceOf: (kind: PieceKind) => number;
}

export const WatchKey: InjectionKey<WatchApi> = Symbol('cycler/watch');

const LOG_LINES = 7;
const WATCH_CONTEXT = 'cycler/watch';

let api: WatchApi;

export function getWatch(): WatchApi {
  return api;
}

export function createWatchModule(): EngineModule {
  return {
    id: WATCH_CONTEXT,
    dependencies: ['cycler/logbook'],
    install(ctx) {
      const logbook = ctx.inject(LogbookKey);
      const tickDriver = ctx.inject(TickDriverKey);
      const spine = logbook.spine;

      const salvage = createResource<DecimalSource>(0, { id: 'salvage', displayName: 'Salvage' });
      const integrity = createResource<DecimalSource>(0, { id: 'integrity', displayName: 'Tower' });
      const weathered = createResource<DecimalSource>(0, {
        id: 'weathered',
        displayName: 'Force weathered',
      });
      const gathered = createResource<DecimalSource>(0, {
        id: 'gathered',
        displayName: 'Salvage gathered',
      });

      const phase = persistent<Phase>('setup', { id: 'phase' });
      const night = persistent(1, { id: 'night' });
      const clock = persistent(0, { id: 'clock' });
      const quarter = persistent<Quarter>('N', { id: 'quarter' });
      const postingId = persistent(POSTINGS[0].id, { id: 'posting' });
      const g = persistent<number>(ANCHORS.gRef, { id: 'g' });
      // The opening storm, pegged at the watch's start and frozen for it: power bought
      // mid-watch would otherwise move a storm the watch already planned for.
      const w0 = persistent(0, { id: 'w0' });
      const integrityMax = persistent(0, { id: 'integrity-max' });
      const placed = persistent<Placed[]>([], { id: 'placed' });
      const struck = persistent(0, { id: 'struck' });
      const shored = persistent(0, { id: 'shored' });
      const shoreUses = persistent(0, { id: 'shore-uses' });
      const offer = persistent<FindId[]>([], { id: 'offer' });
      const brass = persistent(0, { id: 'brass' });
      const cork = persistent(0, { id: 'cork' });
      const glass = persistent(false, { id: 'glass' });

      const lastStrike = ref<Strike | null>(null);
      const log = shallowRef<string[]>([]);
      function note(line: string): void {
        log.value = [line, ...log.value].slice(0, LOG_LINES);
      }

      const posting = computed(() => POSTINGS.find((p) => p.id === postingId.value) ?? POSTINGS[0]);
      logbook.setPostingOpen(() => phase.value === 'setup');

      // ─── Ward ───
      logbook.wardChain.bind({
        text: 'Brass fittings',
        modifier: createMultiplicativeModifier({
          multiplier: () => 1 + FIND_EFFECT.brass * brass.value,
          description: 'Brass fittings',
        }),
      });
      const wardFactors = computed<WardFactors>(() => ({
        wardPerWall: logbook.wardPerWall.value,
        brace: ANCHORS.brace,
        buttress: ANCHORS.buttress,
        mult: toNumber(logbook.wardChain.apply(1)),
      }));
      const board = computed(() => viewOf(placed.value));
      const wards = computed(() => sideWards(board.value, wardFactors.value));

      // ─── Storm ───
      const phaseLength = computed(() =>
        phase.value === 'night' ? logbook.nightSeconds.value : logbook.daySeconds.value,
      );
      const storm = computed(
        () => w0.value * g.value ** (night.value - 1) * (glass.value ? FIND_EFFECT.glass : 1),
      );
      const breakers = computed(() => BREAKERS_FIRST_NIGHT - 1 + night.value);

      // ─── Tideline ───
      logbook.wrackChain.bind({
        text: 'Posting',
        modifier: createMultiplicativeModifier({
          multiplier: () => posting.value.wrack,
          description: 'Posting',
        }),
      });
      const netRate = computed(() => toNumber(logbook.wrackChain.apply(logbook.netRate.value)));
      // A net holds one surging night plus a slack of calm, at whatever it catches now.
      const tideline = createInventory({
        id: 'tideline',
        baseCapacity: computed(
          () =>
            netRate.value *
            (ANCHORS.nightSurge * logbook.nightSeconds.value + ANCHORS.netSlackDaySeconds) *
            (1 + FIND_EFFECT.cork * cork.value),
        ),
        overflow: 'discard',
        items: SHORE_CELLS.map((c) => cellKey(c.x, c.y)),
      });

      // ─── Pieces ───
      const pieces = createPurchasableCategory<PieceDef>({
        id: 'pieces',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: (count) =>
            createCostRequirement({
              resource: salvage,
              cost: Formula.exponential(
                count,
                computed(() => spine.value.prices[def.id].base),
                computed(() => spine.value.prices[def.id].growth),
              ),
            }),
        }),
      });
      pieces.register([...PIECES]);
      const priceOf = (kind: PieceKind) => toNumber(pieces.getPurchasable(kind)!.getCost(1));

      function occupant(x: number, y: number): Placed | undefined {
        return placed.value.find((p) => p.x === x && p.y === y);
      }

      function build(kind: PieceKind, x: number, y: number): boolean {
        if (phase.value !== 'day') return false;
        const def = PIECES.find((p) => p.id === kind)!;
        if (groundAt(x, y) !== def.ground || occupant(x, y)) return false;
        if (toNumber(pieces.getPurchasable(kind)!.purchase(1)) < 1) return false;
        placed.value = [...placed.value, { kind, x, y }];
        return true;
      }

      function clear(x: number, y: number): boolean {
        if (phase.value !== 'day') return false;
        const p = occupant(x, y);
        if (!p) return false;
        if (p.kind === 'net') haul(x, y);
        const purchasable = pieces.getPurchasable(p.kind)!;
        purchasable.count.value = Math.max(0, toNumber(purchasable.count.value) - 1);
        addResource(salvage, purchasable.getCost(1));
        placed.value = placed.value.filter((q) => q !== p);
        return true;
      }

      function bank(amount: number): number {
        if (amount <= 0) return 0;
        addResource(salvage, amount);
        addResource(gathered, amount);
        return amount;
      }

      function haulKey(key: string): number {
        const held = toNumber(tideline.get(key));
        tideline.subtract(key, held);
        return bank(held);
      }

      /** The keeper walks the tideline by day only. */
      function haul(x: number, y: number): number {
        if (phase.value !== 'day') return 0;
        return haulKey(cellKey(x, y));
      }

      function haulAll(): number {
        if (phase.value !== 'day') return 0;
        let total = 0;
        for (const p of placed.value) if (p.kind === 'net') total += haulKey(cellKey(p.x, p.y));
        return total;
      }

      // TODO(expansion): per-entity held output. Each net parks its catch in its own
      // Inventory slot and a separate act banks it; createProducerCategory credits one
      // Resource directly, so a tick loop writes each slot here.
      function accrue(dt: number): void {
        const surge = phase.value === 'night' ? ANCHORS.nightSurge : 1;
        const catchPerNet = netRate.value * surge * dt;
        for (const p of placed.value)
          if (p.kind === 'net') tideline.add(cellKey(p.x, p.y), catchPerNet);
        // A winch hauls every net it touches, at any hour.
        const view = board.value;
        for (const w of placed.value) {
          if (w.kind !== 'winch') continue;
          for (const c of ringAround(view, w.x, w.y))
            if (view.at(c.x, c.y) === 'net') haulKey(cellKey(c.x, c.y));
        }
      }

      // ─── Tower ───
      function repairCost(points: number): number {
        return points * spine.value.repairPerPoint;
      }

      function mend(points: number): number {
        if (phase.value !== 'day') return 0;
        const want = Math.min(points, integrityMax.value - toNumber(integrity.value));
        if (want <= 0) return 0;
        const affordable = Math.min(want, toNumber(salvage.value) / spine.value.repairPerPoint);
        if (affordable <= 0) return 0;
        if (!subtractResource(salvage, repairCost(affordable))) return 0;
        addResource(integrity, affordable);
        return affordable;
      }

      const shoreCost = computed(() => spine.value.shoreUpBase * 2 ** shoreUses.value);

      function shoreUp(): boolean {
        if (phase.value !== 'night') return false;
        if (!subtractResource(salvage, shoreCost.value)) return false;
        shoreUses.value += 1;
        shored.value += spine.value.shoreUpWard * (1 + FIND_EFFECT.brass * brass.value);
        note(`Shored the ${QUARTER_NAME[quarter.value]} side with what was to hand.`);
        return true;
      }

      // ─── Finds ───
      // TODO(expansion): offered draft. Draw N distinct weighted entries, take some, lose
      // the rest; weightedPick draws one, so the without-replacement loop and the offer's
      // lapse at dusk are game code.
      function drawOffer(): FindId[] {
        const pool = FINDS.map((f) => ({ item: f.id, weight: f.weight }));
        const drawn: FindId[] = [];
        while (drawn.length < OFFER_SIZE && pool.length > 0) {
          const pick = weightedPick(pool);
          if (!pick) break;
          drawn.push(pick);
          pool.splice(
            pool.findIndex((p) => p.item === pick),
            1,
          );
        }
        return drawn;
      }

      function take(find: FindId): boolean {
        if (phase.value !== 'day' || !offer.value.includes(find)) return false;
        offer.value = [];
        if (find === 'timbers') bank(spine.value.timbers);
        if (find === 'oakum')
          addResource(
            integrity,
            Math.min(
              integrityMax.value - toNumber(integrity.value),
              FIND_EFFECT.oakum * integrityMax.value,
            ),
          );
        if (find === 'brass') brass.value += 1;
        if (find === 'cork') cork.value += 1;
        if (find === 'glass') glass.value = true;
        note(`Took the ${FINDS.find((f) => f.id === find)!.name.toLowerCase()} from the tideline.`);
        return true;
      }

      // ─── Phase alternation ───
      // The day and night clock is game code. The engine keeps no timed phase cadence on
      // purpose: waves on a timer have no items for a Sequencer to start (engine
      // docs/api/INDEX.md § Reserved names, Sequencer), and TickDriver phases persist
      // neither the entered set nor elapsed time. So the phase and its clock are saved
      // here, and `syncPhase` re-enters the TickDriver phase after every transition and
      // load. The shape is candidate-recipes.md § Run-phase controller.
      function forecast(): Quarter {
        const wind = posting.value.wind;
        if (wind !== 'veering') return wind;
        return QUARTERS[Math.floor(random() * QUARTERS.length)];
      }

      function dusk(): void {
        phase.value = 'night';
        clock.value = 0;
        struck.value = 0;
        if (offer.value.length) note('The rest of the find washed back out at dusk.');
        offer.value = [];
        note(
          `Night ${night.value}: a gale from the ${QUARTER_NAME[quarter.value]}, ${breakers.value} breakers.`,
        );
        syncPhase();
      }

      function dawn(): void {
        night.value += 1;
        phase.value = 'day';
        clock.value = 0;
        shored.value = 0;
        shoreUses.value = 0;
        glass.value = false;
        quarter.value = forecast();
        offer.value = drawOffer();
        note(`Dawn. The tower stands. Tonight's wind: ${QUARTER_NAME[quarter.value]}.`);
        syncPhase();
      }

      function lightLamp(): boolean {
        if (phase.value !== 'day') return false;
        dusk();
        return true;
      }

      function strike(): void {
        const k = breakers.value;
        const force = storm.value / k;
        const ward = (wards.value[quarter.value] + shored.value) / k;
        const turned = Math.min(force, ward);
        const leak = force - turned;
        struck.value += 1;
        addResource(weathered, turned);
        integrity.value = Math.max(0, toNumber(integrity.value) - leak);
        lastStrike.value = { index: struck.value, quarter: quarter.value, force, leak };
        if (toNumber(integrity.value) <= 0) cycle.end();
      }

      function tickNight(dt: number): void {
        if (phase.value !== 'night') return;
        clock.value += dt;
        const T = logbook.nightSeconds.value;
        // Breakers land evenly through the night, the i-th at (i + ½)/k of it.
        while (
          phase.value === 'night' &&
          struck.value < breakers.value &&
          clock.value >= ((struck.value + 0.5) * T) / breakers.value
        )
          strike();
        if (phase.value === 'night' && clock.value >= T) {
          const leaked = toNumber(integrity.value) < integrityMax.value;
          note(
            leaked
              ? 'The storm blew itself out. The tower took water.'
              : 'The storm broke on the walls and nothing came through.',
          );
          dawn();
        }
      }

      function tickDay(dt: number): void {
        if (phase.value !== 'day') return;
        clock.value += dt;
        if (clock.value >= logbook.daySeconds.value) dusk();
      }

      tickDriver.registerPhase('cycler/day', { onTick: tickDay });
      tickDriver.registerPhase('cycler/night', { onTick: tickNight });
      function syncPhase(): void {
        if (phase.value !== 'day') tickDriver.exitPhase('cycler/day');
        if (phase.value !== 'night') tickDriver.exitPhase('cycler/night');
        if (phase.value !== 'setup') tickDriver.enterPhase(`cycler/${phase.value}`);
      }

      ctx.onTick((dt) => {
        if (phase.value !== 'setup') accrue(dt);
      });

      // ─── The watch: start, wreck, payout ───
      let summary: WatchSummary | null = null;
      const cycle = createCycle({
        resetPersistentContexts: [WATCH_CONTEXT],
        registerTick: ctx.onTick,
        onBeforeEnd: () => {
          const s = spine.value;
          const w = toNumber(weathered.value);
          const gth = toNumber(gathered.value);
          // Per-source cube roots, floored apart so neither source masks the other.
          const entries =
            toNumber(integerRoot(w / s.payoutScale.weathered, 3)) +
            toNumber(integerRoot(gth / s.payoutScale.gathered, 3));
          summary = {
            posting: postingId.value,
            nights: night.value - 1,
            weathered: w,
            gathered: gth,
            entries,
          };
        },
      });
      // The payout is written once the reset has returned, so it reaches `cumulative`. The
      // cycle then waits between watches until the keeper takes the next posting.
      cycle.on('afterEnd', () => {
        const s = summary!;
        addResource(logbook.entries, s.entries);
        logbook.bestNights.value = Math.max(logbook.bestNights.value, s.nights);
        logbook.lastWatch.value = s;
        lastStrike.value = null;
        log.value = [];
        cycle.pause();
        syncPhase();
      });

      function startWatch(): void {
        if (phase.value !== 'setup') return;
        const p = POSTINGS.find((q) => q.id === logbook.posting.current.value) ?? POSTINGS[0];
        postingId.value = p.id;
        g.value = bentG(p.g, logbook.level('almanac'), KNOWLEDGE_EFFECT.almanacBend);
        const s = spine.value;
        w0.value = s.w0;
        integrityMax.value = s.integrity;
        integrity.value = s.integrity;
        salvage.value = s.startSalvage * (1 + KNOWLEDGE_EFFECT.stores * logbook.level('stores'));
        night.value = 1;
        clock.value = 0;
        quarter.value = forecast();
        phase.value = 'day';
        log.value = [];
        note(`Posted to ${p.name}. Tonight's wind: ${QUARTER_NAME[quarter.value]}.`);
        if (cycle.count.value === 0)
          note('Lay a tide net on the lee shore, and breakwaters side by side facing the gale.');
        cycle.resume();
        syncPhase();
      }

      ctx.onLoad(() => {
        syncPhase();
        if (phase.value !== 'setup') cycle.resume();
      });

      api = {
        phase,
        night,
        clock,
        phaseLength,
        quarter,
        posting,
        g,
        cycle,
        salvage,
        integrity,
        integrityMax,
        weathered,
        gathered,
        placed,
        board,
        pieces,
        tideline,
        wards,
        wardFactors,
        storm,
        breakers,
        struck,
        shored,
        shoreCost,
        repairCost,
        offer,
        netRate,
        lastStrike,
        log,
        startWatch,
        openFirstWatch: () => {
          if (phase.value === 'setup' && cycle.count.value === 0) startWatch();
        },
        build,
        clear,
        haul,
        haulAll,
        mend,
        take,
        lightLamp,
        shoreUp,
        priceOf,
      };
      ctx.provide(WatchKey, api);
    },
  };
}
