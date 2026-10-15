/**
 * One watch on the rock: the board, the tideline, the tower, the boat and the day/night
 * alternation that drives them. The light going out resets this module's whole context; the
 * logbook entries it pays are written after the reset returns, into `./logbook.ts`.
 *
 * Day and night share every piece of state: one salvage pile, one board, one tower. A phase
 * changes which verbs are open and which tick runs:
 *   day:   haul nets, build, take up, mend, take a find, row out to a wreck, light the lamp
 *          early, and on the closing posting signal the relief
 *   night: shore up a side; the storm's breakers land on a schedule
 * Nets catch through both, more at night, and the night's catch waits on the tideline for
 * the morning, so the board carries one phase into the next. A keeper out in the boat does
 * none of the keeper's verbs, and one still out at dusk shelters at the wreck till dawn.
 *
 * Sections: Ward · Storm · Tideline · Pieces · Tower · Finds · The boat · Phase alternation ·
 * The watch.
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
  subtractResource,
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
import { createModuleApi } from '@/modules/module-api';
import { createEventLog, type EventLog } from '@/modules/event-log';
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
  SEA,
  bentG,
  type FindId,
  type GaleKind,
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
import { breakerLeak, neighbours, nextBackingOdds, screenWards } from './storm';
import { LogbookKey, type ReliefOutcome, type WatchSummary } from './logbook';

export type Phase = 'setup' | 'day' | 'night';
/** Where the keeper is: home, rowing out or at the wreck, or rowing back. */
export type Boat = 'home' | 'out' | 'returning';

/** One breaker as it landed: what the UI flashes and the log reads. */
export interface Strike {
  index: number;
  /** The side it broke on: tonight's quarter, or the one the gale backed to. */
  quarter: Quarter;
  force: number;
  leak: number;
}

type ByQuarter = Record<Quarter, number>;
const NONE: ByQuarter = { N: 0, E: 0, S: 0, W: 0 };

export interface WatchApi {
  phase: Persistent<Phase>;
  /** The night the watch is on: night n follows day n. */
  night: Persistent<number>;
  /** Seconds into the current phase. */
  clock: Persistent<number>;
  phaseLength: ComputedRef<number>;
  /** Tonight's quarter, forecast at dawn. */
  quarter: Persistent<Quarter>;
  /** Tonight's kind, forecast at dawn. */
  kind: Persistent<GaleKind>;
  /** Share of tonight's force that is spray: drawn at dusk on a spray night, else 0. */
  spray: Persistent<number>;
  /** The quarter tonight's gale may back to, named at dawn; null before backing starts. */
  backQuarter: Persistent<Quarter | null>;
  posting: ComputedRef<PostingDef>;
  /** Storm growth for this watch, frozen at its start. */
  g: Persistent<number>;
  /** The watch cycle: `count` is the watches kept, `elapsed` this watch's seconds. */
  cycle: Cycle;
  salvage: Resource<DecimalSource>;
  integrity: Resource<DecimalSource>;
  integrityMax: Persistent<number>;
  /** Force the walls and screens turned this watch: one of the payout's two sources. */
  weathered: Resource<DecimalSource>;
  /** Salvage banked this watch: the payout's other source. */
  gathered: Resource<DecimalSource>;
  placed: Persistent<Placed[]>;
  board: ComputedRef<OccupancyView>;
  pieces: PurchasableCategory<PieceDef>;
  tideline: Inventory;
  /** Each side's wall ward. */
  wards: ComputedRef<ByQuarter>;
  /** Spray each side's screens turn. */
  screens: ComputedRef<ByQuarter>;
  wardFactors: ComputedRef<WardFactors>;
  /** Tonight's storm: total force across every breaker. */
  storm: ComputedRef<number>;
  breakers: ComputedRef<number>;
  struck: Persistent<number>;
  /** Ward shoring has added to each side tonight. */
  shored: Persistent<ByQuarter>;
  shoreCost: ComputedRef<number>;
  repairCost: (points: number) => number;
  offer: Persistent<FindId[]>;
  /** One net's catch per second in the calm, after every multiplier. */
  netRate: ComputedRef<number>;
  /** Salvage left in the wreck sighted today; 0 when none is. */
  wreck: Persistent<number>;
  boat: Persistent<Boat>;
  /** Salvage in the boat, banked when the keeper is home. */
  boatHaul: Persistent<number>;
  /** Out at dusk: sheltering at the wreck until dawn. */
  caughtOut: Persistent<boolean>;
  home: ComputedRef<boolean>;
  /** The relief is signalled: tonight's gale is the final one. */
  relief: Persistent<boolean>;
  canSignal: ComputedRef<boolean>;
  lastStrike: Ref<Strike | null>;
  /** The keeper's log for this watch: emptied when a watch starts and when it ends. */
  log: EventLog;

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
  /** Shores up a side for the rest of the night: tonight's quarter unless named. */
  shoreUp: (side?: Quarter) => boolean;
  rowOut: () => boolean;
  rowHome: () => boolean;
  /** On the closing posting: the tower is made whole, and tonight's gale is the final one. */
  signalRelief: () => boolean;
  /** The price of the next copy of a piece. */
  priceOf: (kind: PieceKind) => number;
}

