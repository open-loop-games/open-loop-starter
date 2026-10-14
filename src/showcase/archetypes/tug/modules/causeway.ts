import {
  persistent,
  ref,
  toNumber,
  tunable,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Ref,
} from '@open-loop/engine';
import { toRaw } from 'vue';
import {
  ANCHORS,
  counterMultiplier,
  coverAt,
  memberStats,
  seasonFury,
  troop,
  type TroopId,
} from '../data';
import { ChronicleKey } from './chronicle';
import { SIDES, other, type Side } from './sides';
import { TugTuningRegistryKey } from './tuning';

/** One man (or engine) on the causeway. Fairhold's walk +x from 0; the rival's walk −x. */
export interface Member {
  id: number;
  side: Side;
  troop: TroopId;
  /** Which of the files it marches in; it blocks and is blocked only in its own file. */
  file: number;
  x: number;
  hp: number;
  maxHp: number;
  dps: number;
  gateDps: number;
  speed: number;
  reach: number;
  /** Silver it cost: what its share of the treasury loot is reckoned from. */
  cost: number;
  /** Seconds since it last struck or was struck, for the renderer's flash. */
  hitAgo: number;
}

/** Squads per troop in one release. */
export type Wave = Partial<Record<TroopId, number>>;

/** What one step resolved, for the battle to apply to the keeps and the heralds. */
export interface ClashEvents {
  /** Damage `side`'s troops dealt to the other keep's gate this step. */
  gate: { side: Side; damage: number }[];
  fallen: { side: Side; troop: TroopId }[];
}

export interface CausewayApi {
  /** Everyone on the causeway, saved, so a reload resumes the battle where it stood. */
  members: Persistent<Member[]>;
  /** Squads waiting for each keep's horn. */
  bailey: Record<Side, Persistent<TroopId[]>>;
  /** Each keep's most recent release: what the other keep reads and answers. */
  lastWave: Record<Side, Persistent<Wave>>;
  /** Seconds into the battle. */
  clock: Persistent<number>;
  /** Bumped every step: the renderer's cue that members moved. */
  version: Ref<number>;
  /** Members a keep may still add to its bailey under the muster. */
  room(side: Side): number;
  stage(side: Side, id: TroopId, squads: number): void;
  /** Empties a keep's bailey onto the causeway in formation. */
  release(side: Side): Wave;
  step(dt: number): ClashEvents;
  /** Paces from `side`'s gate to its foremost member, or 0. */
  front(side: Side): number;
  /** Where the two fronts meet, from Fairhold's gate, or null when they are apart. */
  line(): number | null;
  /** Silver standing on the causeway for a side, optionally one troop's. */
  worth(side: Side, id?: TroopId): number;
  clear(): void;
}

export const CausewayKey: InjectionKey<CausewayApi> = Symbol(
  'tug/causeway',
) as InjectionKey<CausewayApi>;

let api: CausewayApi;

export function getCauseway(): CausewayApi {
  return api;
}

const L = ANCHORS.causewayLength;
const HALF = L / 2;
const dir = (side: Side) => (side === 'player' ? 1 : -1);
const gateX = (side: Side) => (side === 'player' ? 0 : L);
/** Paces from a member's own gate toward the enemy. */
const advance = (m: Member) => (m.x - gateX(m.side)) * dir(m.side);
/** Fronts closer than this are one fight. */
const ENGAGED = 20;

/**
 * The causeway: one road between two gates. A released wave forms ranks, `files` wide, by
 * troop: yeomen in front, knights behind them, bowmen behind those, engines last. A member
 * strikes when an enemy is in reach, preferring the troop it beats; a knight with bowmen in
 * sight rides past whatever stands between. Otherwise it walks, never past the friend ahead
 * in its file. A defender on its own half takes less the nearer it stands to its gate; an
 * engine ignores that cover. With no enemy ahead, a member that reaches the enemy gate
 * batters it, and the gatehouse bows shoot the nearest attacker.
 *
 * The engine ships no entity combat on purpose, so the whole step is game-side.
 */
