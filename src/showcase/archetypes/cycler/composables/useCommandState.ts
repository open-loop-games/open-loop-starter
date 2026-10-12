import { computed, type ComputedRef } from 'vue';
import { Decimal } from '@open-loop/engine';
import { getCycle, getBuild, getWall, getBurnTier, getUpgrades, type CyclePhase } from '../modules';
import { DEFENSE_BALANCE } from '../data/defense';

/**
 * Defense-Command HUD synthesis — the derived state the command bar, the defended
 * line, and the reserve readout need but no single module shows (studio/
 * open-loop-starter#21 leaf 5). Composes the wave kernel, the board economy, the
 * wall, and the pace surface into UI-shaped values: a derived DEFCON level, the
 * wave timeline (with boss marks), the signed MW net-rate, the line state, and the
 * effective (bent) escalation base. Kept beside `useCyclerRun` (the base run
 * synthesis) rather than folded in, so the run view stays lean for its consumers.
 *
 * Read only from panels under the post-start game view — the module getters resolve
 * by call time (see `.claude/rules/app-root-discipline.md`).
 */

/** A DEFCON step: 5 = peace (Standby) down to 1 = breach imminent. */
export type Defcon = 1 | 2 | 3 | 4 | 5;
/** The defended line's condition, driving its colour ramp. */
export type LineState = 'ok' | 'warn' | 'crit' | 'breach';

export interface TimelineSlot {
  /** 0-based wave index this slot stands for. */
  readonly n: number;
  /** Past / current / not-yet-arrived. */
  readonly state: 'done' | 'now' | 'future';
  /** A SATURATION (boss) wave — every `bossMilestone`-th, wave 0 excluded. */
  readonly boss: boolean;
}

export interface CommandState {
  /** Derived alert posture — 5 in Standby, climbing as the salvo nears the clear-rate. */
  defcon: ComputedRef<Defcon>;
  /** Short caption under the phase name (the mock's `.phase .sub`). */
  phaseSub: ComputedRef<string>;
  /** The command-bar alert banner text. */
  alert: ComputedRef<string>;
  /** Whether build is locked (INBOUND / SATURATION — you live with what you placed). */
  buildLocked: ComputedRef<boolean>;
  /** The wave timeline: fixed slot count, current position, live crawl within the current wave, boss marks. */
  timeline: ComputedRef<{
    total: number;
    current: number;
    progress: number;
    slots: TimelineSlot[];
  }>;
  /** Defended-line integrity [0,1]. */
  lineIntegrity: ComputedRef<number>;
  /** Defended-line condition (colour ramp). */
  lineState: ComputedRef<LineState>;
  /** Realized producer output MW/s of the live board. */
  mwOutput: ComputedRef<Decimal>;
  /** MW/s the Lances draw to fire (INBOUND). */
  mwDraw: ComputedRef<Decimal>;
  /** MW/s surplus routable to repair (the reserve). */
  mwSurplus: ComputedRef<Decimal>;
  /** Signed net MW/s for the current phase (+surplus in Standby, −draw net in Inbound). */
  mwNet: ComputedRef<Decimal>;
  /** Realized clear-rate C of the live board. */
  clearRate: ComputedRef<Decimal>;
  /** The active salvo posture's raw g. */
  rawG: ComputedRef<number>;
  /** The effective g after the Dampen bender — what the next run freezes. */
  bentG: ComputedRef<number>;
}

const PHASE_SUB: Record<CyclePhase, string> = {
  standby: 'build · re-arm the grid',
  inbound: 'salvo inbound · hold the line',
  saturation: 'MIRV salvo · milestone wave',
  overrun: 'line breached · redeploy',
};

export function useCommandState(): CommandState {
  const cycle = getCycle();
  const build = getBuild();
  const wall = getWall();
  const burnTier = getBurnTier();
  const upgrades = getUpgrades();
  const { bossMilestone } = DEFENSE_BALANCE;

  const isBoss = (n: number) => n > 0 && n % bossMilestone === 0;

  const defcon = computed<Defcon>(() => {
    if (cycle.runState.value === 'ended') return 1;
    if (cycle.phase.value === 'standby') return 5;
    // INBOUND/SATURATION: step down as the salvo climbs toward the clear-rate.
    const p = cycle.pressure.value;
    if (cycle.phase.value === 'saturation') return 2;
    if (p < 0.35) return 4;
    if (p < 0.7) return 3;
    return 2;
  });

  const phaseSub = computed(() => PHASE_SUB[cycle.phase.value]);
  const buildLocked = computed(
    () => cycle.phase.value === 'inbound' || cycle.phase.value === 'saturation',
  );

  const alert = computed(() => {
    switch (cycle.phase.value) {
      case 'standby':
        return `Grace window — place the grid; the line repairs from surplus. Wave ${cycle.waveIndex.value + 1} inbound.`;
      case 'saturation':
        return `SATURATION — milestone salvo. Survive it to step the stakes.`;
      case 'overrun':
        return `LINE OVERRUN — the salvo broke through. Redeploy to stand it back up.`;
      default:
        return `INBOUND — salvo ${cycle.waveIndex.value + 1} descending. Lances engaging at clear-rate C.`;
    }
  });

  // A fixed slot count for the run: the authored crossing plus a short tail estimate,
  // floored to a stable integer so the bar doesn't reflow wave to wave.
  const timeline = computed(() => {
    const crossing = Math.ceil(cycle.predictedRunLengthWaves());
    const total = Math.max(crossing + 2, cycle.waveIndex.value + 1);
    const current = cycle.waveIndex.value;
    const slots: TimelineSlot[] = [];
    for (let n = 0; n < total; n++) {
      slots.push({
        n,
        state: n < current ? 'done' : n === current ? 'now' : 'future',
        boss: isBoss(n),
      });
    }
    return { total, current, progress: cycle.waveProgress.value, slots };
  });

  const lineIntegrity = computed(() => wall.integrity.value);
  const lineState = computed<LineState>(() => {
    if (wall.breached.value) return 'breach';
    const i = wall.integrity.value;
    if (i > 0.6) return 'ok';
    if (i > 0.3) return 'warn';
    return 'crit';
  });

  const mwOutput = computed(() => build.capacity.value);
  const mwDraw = computed(() => build.fireDraw.value);
  const mwSurplus = computed(() => build.mwSurplus.value);
  const mwNet = computed(() =>
    // Standby routes the surplus to the line; Inbound burns the fire-draw against output.
    buildLocked.value ? build.capacity.value.sub(build.fireDraw.value) : build.mwSurplus.value,
  );

  const rawG = computed(() => burnTier.activeTier.value.salvoBase);
  const bentG = computed(() => upgrades.bendBase(rawG.value));

  return {
    defcon,
    phaseSub,
    alert,
    buildLocked,
    timeline,
    lineIntegrity,
    lineState,
    mwOutput,
    mwDraw,
    mwSurplus,
    mwNet,
    clearRate: build.clearRate,
    rawG,
    bentG,
  };
}
