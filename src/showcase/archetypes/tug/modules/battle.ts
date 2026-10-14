import {
  computed,
  createReset,
  Decimal,
  persistent,
  random,
  SaveManagerKey,
  subtractResource,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { ANCHORS, OUR_HERALD, lordAt, type LordDef } from '../data';
import { CausewayKey, type Wave } from './causeway';
import { ChronicleKey, type BattleRecord } from './chronicle';
import { KeepKeys } from './keep';
import { RivalKey, type Commander } from './rival';
import { SIDES, other, type Side } from './sides';
import { TugTuningRegistryKey } from './tuning';

export type Phase = 'camp' | 'battle';

/** One horn's pair of lines: the herald's cry, and Fairhold's chronicler on it. */
export interface HeraldLine {
  t: number;
  side: Side;
  cry: string;
  gloss?: string;
  wave: Wave;
}

export interface BattleApi {
  /** Between battles Fairhold is in camp, at the Chronicle. */
  phase: Persistent<Phase>;
  /** Whose horn leads once the opening horn has sounded: tossed at the battle's start. */
  firstHorn: Persistent<Side>;
  /** Releases each keep has made this battle. */
  horns: Record<Side, Persistent<number>>;
  heralds: Persistent<HeraldLine[]>;
  /** The lord across the causeway this battle. */
  lord: ComputedRef<LordDef>;
  /** Seconds until a keep's next horn. */
  hornIn(side: Side): number;
  /** Seconds between one keep's horns. */
  hornSeconds: ComputedRef<number>;
  /** When the last week of the season begins. */
  seasonSeconds: ComputedRef<number>;
  /**
   * Who chooses each keep's wave at its horn. The rival's lord always does; Fairhold's is the
   * player, unless a probe seats a commander there.
   */
  commanders: Partial<Record<Side, Commander>>;
  /** Opens a battle. `first` overrides the toss, for probes and tests that alternate it. */
  start(first?: Side): void;
}

export const BattleKey: InjectionKey<BattleApi> = Symbol('tug/battle') as InjectionKey<BattleApi>;

let api: BattleApi;

export function getBattle(): BattleApi {
  return api;
}

const HERALD_LINES = 6;

/**
 * One battle on the causeway, from the toss to a fallen gate. The battle tick runs in a
 * fixed order: the clock, both harvests, any horn that is due (its commander chooses, the
 * bailey empties), the clash, then the gates. A finished battle is written into the
 * Chronicle at once and Fairhold returns to camp.
 *
 * The battle and the keeps are saved, so a reload resumes mid-battle. Starting the next
 * battle resets the keeps and the causeway, never the Chronicle.
 */
// A run whose end waits for the player is game code by the engine's design: `createReset` on
// start plus a tick phase (open-loop-engine#59). `createCycle` would restart at once.
export function createBattleModule(): EngineModule {
  return {
    id: 'tug/battle',
    dependencies: [
      'tug/chronicle',
      'tug/causeway',
      'tug/keep-player',
      'tug/keep-rival',
      'tug/rival',
    ],
    install(ctx) {
      const tuning = ctx.inject(TugTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);
      const causeway = ctx.inject(CausewayKey);
      const keeps = { player: ctx.inject(KeepKeys.player), rival: ctx.inject(KeepKeys.rival) };
      const saves = ctx.tryInject(SaveManagerKey);
      const hornSeconds = tunable(tuning, 'horn/seconds', () => ANCHORS.hornSeconds);
      const seasonSeconds = tunable(tuning, 'season/seconds', () => ANCHORS.seasonSeconds);

      const phase = persistent<Phase>('camp', { id: 'phase' });
      const firstHorn = persistent<Side>('player', { id: 'first-horn' });
      const horns = {
        player: persistent(0, { id: 'horns-player' }),
        rival: persistent(0, { id: 'horns-rival' }),
      };
      const heralds = persistent<HeraldLine[]>([], { id: 'heralds' });
      const lord = computed(() => lordAt(chronicle.rung.value));
      const commanders: BattleApi['commanders'] = { rival: ctx.inject(RivalKey) };

      const battleReset = createReset({
        resetPersistentContexts: ['tug/keep-player', 'tug/keep-rival', 'tug/causeway'],
      });

      /**
       * Both keeps sound the opening horn together at T, so the first waves meet at the
       * middle. After it the horns alternate: the keep that won the toss at T/2 + kT, the
       * other at T + kT.
       */
      function nextHorn(side: Side): number {
        const T = hornSeconds.value;
        const k = horns[side].value;
        if (k === 0) return T;
        return (side === firstHorn.value ? T / 2 : T) + k * T;
      }

      const pick = (lines: string[]) => lines[Math.floor(random() * lines.length)]!;

      function sound(side: Side): void {
        horns[side].value++;
        commanders[side]?.(horns[side].value, seasonSeconds.value);
        const wave = causeway.release(side);
        if (!Object.keys(wave).length) return;
        const l = lord.value;
        const line: HeraldLine =
          side === 'player'
            ? { t: causeway.clock.value, side, cry: pick(OUR_HERALD), wave }
            : { t: causeway.clock.value, side, cry: pick(l.boasts), gloss: pick(l.glosses), wave };
        heralds.value = [...heralds.value, line].slice(-HERALD_LINES);
      }

      function finish(winner: Side): BattleRecord {
        const record = chronicle.record(winner === 'player', causeway.clock.value);
        phase.value = 'camp';
        // A Chronicle entry is the one thing a reload must never lose; don't wait for the autosave.
        saves?.save();
        return record;
      }

      function start(first?: Side): void {
        battleReset.reset();
        causeway.clear();
        for (const side of SIDES) {
          keeps[side].open();
          horns[side].value = 0;
        }
        firstHorn.value = first ?? (random() < 0.5 ? 'player' : 'rival');
        heralds.value = [];
        phase.value = 'battle';
      }

      ctx.onTick((dt) => {
        if (phase.value !== 'battle') return;
        causeway.clock.value += dt;
        const t = causeway.clock.value;
        for (const side of SIDES) keeps[side].accrue(dt);
        const order = firstHorn.value === 'player' ? SIDES : [...SIDES].reverse();
        for (const side of order) while (t >= nextHorn(side)) sound(side);

        const events = causeway.step(dt);
        for (const g of events.gate) {
          const target = keeps[other(g.side)];
          target.gateDamage.value += g.damage;
          // Loss on failure: a raider at the gate loots the treasury it is battering.
          const loot = Decimal.min(target.silver.value, g.damage * ANCHORS.lootShare);
          subtractResource(target.silver, loot);
        }
        for (const side of SIDES) {
          if (keeps[side].gateDamage.value >= keeps[side].gateMax.value) {
            finish(other(side));
            return;
          }
        }
      });

      api = {
        phase,
        firstHorn,
        horns,
        heralds,
        lord,
        hornIn: (side) => Math.max(0, nextHorn(side) - causeway.clock.value),
        hornSeconds,
        seasonSeconds,
        commanders,
        start,
      };
      ctx.provide(BattleKey, api);
    },
  };
}
