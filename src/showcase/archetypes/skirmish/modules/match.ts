/**
 * The match: both seats, the three districts between them, the clock, fog of
 * war and the phase a match is in. A match is a run that keeps its end state
 * on screen until the player starts the next one, so it is a reset plus a
 * phase-guarded tick, not a Cycle.
 */
import {
  computed,
  createReset,
  persistent,
  shallowRef,
  subtractResource,
  toNumber,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Reset,
  type ShallowRef,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { DISTRICTS, type ContractDef } from '../data/contracts';
import { UNIT_KINDS } from '../data/units';
import {
  GHOST,
  PRESENCE,
  countsOf,
  stepBattle,
  total,
  type BattleEvent,
  type Counts,
} from './battle';
import { createSide, type Side } from './side';
import type { Situation } from './policy';
import type { Tunables } from './tunables';
import { SCOUT_COOLDOWN_S, SCOUT_S, scoutCost } from '../data/spine';
import { RosterKey } from './roster';
import { TunablesKey } from './tuning';

export type Phase = 'briefing' | 'live' | 'won' | 'lost';
export type Owner = 'p' | 'e' | 'none';

export interface FeedEntry {
  t: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

/** What the player last saw of a district, and when. */
export interface Sighting {
  counts: Counts;
  at: number;
}

export interface MatchApi {
  readonly p: Side;
  readonly e: Side;
  readonly tune: Tunables;
  /** −1..1 per district; +1 is held by the player. */
  readonly control: Persistent<number>[];
  /** The seat that last took each district outright; its hustler slots are that seat's. */
  readonly owner: Persistent<Owner>[];
  readonly phase: Persistent<Phase>;
  /** Seconds into the live match. */
  readonly clock: Persistent<number>;
  readonly contract: ComputedRef<ContractDef>;
  readonly feed: ShallowRef<FeedEntry[]>;
  /** Seconds of astral sight left, and seconds until the next scout. */
  readonly scoutLeft: ComputedRef<number>;
  readonly scoutCooldown: ComputedRef<number>;
  readonly scoutCost: number;
  /** The player's last sighting per district, and of the rival's safehouse. */
  readonly sightings: ShallowRef<(Sighting | undefined)[]>;
  readonly safehouseSighting: ShallowRef<Sighting | undefined>;
  /** Whether the player sees a district now. */
  visible(district: number): boolean;
  start(): void;
  /** Leave a finished match and return to the briefing for the next contract. */
  nextMatch(): void;
  /** Subscribe to the match reset: `afterReset` fires once both seats are back at the briefing. */
  onReset: Reset['on'];
  scout(): boolean;
  situation(seat: 'p' | 'e'): Situation;
  log(text: string, tone?: FeedEntry['tone']): void;
}

export const MatchKey: InjectionKey<MatchApi> = Symbol('skirmish/match');

const matchApi = createModuleApi(MatchKey);
/** The match API the newest live engine published. */
export const getMatch = matchApi.get;

const FEED_LENGTH = 40;

export const matchModule: EngineModule = {
  id: 'skirmish/match',
  dependencies: ['skirmish/tuning', 'skirmish/roster'],
  install(ctx) {
    const tune = ctx.inject(TunablesKey);
    const roster = ctx.inject(RosterKey);
    const phase = persistent<Phase>('briefing', { id: 'phase' });
    const clock = persistent(0, { id: 'clock' });
    const control = DISTRICTS.map((d) => persistent(0, { id: `control-${d.id}` }));
    // Who last took each district outright. Its hustler slots stay with that seat until the
    // other takes it, so a raid that dents control lays nobody off.
    const owner = DISTRICTS.map((d) => persistent<Owner>('none', { id: `owner-${d.id}` }));
    const scoutUntil = persistent(-1, { id: 'scout-until' });
    const scoutReadyAt = persistent(0, { id: 'scout-ready' });
    const contract = computed(() => roster.contract.value);
    const running = () => phase.value === 'live';

    const owns = (seat: 'p' | 'e') => (district: number) => owner[district].value === seat;
    const p = createSide({
      ctx,
      id: 'p',
      tune,
      owns: owns('p'),
      incomeMult: () => 1,
      running,
    });
    const e = createSide({
      ctx,
      id: 'e',
      tune,
      owns: owns('e'),
      incomeMult: () => contract.value.incomeMult,
      running,
    });

    const feed = shallowRef<FeedEntry[]>([]);
    const log = (text: string, tone: FeedEntry['tone'] = 'info') => {
      feed.value = [{ t: clock.value, text, tone }, ...feed.value].slice(0, FEED_LENGTH);
    };

    // ─── Fog of war ───
    const scoutLeft = computed(() => Math.max(0, scoutUntil.value - clock.value));
    const scoutCooldown = computed(() => Math.max(0, scoutReadyAt.value - clock.value));
    const sightings = shallowRef<(Sighting | undefined)[]>(DISTRICTS.map(() => undefined));
    const safehouseSighting = shallowRef<Sighting | undefined>(undefined);
    // The player sees a district while scouting, while a squad stands in it, or while its informants answer to them.
    const visible = (i: number) =>
      scoutLeft.value > 0 || total(countsOf(p.squads[i])) > PRESENCE || control[i].value > 0;

    function updateSightings(): void {
      const next = [...sightings.value];
      let changed = false;
      for (let i = 0; i < DISTRICTS.length; i++) {
        if (!visible(i)) continue;
        next[i] = { counts: countsOf(e.squads[i]), at: clock.value };
        changed = true;
      }
      if (changed) sightings.value = next;
      if (scoutLeft.value > 0)
        safehouseSighting.value = { counts: countsOf(e.reserve), at: clock.value };
    }

    function enemyMixFor(seat: 'p' | 'e'): Counts {
      const mix = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;
      if (seat === 'e') {
        // The rival's analysts are not fogged: it reads the player's whole army.
        for (const k of UNIT_KINDS) {
          mix[k] = toNumber(p.reserve[k].value);
          for (const sq of p.squads) mix[k] += toNumber(sq[k].value);
        }
        return mix;
      }
      for (const s of [...sightings.value, safehouseSighting.value]) {
        if (!s) continue;
        for (const k of UNIT_KINDS) mix[k] += s.counts[k];
      }
      return mix;
    }

    function situation(seat: 'p' | 'e'): Situation {
      const own = seat === 'p' ? p : e;
      const other = seat === 'p' ? e : p;
      const sign = seat === 'p' ? 1 : -1;
      const enemySquads = DISTRICTS.map((_, i) => {
        if (seat === 'e') return countsOf(p.squads[i]);
        if (visible(i)) return countsOf(e.squads[i]);
        return sightings.value[i]?.counts;
      });
      const besiegedFrom: number[] = [];
      for (let i = 0; i < DISTRICTS.length; i++) {
        if (
          control[i].value * -sign >= 1 &&
          other.stance[i].value === 'assault' &&
          total(countsOf(other.squads[i])) > GHOST
        ) {
          besiegedFrom.push(i);
        }
      }
      return {
        own,
        other,
        control: control.map((c) => c.value * sign),
        enemySquads,
        enemyMix: enemyMixFor(seat),
        besiegedFrom,
      };
    }

    // ─── The match reset: everything this module built, both seats included ───
    const matchReset = createReset({ resetPersistentContexts: ['skirmish/match'] });

    // A district whose control dips and recovers keeps its owner, so the feed reports a change
    // of hands, not every recapture.
    function describe(ev: BattleEvent): void {
      if (ev.kind !== 'captured' || owner[ev.district].value === ev.by) return;
      owner[ev.district].value = ev.by;
      const name = DISTRICTS[ev.district].name;
      // The side's tick lays the loser's hustlers off after this, so they still stand here.
      const scattered = (ev.by === 'p' ? e : p).econ.getProducer(
        `hustler-${DISTRICTS[ev.district].id}`,
      )!;
      const n = toNumber(scattered.count.value);
      const off = n > 0 ? ` ${n} of ${ev.by === 'p' ? 'their' : 'your'} hustlers scatter.` : '';
      log(
        ev.by === 'p'
          ? `${name} answers to your crew.${off}`
          : `${name} falls to ${contract.value.rival}.${off}`,
        ev.by === 'p' ? 'good' : 'bad',
      );
    }

    // Clock time of the last siege line per side: a siege a trickle of defenders keeps interrupting logs once, not every tick.
    const SIEGE_LOG_GAP_S = 30;
    let lastSiegeLog = [-Infinity, -Infinity];
    ctx.onTick((dt) => {
      if (phase.value !== 'live') return;
      clock.value += dt;
      const events = stepBattle(p, e, control, tune, dt);
      for (const ev of events) {
        describe(ev);
        if (ev.kind !== 'siege') continue;
        const side = ev.by === 'p' ? 0 : 1;
        if (clock.value - lastSiegeLog[side] < SIEGE_LOG_GAP_S) continue;
        lastSiegeLog[side] = clock.value;
        if (side === 0) log(`Your crew is hitting ${contract.value.rival}'s safehouse.`, 'good');
        else log('Your safehouse is under assault!', 'bad');
      }
      updateSightings();
      if (toNumber(e.hq.value) <= 0) {
        phase.value = 'won';
        log(`${contract.value.rival}'s safehouse burns. Contract complete.`, 'good');
      } else if (toNumber(p.hq.value) <= 0) {
        phase.value = 'lost';
        log('Your safehouse is gone. The fixers stop calling.', 'bad');
      }
    });

    ctx.onLoad(() => {
      sightings.value = DISTRICTS.map(() => undefined);
      safehouseSighting.value = undefined;
    });

    const api: MatchApi = {
      p,
      e,
      tune,
      control,
      owner,
      phase,
      clock,
      contract,
      feed,
      scoutLeft,
      scoutCooldown,
      scoutCost,
      sightings,
      safehouseSighting,
      visible,
      start() {
        if (phase.value !== 'briefing') return;
        phase.value = 'live';
        log(`Contract on ${contract.value.rival}. The clock is running.`);
      },
      nextMatch() {
        matchReset.reset();
        feed.value = [];
        sightings.value = DISTRICTS.map(() => undefined);
        safehouseSighting.value = undefined;
        lastSiegeLog = [-Infinity, -Infinity];
      },
      scout() {
        if (phase.value !== 'live' || scoutCooldown.value > 0) return false;
        if (!subtractResource(p.aether, scoutCost)) return false;
        scoutUntil.value = clock.value + SCOUT_S;
        scoutReadyAt.value = clock.value + SCOUT_S + SCOUT_COOLDOWN_S;
        log('Your mage slips loose of her body and rides the ley lines over the sprawl.');
        updateSightings();
        return true;
      },
      situation,
      log,
      onReset: matchReset.on,
    };
    matchApi.publish(ctx, api);
  },
};