export const WatchKey: InjectionKey<WatchApi> = Symbol('cycler/watch');

const LOG_LINES = 7;
const WATCH_CONTEXT = 'cycler/watch';

const watchApi = createModuleApi(WatchKey);
export const getWatch = watchApi.get;

export function createWatchModule(): EngineModule {
  return {
    id: WATCH_CONTEXT,
    dependencies: ['cycler/logbook'],
    install(ctx) {
      const logbook = ctx.inject(LogbookKey);
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
      const kind = persistent<GaleKind>('gale', { id: 'kind' });
      const spray = persistent(0, { id: 'spray' });
      const backQuarter = persistent<Quarter | null>(null, { id: 'back-quarter' });
      const backingOdds = persistent<number>(SEA.backingOdds, { id: 'backing-odds' });
      const postingId = persistent(POSTINGS[0].id, { id: 'posting' });
      const g = persistent<number>(ANCHORS.gRef, { id: 'g' });
      // The opening storm, pegged at the watch's start and frozen for it: power bought
      // mid-watch would otherwise move a storm the watch already planned for.
      const w0 = persistent(0, { id: 'w0' });
      const integrityMax = persistent(0, { id: 'integrity-max' });
      const placed = persistent<Placed[]>([], { id: 'placed' });
      const struck = persistent(0, { id: 'struck' });
      const shored = persistent<ByQuarter>({ ...NONE }, { id: 'shored' });
      const shoreUses = persistent(0, { id: 'shore-uses' });
      const offer = persistent<FindId[]>([], { id: 'offer' });
      const brass = persistent(0, { id: 'brass' });
      const cork = persistent(0, { id: 'cork' });
      const glass = persistent(false, { id: 'glass' });
      const wreck = persistent(0, { id: 'wreck' });
      const boat = persistent<Boat>('home', { id: 'boat' });
      const boatClock = persistent(0, { id: 'boat-clock' });
      const boatHaul = persistent(0, { id: 'boat-haul' });
      const caughtOut = persistent(false, { id: 'caught-out' });
      const relief = persistent(false, { id: 'relief' });

      const lastStrike = ref<Strike | null>(null);
      const log = createEventLog(ctx, { cap: LOG_LINES, clock: () => cycle.elapsed.value });
      const note = (line: string) => log.post(line);

      const posting = computed(() => POSTINGS.find((p) => p.id === postingId.value) ?? POSTINGS[0]);
      logbook.setPostingOpen(() => phase.value === 'setup');
      const home = computed(() => boat.value === 'home');
      /** The keeper's own day verbs: by day, and at home. */
      const atWork = () => phase.value === 'day' && home.value;

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
      const screens = computed(() => screenWards(board.value, wardFactors.value, ANCHORS.screen));

      // ─── Storm ───
      const phaseLength = computed(() =>
        phase.value === 'night' ? logbook.nightSeconds.value : logbook.daySeconds.value,
      );
      const tonight = computed(
        () => w0.value * g.value ** (night.value - 1) * (glass.value ? FIND_EFFECT.glass : 1),
      );
      // The final gale is floored at the crossing night's storm, W₀·H.
      const storm = computed(() =>
        relief.value
          ? ANCHORS.finalGale * Math.max(tonight.value, w0.value * spine.value.headroom)
          : tonight.value,
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
      const priceOf = (piece: PieceKind) => toNumber(pieces.getPurchasable(piece)!.getCost(1));

      function occupant(x: number, y: number): Placed | undefined {
        return placed.value.find((p) => p.x === x && p.y === y);
      }

      function build(piece: PieceKind, x: number, y: number): boolean {
        if (!atWork()) return false;
        const def = PIECES.find((p) => p.id === piece)!;
        if (groundAt(x, y) !== def.ground || occupant(x, y)) return false;
        if (toNumber(pieces.getPurchasable(piece)!.purchase(1)) < 1) return false;
        placed.value = [...placed.value, { kind: piece, x, y }];
        return true;
      }

      function clear(x: number, y: number): boolean {
        if (!atWork()) return false;
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
        if (!atWork()) return 0;
        return haulKey(cellKey(x, y));
      }

      function haulAll(): number {
        if (!atWork()) return 0;
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
        // A winch hauls every net it touches, at any hour, keeper home or not.
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
        if (!atWork()) return 0;
        const want = Math.min(points, integrityMax.value - toNumber(integrity.value));
        if (want <= 0) return 0;
        const affordable = Math.min(want, toNumber(salvage.value) / spine.value.repairPerPoint);
        if (affordable <= 0) return 0;
        if (!subtractResource(salvage, repairCost(affordable))) return 0;
        addResource(integrity, affordable);
        return affordable;
      }

      const shoreCost = computed(() => spine.value.shoreUpBase * 2 ** shoreUses.value);

      function shoreUp(side: Quarter = quarter.value): boolean {
        if (phase.value !== 'night' || !home.value) return false;
        if (side !== quarter.value && side !== backQuarter.value) return false;
        if (!subtractResource(salvage, shoreCost.value)) return false;
        shoreUses.value += 1;
        const added = spine.value.shoreUpWard * (1 + FIND_EFFECT.brass * brass.value);
        shored.value = { ...shored.value, [side]: shored.value[side] + added };
        note(`Shored the ${QUARTER_NAME[side]} side with what was to hand.`);
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
        if (!atWork() || !offer.value.includes(find)) return false;
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

      // ─── The boat ───
      // A wreck sighted at dawn is stripped at a steady rate while the keeper is there; the
      // haul banks when the keeper is home. Out at dusk, the keeper shelters at the wreck and
      // rows home at dawn, so the night runs without shoring.
      function rowOut(): boolean {
        if (!atWork() || wreck.value <= 0) return false;
        boat.value = 'out';
        boatClock.value = 0;
        note('Rowed out to the wreck.');
        return true;
      }

      function rowHome(): boolean {
        if (phase.value !== 'day' || boat.value !== 'out') return false;
        boat.value = 'returning';
        boatClock.value = 0;
        return true;
      }

      function landBoat(): void {
        const haul = bank(boatHaul.value);
        boatHaul.value = 0;
        boat.value = 'home';
        caughtOut.value = false;
        if (haul > 0) note(`Landed ${Math.round(haul)} salvage from the wreck.`);
      }

      function tickBoat(dt: number): void {
        if (boat.value === 'home') return;
        boatClock.value += dt;
        if (boat.value === 'out' && boatClock.value > SEA.rowSeconds && wreck.value > 0) {
          const stripped = Math.min(wreck.value, spine.value.stripPerSecond * dt);
          wreck.value -= stripped;
          boatHaul.value += stripped;
        }
        if (boat.value === 'returning' && boatClock.value >= SEA.rowSeconds) landBoat();
      }

      // ─── Phase alternation ───
      // The day and night clock is game code. The engine keeps no timed phase cadence on
      // purpose: waves on a timer have no items for a Sequencer to start (engine
      // docs/api/INDEX.md § Reserved names, Sequencer). So the phase and its clock are saved
      // here, and one tick guarded on the phase runs the day or the night (under The watch),
      // with nothing to re-enter on a load. The shape is candidate-recipes.md § Run-phase
      // controller.
      function forecastQuarter(): Quarter {
        const wind = posting.value.wind;
        if (wind !== 'veering') return wind;
        return QUARTERS[Math.floor(random() * QUARTERS.length)];
      }

      /** Dawn names tonight's quarter, its kind and the quarter it may back to. */
      function forecast(): void {
        quarter.value = forecastQuarter();
        const n = night.value;
        kind.value = n >= SEA.sprayFromNight && random() < SEA.sprayChance ? 'spray' : 'gale';
        backQuarter.value =
          n >= SEA.backingFromNight ? neighbours(quarter.value)[random() < 0.5 ? 0 : 1] : null;
        spray.value = 0;
      }

      function sightWreck(): void {
        const [lo, hi] = spine.value.wreckSize;
        wreck.value =
          night.value >= 2 && random() < SEA.wreckChance ? lo + (hi - lo) * random() : 0;
        if (wreck.value > 0) note('A wreck is sighted offshore.');
      }

      function forecastLine(): string {
        const back = backQuarter.value ? `, backing ${QUARTER_NAME[backQuarter.value]}` : '';
        const what = kind.value === 'spray' ? 'a gale with spray' : 'a gale';
        return `Tonight: ${what} from the ${QUARTER_NAME[quarter.value]}${back}.`;
      }

      function dusk(): void {
        phase.value = 'night';
        clock.value = 0;
        struck.value = 0;
        backingOdds.value = SEA.backingOdds;
        if (kind.value === 'spray')
          spray.value = SEA.sprayShares[Math.floor(random() * SEA.sprayShares.length)];
        if (offer.value.length) note('The rest of the find washed back out at dusk.');
        offer.value = [];
        if (!home.value) {
          caughtOut.value = true;
          note('Dusk caught the boat out. The keeper shelters at the wreck.');
        }
        const sprayLine = spray.value ? `, ${Math.round(spray.value * 100)}% of it spray` : '';
        note(`Night ${night.value}: ${breakers.value} breakers${sprayLine}.`);
      }

      function dawn(): void {
        if (!home.value) landBoat();
        night.value += 1;
        phase.value = 'day';
        clock.value = 0;
        shored.value = { ...NONE };
        shoreUses.value = 0;
        glass.value = false;
        forecast();
        offer.value = drawOffer();
        sightWreck();
        note(`Dawn. The tower stands. ${forecastLine()}`);
      }

      function lightLamp(): boolean {
        if (!atWork()) return false;
        dusk();
        return true;
      }

      const canSignal = computed(
        () =>
          atWork() &&
          posting.value.closing === true &&
          !relief.value &&
          night.value >= ANCHORS.callFromNight,
      );

      function signalRelief(): boolean {
        if (!canSignal.value) return false;
        relief.value = true;
        integrity.value = integrityMax.value;
        note('The relief is signalled. The tower is made whole; the last gale comes tonight.');
        return true;
      }

      function strike(): void {
        const k = breakers.value;
        // Each breaker may back to the named quarter, with odds against a repeat.
        let side = quarter.value;
        if (backQuarter.value) {
          const backed = random() < backingOdds.value;
          backingOdds.value = nextBackingOdds(backingOdds.value, backed);
          if (backed) side = backQuarter.value;
        }
        const force = storm.value / k;
        const leak = breakerLeak({
          force,
          spray: spray.value,
          walls: (wards.value[side] + shored.value[side]) / k,
          screens: screens.value[side] / k,
        });
        struck.value += 1;
        addResource(weathered, force - leak);
        integrity.value = Math.max(0, toNumber(integrity.value) - leak);
        lastStrike.value = { index: struck.value, quarter: side, force, leak };
        if (toNumber(integrity.value) <= 0) {
          outcome = relief.value ? 'lost' : null;
          cycle.end();
        }
      }

      function tickNight(dt: number): void {
        clock.value += dt;
        const T = logbook.nightSeconds.value;
        // Breakers land evenly through the night, the i-th at (i + ½)/k of it.
        while (
          phase.value === 'night' &&
          struck.value < breakers.value &&
          clock.value >= ((struck.value + 0.5) * T) / breakers.value
        )
          strike();
        if (phase.value !== 'night' || clock.value < T) return;
        if (relief.value) {
          note('The relief came at first light. The light held.');
          outcome = 'held';
          cycle.end();
          return;
        }
        const leaked = toNumber(integrity.value) < integrityMax.value;
        note(
          leaked
            ? 'The storm blew itself out. The tower took water.'
            : 'The storm broke on the walls and nothing came through.',
        );
        dawn();
      }

      function tickDay(dt: number): void {
        clock.value += dt;
        tickBoat(dt);
        if (clock.value >= logbook.daySeconds.value) dusk();
      }

      ctx.onTick((dt) => {
        if (phase.value !== 'setup') accrue(dt);
      });

      // ─── The watch: start, wreck, payout ───
      let summary: WatchSummary | null = null;
      let outcome: ReliefOutcome | null = null;
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
            nights: outcome === 'held' ? night.value : night.value - 1,
            weathered: w,
            gathered: gth,
            entries,
            relief: outcome,
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
        if (s.relief) logbook.recordRelief(s.relief);
        outcome = null;
        lastStrike.value = null;
        log.clear();
        cycle.pause();
      });

      // After the cycle's own tick, so a watch a breaker ends has counted this tick. A phase
      // that begins inside a tick runs in that tick too, on the same dt, so its clock starts
      // one tick in. The balance is measured with that extra tick at each turn.
      ctx.onTick((dt) => {
        for (let ran: Phase = 'setup'; phase.value !== 'setup' && phase.value !== ran;) {
          ran = phase.value;
          if (ran === 'day') tickDay(dt);
          else tickNight(dt);
        }
      });

      function startWatch(): void {
        if (phase.value !== 'setup') return;
        const p = POSTINGS.find((q) => q.id === logbook.posting.current.value) ?? POSTINGS[0];
        postingId.value = p.id;
        g.value = bentG(p.g, logbook.level('almanac'), KNOWLEDGE_EFFECT.almanacBend);
        const s = spine.value;
        w0.value = p.closing ? s.closingW0 : s.w0;
        integrityMax.value = s.integrity;
        integrity.value = s.integrity;
        salvage.value = s.startSalvage * (1 + KNOWLEDGE_EFFECT.stores * logbook.level('stores'));
        night.value = 1;
        clock.value = 0;
        forecast();
        phase.value = 'day';
        log.clear();
        note(`Posted to ${p.name}. ${forecastLine()}`);
        if (cycle.count.value === 0)
          note('Lay a tide net on the lee shore, and breakwaters side by side facing the gale.');
        cycle.resume();
      }

      ctx.onLoad(() => {
        if (phase.value !== 'setup') cycle.resume();
      });

      const api: WatchApi = {
        phase,
        night,
        clock,
        phaseLength,
        quarter,
        kind,
        spray,
        backQuarter,
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
        screens,
        wardFactors,
        storm,
        breakers,
        struck,
        shored,
        shoreCost,
        repairCost,
        offer,
        netRate,
        wreck,
        boat,
        boatHaul,
        caughtOut,
        home,
        relief,
        canSignal,
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
        rowOut,
        rowHome,
        signalRelief,
        priceOf,
      };
      watchApi.publish(ctx, api);
    },
  };
}
