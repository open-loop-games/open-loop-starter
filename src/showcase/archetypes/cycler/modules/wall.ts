import {
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { DEFENSE_BALANCE } from '../data/defense';

/**
 * Wall module — the defended line's HP buffer (IDENTITY § Cycler's realization;
 * studio/open-loop-starter#21 leaf 3). Leak-through `max(0, W_N − C)` from each
 * salvo bleeds the line; MW surplus repairs it during STANDBY; a breach ends the
 * cycle (OVERRUN → Redeploy). This is the bounded `Δ_wall` tail the player controls
 * by repairing — the leaf-1 spine's line buffer, made concrete.
 *
 * NOT an engine primitive: a bounded [0, max] HP value with discrete damage and a
 * surplus-fed repair drip composes on `persistent` + clamp — deleting the hand-roll
 * forces inventing nothing (`createResource` carries no max/cap). A cousin of the
 * `candidate-primitives.md` "Bidirectional bounded gauge" (that one is a [0,1] scalar
 * read through a curve into a multiplier; the wall is raw HP with a breach at 0, no
 * curve) — noted there as a watch, not graduated.
 *
 * The line's max scales with permanent power at run start (`resetRun(maxHp)` — the
 * orchestrator passes `lineHP · producerUpgradeRatio^L`) so the Δ_wall tail stays
 * power-invariant: leak ∝ C ∝ power, and the buffer scales with it, so ratios (and
 * thus the survived-wave count) don't move with reach. Decoupling holds in the tail.
 */
export interface WallApi {
  /** Current line HP. Breaches at ≤ 0. */
  hp: ComputedRef<number>;
  /** The line's max HP for the active run (set at resetRun; scales with power). */
  max: ComputedRef<number>;
  /** True once the line has exhausted — the OVERRUN condition. */
  breached: ComputedRef<boolean>;
  /** Line integrity in [0, 1] — the HUD read. */
  integrity: ComputedRef<number>;
  /** Apply leak-through damage (the caller passes `max(0, W_N − C)`). Returns true on breach. */
  applyLeak(leak: number): boolean;
  /** Repair from MW surplus, capped at max. Ignores non-positive amounts. */
  repair(amount: number): void;
  /** Restore the line to a fresh `maxHp` for a new run (Redeploy re-peg). */
  resetRun(maxHp: number): void;
}

export const WallKey: InjectionKey<WallApi> = Symbol('cycler/wall') as InjectionKey<WallApi>;

let wall: WallApi | null = null;

export function getWall(): WallApi {
  if (!wall) throw new Error('cycler/wall: not installed yet');
  return wall;
}

export function createWallModule(): EngineModule {
  // `lineHP` is read here only to seed the persistent refs on a cold boot. The
  // live value arrives per run through `resetRun(hp)`, which the kernel calls
  // with the tunable `line/hp` scaled by power — so this is not a second home
  // for the number, it is the value before the first run exists.
  const seedHp = DEFENSE_BALANCE.lineHP;

  return {
    id: 'cycler/wall',
    install(ctx) {
      const state = withPersistentContext('cycler/wall', () => ({
        hp: persistent<number>(seedHp, { name: 'hp' }),
        maxHp: persistent<number>(seedHp, { name: 'max-hp' }),
      }));

      const hp = computed(() => state.hp.value);
      const max = computed(() => state.maxHp.value);
      const breached = computed(() => state.hp.value <= 0);
      const integrity = computed(() =>
        state.maxHp.value > 0 ? Math.max(0, state.hp.value) / state.maxHp.value : 0,
      );

      const applyLeak = (leak: number): boolean => {
        if (leak > 0) state.hp.value -= leak;
        return state.hp.value <= 0;
      };
      const repair = (amount: number): void => {
        if (amount <= 0) return;
        state.hp.value = Math.min(state.maxHp.value, state.hp.value + amount);
      };
      const resetRun = (maxHp: number): void => {
        state.maxHp.value = maxHp;
        state.hp.value = maxHp;
      };

      const api: WallApi = { hp, max, breached, integrity, applyLeak, repair, resetRun };
      wall = api;
      ctx.provide(WallKey, api);
    },
  };
}