// TODO(expansion): 1-D lane occupancy with files — positions on a segment, nearest enemy
// ahead within reach, blocking by file. SpatialGrid models cells, not a continuous road.
export function createCausewayModule(): EngineModule {
  return {
    id: 'tug/causeway',
    dependencies: ['tug/tuning', 'tug/chronicle'],
    install(ctx) {
      const tuning = ctx.inject(TugTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);
      const sharpness = tunable(tuning, 'clash/counterSharpness', () => ANCHORS.counterSharpness);
      const coverGate = tunable(tuning, 'cover/atGate', () => ANCHORS.coverAtGate);
      const gateShare = tunable(tuning, 'gate/share', () => ANCHORS.gateShare);
      const season = tunable(tuning, 'season/seconds', () => ANCHORS.seasonSeconds);

      const members = persistent<Member[]>([], { id: 'members' });
      const bailey = {
        player: persistent<TroopId[]>([], { id: 'bailey-player' }),
        rival: persistent<TroopId[]>([], { id: 'bailey-rival' }),
      };
      const lastWave = {
        player: persistent<Wave>({}, { id: 'last-wave-player' }),
        rival: persistent<Wave>({}, { id: 'last-wave-rival' }),
      };
      const clock = persistent(0, { id: 'clock' });
      const nextId = persistent(1, { id: 'next-id' });
      const version = ref(0);
      // The step mutates the raw list: a hundred members moving every tick should not each
      // fire a reactive write. The renderer follows `version` instead.
      const list = () => toRaw(members.value);

      /** Units that stood and struck last step: closing on one takes the whole gap. */
      let standing = new Set<number>();

      const squadOf = (id: TroopId) => troop(id).squad;
      const fielded = (side: Side) =>
        list().filter((m) => m.side === side).length +
        bailey[side].value.reduce((n, id) => n + squadOf(id), 0);

      function stage(side: Side, id: TroopId, squads: number): void {
        bailey[side].value = [...bailey[side].value, ...Array<TroopId>(squads).fill(id)];
      }

      function release(side: Side): Wave {
        const squads = bailey[side].value;
        bailey[side].value = [];
        const wave: Wave = {};
        for (const id of squads) wave[id] = (wave[id] ?? 0) + 1;
        lastWave[side].value = wave;
        const vigor = toNumber(chronicle.chains[side].vigor.apply(1));
        const ranks = squads
          .flatMap((id) => Array<TroopId>(squadOf(id)).fill(id))
          .sort((a, b) => troop(a).rank - troop(b).rank);
        const out = list();
        ranks.forEach((id, i) => {
          const s = memberStats(id);
          const breaker = troop(id).breaksWalls === true;
          const row = Math.floor(i / ANCHORS.files);
          out.push({
            id: nextId.value++,
            side,
            troop: id,
            file: i % ANCHORS.files,
            // Ranks form behind the gate and walk out in order.
            x: gateX(side) - dir(side) * row * ANCHORS.rankSpacing,
            hp: s.hp * vigor,
            maxHp: s.hp * vigor,
            dps: s.dps * vigor,
            gateDps: (breaker ? s.gateDps : s.dps * gateShare.value) * vigor,
            speed: s.speed,
            reach: s.reach,
            cost: s.cost,
            hitAgo: 99,
          });
        });
        version.value++;
        return wave;
      }

      function step(dt: number): ClashEvents {
        const events: ClashEvents = { gate: [], fallen: [] };
        const all = list();
        const t = clock.value;
        const s = sharpness.value;
        const fury = seasonFury(t, season.value);
        const cols: Record<Side, Member[]> = { player: [], rival: [] };
        for (const m of all) cols[m.side].push(m);
        // Foremost first: the enemy list then runs nearest-first from either side's view.
        for (const side of SIDES) cols[side].sort((a, b) => advance(b) - advance(a));

        const damage = new Map<Member, number>();
        const moves: [Member, number][] = [];
        const struck = new Set<number>();
        const hit = (target: Member, amount: number) =>
          damage.set(target, (damage.get(target) ?? 0) + amount);

        for (const side of SIDES) {
          const foes = cols[other(side)];
          const d = dir(side);
          const aheadInFile = new Map<number, Member>();
          for (const m of cols[side]) {
            m.hitAgo += dt;
            const def = troop(m.troop);
            let target: Member | undefined;
            let nearest = Infinity;
            let nearestFoe: Member | undefined;
            let charging = false;
            if (def.charges && def.beats) {
              // The charge: ride for the nearest of the troop it beats, past anything else.
              for (const e of foes) {
                const gap = (e.x - m.x) * d;
                if (gap < -0.5 || e.troop !== def.beats) continue;
                if (gap > m.reach + ANCHORS.chargeSight) break;
                charging = true;
                if (gap <= m.reach) target = e;
                else {
                  nearest = gap;
                  nearestFoe = e;
                }
                break;
              }
            }
            if (!charging) {
              for (const e of foes) {
                const gap = (e.x - m.x) * d;
                if (gap < -0.5) continue;
                if (gap < nearest) {
                  nearest = gap;
                  nearestFoe = e;
                }
                if (gap > m.reach) break;
                if (!target || (e.troop === def.beats && target.troop !== def.beats)) target = e;
              }
            }
            if (target) {
              // Cover: the defender's depth into its own half, from none at the middle.
              const depth = Math.max(0, 1 - Math.abs(target.x - gateX(target.side)) / HALF);
              const shield = def.breaksWalls ? 1 : coverAt(depth, coverGate.value);
              hit(target, m.dps * counterMultiplier(m.troop, target.troop, s) * shield * fury * dt);
              m.hitAgo = 0;
              struck.add(m.id);
              aheadInFile.set(m.file, m);
              continue;
            }
            const toGate = (gateX(other(side)) - m.x) * d;
            const gateReach = def.breaksWalls ? Math.min(m.reach, ANCHORS.gateReach) : m.reach;
            if (nearest === Infinity && toGate <= gateReach) {
              events.gate.push({ side, damage: m.gateDps * fury * dt });
              m.hitAgo = 0;
              aheadInFile.set(m.file, m);
              continue;
            }
            let room = m.speed * dt;
            if (nearestFoe) {
              // Two walking lines meet halfway; a line that stands and fights is closed on whole.
              const share = standing.has(nearestFoe.id) ? 1 : 0.5;
              room = Math.min(room, Math.max(0, (nearest - m.reach * 0.9) * share));
            }
            const ahead = aheadInFile.get(m.file);
            if (ahead)
              room = Math.min(room, Math.max(0, (ahead.x - m.x) * d - ANCHORS.rankSpacing));
            moves.push([m, d * room]);
            aheadInFile.set(m.file, m);
          }
        }

        // The gatehouse bows: each keep shoots the nearest attacker within reach of its gate.
        for (const side of SIDES) {
          const nearest = cols[other(side)][0];
          if (nearest && Math.abs(nearest.x - gateX(side)) <= ANCHORS.gatehouseReach)
            hit(nearest, ANCHORS.gatehouseDps * dt);
        }

        for (const [m, dx] of moves) m.x += dx;
        standing = struck;
        let fell = false;
        for (const [m, dmg] of damage) {
          m.hp -= dmg;
          m.hitAgo = 0;
          if (m.hp <= 0) {
            fell = true;
            events.fallen.push({ side: m.side, troop: m.troop });
          }
        }
        if (fell) {
          for (let i = all.length - 1; i >= 0; i--) if (all[i]!.hp <= 0) all.splice(i, 1);
        }
        version.value++;
        return events;
      }

      function front(side: Side): number {
        let best = 0;
        for (const m of list()) if (m.side === side) best = Math.max(best, advance(m));
        return best;
      }

      function line(): number | null {
        const pf = front('player');
        const rf = L - front('rival');
        const any = (side: Side) => list().some((m) => m.side === side);
        if (!any('player') || !any('rival') || rf - pf > ENGAGED) return null;
        return (pf + rf) / 2;
      }

      function worth(side: Side, id?: TroopId): number {
        let w = 0;
        for (const m of list()) if (m.side === side && (!id || m.troop === id)) w += m.cost;
        return w;
      }

      function clear(): void {
        list().splice(0);
        standing = new Set();
        version.value++;
      }

      api = {
        members,
        bailey,
        lastWave,
        clock,
        version,
        room: (side) => ANCHORS.muster - fielded(side),
        stage,
        release,
        step,
        front,
        line,
        worth,
        clear,
      };
      ctx.provide(CausewayKey, api);
    },
  };
}
