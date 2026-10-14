import {
  Decimal,
  addResource,
  computed,
  persistent,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { toRaw } from 'vue';
import {
  ANCHORS,
  ARRIVAL_GATES,
  CHALLENGERS,
  PAR,
  RULES,
  challenger,
  type ChallengerId,
} from '../data';
import { foeName, foeShows, openBout, resolveBeat, type BeatNote, type BoutState } from './bout';
import { DojoKey } from './dojo';
import type { FoeState, Move } from './kata-lang';
import { LineageKey } from './lineage';
import { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';

/**
 * The gate: challengers arriving on the dojo's growth, the next visitor announced ahead,
 * and the bout itself. Each challenger first steps through once all-time Ki passes its
 * arrival gate; after that, beaten challengers return in a seeded rotation. A bout cannot
 * be refused. It resolves one beat at a time from the student's moves (`./kata.ts` calls
 * {@link GateApi.resolve}), and a win pays a bounty in training strikes, more the faster it
 * came. A first win raises the dojo's standing (`./lineage.ts`).
 */

/** The visitor the gate has announced, and when it steps through. */
export interface Visitor {
  id: ChallengerId;
  /** Seconds of play at which the bout opens. */
  at: number;
}

export interface GateApi {
  next: Persistent<Visitor | null>;
  /** The bout in progress, or null between bouts. */
  bout: Persistent<BoutState | null>;
  inBout: ComputedRef<boolean>;
  /** What the scroll reads. Outside a bout: no foe, and full chi. */
  shows(state: FoeState): boolean;
  name(): string | null;
  foes(): number;
  chi(): number;
  /** Whether the student can act this beat: false while knocked down or jarred. */
  canAct(): boolean;
  /** Resolve one beat of the bout with the student's move; null for a wait or a purchase. */
  resolve(move: Move | null, flurry: boolean): BeatNote[];
  /** End any bout without a result and clear the announcement: graduation's hook. */
  abort(): void;
  /** The last bout's result, for the gate card: who, how, in how many beats, for how much. */
  last: Persistent<{ id: ChallengerId; won: boolean; beats: number; bounty: string } | null>;
}

export const GateKey: InjectionKey<GateApi> = Symbol('scripter/gate') as InjectionKey<GateApi>;

let api: GateApi;

export function getGate(): GateApi {
  return api;
}

/** Mulberry32 step over a plain seed, for the rotation's draw. */
function draw(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function createGateModule(): EngineModule {
  return {
    id: 'scripter/gate',
    dependencies: ['scripter/tuning', 'scripter/lineage', 'scripter/dojo'],
    install(ctx) {
      const tuning = ctx.inject(ScripterTuningRegistryKey);
      const lineage = ctx.inject(LineageKey);
      const dojo = ctx.inject(DojoKey);
      const rotation = tunable(
        tuning,
        'gate/rotationSeconds' satisfies ScripterTunableKey,
        () => ANCHORS.rotationSeconds,
      );
      const perBeat = tunable(
        tuning,
        'gate/bountyStrikesPerBeat' satisfies ScripterTunableKey,
        () => ANCHORS.bountyStrikesPerBeat,
      );

      const next = persistent<Visitor | null>(null, { id: 'next' });
      const bout = persistent<BoutState | null>(null, { id: 'bout' });
      const last = persistent<{
        id: ChallengerId;
        won: boolean;
        beats: number;
        bounty: string;
      } | null>(null, { id: 'last' });
      const seed = persistent<number>(1, { id: 'seed' });
      const inBout = computed(() => bout.value !== null);
      const now = () => lineage.playSeconds.value;

      /** The next visitor: a challenger who has come and is still unbeaten, else one drawn from the beaten. */
      function schedule(delay: number) {
        const unbeaten = lineage.arrived.value.find((id) => !lineage.beaten.value.includes(id));
        let id = unbeaten;
        if (!id && lineage.beaten.value.length) {
          const [r, s] = draw(seed.value);
          seed.value = s;
          id = lineage.beaten.value[Math.floor(r * lineage.beaten.value.length)];
        }
        next.value = id ? { id, at: now() + delay } : null;
      }

      ctx.onTick(() => {
        // Arrivals: a challenger steps up once all-time Ki passes its gate.
        const earned = Decimal.fromValue(dojo.ki.cumulative!.value);
        for (const c of CHALLENGERS) {
          if (lineage.arrived.value.includes(c.id) || earned.lt(ARRIVAL_GATES[c.id])) continue;
          lineage.arrived.value = [...lineage.arrived.value, c.id];
          lineage.say('gate', `${c.displayName} is coming to the gate.`);
          if (!bout.value) next.value = { id: c.id, at: now() + ANCHORS.announceSeconds };
        }
        if (bout.value) return;
        if (!next.value) schedule(Number(rotation.value));
        if (next.value && now() >= next.value.at) {
          const id = next.value.id;
          next.value = null;
          bout.value = openBout(id, seed.value);
          seed.value = draw(seed.value)[1];
          lineage.say('gate', `${challenger(id).displayName} steps through the gate.`);
        }
      });

      function finish(s: BoutState) {
        const id = s.challenger;
        const won = s.result === 'won';
        let bounty = Decimal.dZero;
        if (won) {
          const speed = Math.min(ANCHORS.bountySpeedCap, PAR[id] / Math.max(1, s.beat));
          bounty = Decimal.mul(dojo.strikeValue.value, Number(perBeat.value) * PAR[id] * speed);
          addResource(dojo.ki, bounty);
          const first = !lineage.beaten.value.includes(id);
          if (first) lineage.beaten.value = [...lineage.beaten.value, id];
          lineage.say(
            'win',
            `${challenger(id).displayName} bows after ${s.beat} beats${first ? ' — the dojo’s standing rises' : ''}.`,
          );
        } else {
          lineage.say(
            'loss',
            `The incense burns out. ${challenger(id).displayName} leaves unbeaten.`,
          );
        }
        last.value = { id, won, beats: s.beat, bounty: bounty.toString() };
        bout.value = null;
        schedule(Number(rotation.value) * (won ? 1 : ANCHORS.returnAfterLoss));
      }

      api = {
        next,
        bout,
        inBout,
        last,
        shows: (state) => (bout.value ? foeShows(bout.value, state) : false),
        name: () => (bout.value ? foeName(bout.value) : null),
        foes: () => bout.value?.attackers.length ?? 0,
        chi: () => bout.value?.chi ?? RULES.chiMax,
        canAct: () => !bout.value || bout.value.down === 0,
        resolve(move, flurry) {
          if (!bout.value) return [];
          const s = structuredClone(toRaw(bout.value));
          const notes = resolveBeat(s, move, dojo.fist.value, flurry);
          if (notes.includes('smashed'))
            lineage.say('loss', 'The hammerfist lands. The student is knocked down.');
          if (notes.includes('parried'))
            lineage.say('win', 'Parried! Brother Gang staggers, open.');
          if (notes.includes('next-challenger'))
            lineage.say('gate', `${challenger(s.attackers[0].id).displayName} steps up next.`);
          if (s.result) finish(s);
          else bout.value = s;
          return notes;
        },
        abort() {
          bout.value = null;
          next.value = null;
        },
      };
      ctx.provide(GateKey, api);
    },
  };
}
