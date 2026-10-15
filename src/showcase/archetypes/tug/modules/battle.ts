import {
  computed,
  createReset,
  Decimal,
  persistent,
  random,
  SaveManagerKey,
  subtractResource,
  toNumber,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { createEventLog, type EventLog } from '@/modules/event-log';
import { ANCHORS, EVENT_HERALDS, OUR_HERALD, TROOP_IDS, seasonClose, type LordDef } from '../data';
import { CausewayKey, type Wave } from './causeway';
import { ChronicleKey, type BattleRecord } from './chronicle';
import { KeepKeys } from './keep';
import { RivalKey, type Commander, type WatchView } from './rival';
import { SIDES, other, type Side } from './sides';
import { TugTuningRegistryKey } from './tuning';

export type Phase = 'camp' | 'battle';

/**
 * What a herald's line carries beside its cry (the line's text) and its side (the line's
 * kind): Fairhold's chronicler on a rival's cry, and the wave a horn released. An event line
 * carries no wave.
 */
export interface HeraldExtra {
  gloss?: string;
  wave?: Wave;
}

export interface BattleApi {
  /** Between battles Fairhold is in camp, at the Chronicle. */
  phase: Persistent<Phase>;
  /** Whose horn leads once the opening horn has sounded: tossed at the battle's start. */
  firstHorn: Persistent<Side>;
  /** Releases each keep has made this battle. */
  horns: Record<Side, Persistent<number>>;
  /** The battle's heralds, kinded by side: saved, and emptied when a battle opens. */
  heralds: EventLog<Side, HeraldExtra>;
  /** The lord across the causeway this battle. */
  lord: ComputedRef<LordDef>;
  /** Seconds until a keep's next horn. */
  hornIn(side: Side): number;
  /** What sounding `side`'s horn now would cost, or null if it cannot yet. */
  earlyFee(side: Side): number | null;
  /** Sounds `side`'s horn now, for the fee; its next horn follows a full period after. */
  soundEarly(side: Side): boolean;
  /** Fires `side`'s keep weapon if it is charged, and heralds it. */
  fire(side: Side): void;
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

const battleApi = createModuleApi(BattleKey);
export const getBattle = battleApi.get;

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
      const heralds = createEventLog<Side, HeraldExtra>(ctx, {
        cap: HERALD_LINES,
        clock: () => causeway.clock.value,
        persistId: 'herald-log',
      });
      const lord = computed(() => chronicle.lord.value);
      const hornAt = {
        player: persistent<number>(ANCHORS.hornSeconds, { id: 'horn-at-player' }),
        rival: persistent<number>(ANCHORS.hornSeconds, { id: 'horn-at-rival' }),
      };
      const lastHorn = {
        player: persistent(0, { id: 'last-horn-player' }),
        rival: persistent(0, { id: 'last-horn-rival' }),
      };
      const championsOut = persistent(0, { id: 'champions-out' });
      let nextWatch = 0;
      const commanders: BattleApi['commanders'] = { rival: ctx.inject(RivalKey) };

      const battleReset = createReset({
        resetPersistentContexts: ['tug/keep-player', 'tug/keep-rival', 'tug/causeway'],
      });

      /**
       * Both keeps sound the opening horn together at T, so the first waves meet at the
       * middle. After it the horns alternate: the keep that won the toss half a period on,
       * the other a full period on. An early horn moves its keep's schedule to start from it.
       */
      const nextHorn = (side: Side) => hornAt[side].value;

      const pick = (lines: string[], name = '') =>
        lines[Math.floor(random() * lines.length)]!.replace('{name}', name).replace(
          '{lord}',
          lord.value.name,
        );

      function fire(side: Side): void {
        const kind = keeps[side].weapon.value;
        if (!kind || !keeps[side].fire()) return;
        if (side === 'player') heralds.post(pick(EVENT_HERALDS.ourWeapon[kind]), side);
        else heralds.post(pick(EVENT_HERALDS.theirWeapon[kind]), side);
      }

      function sound(side: Side): void {
        const T = hornSeconds.value;
        const t = causeway.clock.value;
        const opening = horns[side].value === 0;
        horns[side].value++;
        lastHorn[side].value = t;
        hornAt[side].value = t + (opening && side === firstHorn.value ? T / 2 : T);
        commanders[side]?.horn(horns[side].value, seasonSeconds.value);
        const wave = causeway.release(side);
        if (!Object.keys(wave).length) return;
        const l = lord.value;
        if (side === 'player') heralds.post(pick(OUR_HERALD), side, { wave });
        else heralds.post(pick(l.boasts), side, { gloss: pick(l.glosses), wave });
      }

      function earlyFee(side: Side): number | null {
        const t = causeway.clock.value;
        if (phase.value !== 'battle' || horns[side].value === 0) return null;
        if (t - lastHorn[side].value < hornSeconds.value / 2) return null;
        const wait = hornAt[side].value - t;
        if (wait <= 0) return null;
        return ANCHORS.earlyHornFee * keeps[side].income.value * wait;
      }

      function soundEarly(side: Side): boolean {
        const fee = earlyFee(side);
        if (fee === null || Decimal.lt(keeps[side].silver.value, fee)) return false;
        subtractResource(keeps[side].silver, fee);
        if (side === 'player') heralds.post(pick(EVENT_HERALDS.ourEarly), side);
        else heralds.post(pick(EVENT_HERALDS.theirEarly), side);
        sound(side);
        // An early horn is never the opening, so its next horn is a full period on.
        hornAt[side].value = causeway.clock.value + hornSeconds.value;
        return true;
      }

      function watchView(side: Side): WatchView {
        const t = causeway.clock.value;
        const keep = keeps[side];
        const theirFront = causeway.front(other(side));
        return {
          t,
          sinceHorn: t - lastHorn[side].value,
          hornIn: hornAt[side].value - t,
          sinceTheirs: t - lastHorn[other(side)].value,
          period: hornSeconds.value,
          silver: toNumber(keep.silver.value),
          income: keep.income.value,
          earlyFee: earlyFee(side) ?? Infinity,
          weapon: keep.weapon.value,
          charged: keep.charge.value >= ANCHORS.weaponCharge,
          enemyEngine: causeway.nearestEngine(side),
          enemyFront: theirFront > 0 ? ANCHORS.causewayLength - theirFront : Infinity,
          theirLast: causeway.lastWave[other(side)].value,
          open: TROOP_IDS.filter((id) => keep.isOpen(id)),
        };
      }

      function finish(winner: Side, byBreach: boolean): BattleRecord {
        const record = chronicle.record(winner === 'player', causeway.clock.value, byBreach);
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
          hornAt[side].value = hornSeconds.value;
          lastHorn[side].value = 0;
        }
        championsOut.value = 0;
        nextWatch = 0;
        firstHorn.value = first ?? (random() < 0.5 ? 'player' : 'rival');
        heralds.clear();
        phase.value = 'battle';
      }

      ctx.onTick((dt) => {
        if (phase.value !== 'battle') return;
        causeway.clock.value += dt;
        const t = causeway.clock.value;
        for (const side of SIDES) keeps[side].accrue(dt);
        const order = firstHorn.value === 'player' ? SIDES : [...SIDES].reverse();
        for (const side of order) while (t >= nextHorn(side)) sound(side);

        const champs = chronicle.field.value.champions;
        while (championsOut.value < champs.length && t >= champs[championsOut.value]!.at) {
          const champ = champs[championsOut.value++]!;
          causeway.champion('rival', champ);
          heralds.post(pick(EVENT_HERALDS.champion.cry, champ.name), 'rival', {
            gloss: pick(EVENT_HERALDS.champion.gloss, champ.name),
          });
        }

        // Between horns, once a second: each seated commander may fire or sound early.
        if (t >= nextWatch) {
          nextWatch = Math.floor(t) + 1;
          for (const side of SIDES) {
            const c = commanders[side];
            if (!c) continue;
            const w = c.watch(watchView(side));
            if (w.fire) fire(side);
            if (w.early) soundEarly(side);
          }
        }

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
            finish(other(side), true);
            return;
          }
        }
        // The season closes: the keep whose gate lost the larger share yields; on a tie, the
        // keep whose front stands nearer home.
        if (t >= seasonClose(seasonSeconds.value)) {
          const lost = (side: Side) => keeps[side].gateDamage.value / keeps[side].gateMax.value;
          const d = lost('player') - lost('rival');
          const held = causeway.front('player') - causeway.front('rival');
          const tie =
            Math.abs(held) < 1
              ? random() < 0.5
                ? 'player'
                : 'rival'
              : held < 0
                ? 'player'
                : 'rival';
          const yields: Side = d > 1e-9 ? 'player' : d < -1e-9 ? 'rival' : tie;
          finish(other(yields), false);
          return;
        }
      });

      battleApi.publish(ctx, {
        phase,
        firstHorn,
        horns,
        heralds,
        lord,
        hornIn: (side) => Math.max(0, nextHorn(side) - causeway.clock.value),
        earlyFee,
        soundEarly,
        fire,
        hornSeconds,
        seasonSeconds,
        commanders,
        start,
      });
    },
  };
}
