import {
  GAUNTLET_POOL,
  RULES,
  challenger,
  clockFor,
  type ChallengerId,
  type Pattern,
} from '../data';
import type { FoeState, Move } from './kata-lang';

/**
 * Bouts at the gate: the rules, as pure functions over a plain state, one beat at a time.
 *
 * A beat resolves in order: the student's move (or a wait, a fumble, a purchase), then each
 * attacker's own beat, then the bout's end. Damage is in fists: a challenger's health is a
 * count of plain blows, so a bout's length in beats depends on the scroll and the pattern.
 * The state is JSON-plain and carries its own seed, so a saved bout resumes as the same bout.
 */

/** One attacker at the gate. */
export interface Attacker {
  id: ChallengerId;
  hp: number;
  maxHp: number;
  /** The pattern's phase, and the beats left in it. */
  phase: string;
  left: number;
  /** Beats Brother Gang stays staggered after a parried smash. */
  stagger: number;
  /** Beats until a Red Gate attacker strikes. */
  next: number;
  /** Whether a blow landed on it this beat; Sister Wen mends when none did. */
  struck?: boolean;
}

export interface BoutState {
  challenger: ChallengerId;
  /** The attackers standing, in front first. */
  attackers: Attacker[];
  /** The Gauntlet's challengers still to come. */
  queue: ChallengerId[];
  chi: number;
  /** Beats the student spends on the ground or with jarred hands. */
  down: number;
  /** Beats a raised parry still holds. */
  parry: number;
  /** The forms of the student's last blows, newest first. */
  forms: Move[];
  beat: number;
  result: 'won' | 'lost' | null;
  /** Mulberry32 state: the bout's own seed. */
  seed: number;
}

/** What one beat did, for the journal. */
export type BeatNote =
  | 'glanced'
  | 'jarred'
  | 'blocked'
  | 'mirrored'
  | 'parried'
  | 'smashed'
  | 'fumbled'
  | 'next-challenger';

/** Mulberry32 over the bout's seed: returns [0, 1) and advances the state. */
export function roll(s: BoutState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s: BoutState, [lo, hi]: readonly [number, number]) =>
  lo + Math.floor(roll(s) * (hi - lo + 1));
const patternOf = (a: Attacker): Pattern => challenger(a.id).pattern;

function enterPhase(s: BoutState, a: Attacker, phase: string) {
  a.phase = phase;
  a.left =
    phase === 'idle' && patternOf(a) === 'hammer'
      ? between(s, RULES.hammer.idle)
      : phase === 'winds'
        ? RULES.hammer.winds
        : phase === 'smash' || phase === 'jab'
          ? 1
          : phase === 'shell'
            ? between(s, RULES.shell.shell)
            : phase === 'open'
              ? RULES.shell.open
              : phase === 'high' || phase === 'low'
                ? between(s, RULES.twinsHold)
                : Infinity;
}

function attackers(s: BoutState, id: ChallengerId, share = 1): Attacker[] {
  const def = challenger(id);
  const make = (): Attacker => {
    const a: Attacker = {
      id,
      hp: def.blows * share,
      maxHp: def.blows * share,
      phase: 'idle',
      left: Infinity,
      stagger: 0,
      next: 0,
    };
    const p = def.pattern;
    enterPhase(
      s,
      a,
      p === 'shell' ? 'shell' : p === 'twins' ? (roll(s) < 0.5 ? 'high' : 'low') : 'idle',
    );
    return a;
  };
  if (def.pattern !== 'gang') return [make()];
  return Array.from({ length: RULES.redgate.count }, (_, i) => {
    const a = make();
    a.next = RULES.redgate.every - i; // staggered: each on their own beat
    return a;
  });
}

/**
 * Open a bout against a challenger.
 *
 * @param id - the challenger at the gate
 * @param seed - the bout's seed; the same seed replays the same bout
 */
export function openBout(id: ChallengerId, seed: number): BoutState {
  const s: BoutState = {
    challenger: id,
    attackers: [],
    queue: [],
    chi: RULES.chiMax,
    down: 0,
    parry: 0,
    forms: [],
    beat: 0,
    result: null,
    seed,
  };
  if (challenger(id).pattern === 'gauntlet') {
    const pool = [...GAUNTLET_POOL];
    for (let i = 0; i < RULES.gauntlet.count; i++)
      s.queue.push(pool.splice(Math.floor(roll(s) * pool.length), 1)[0]);
    s.attackers = attackers(s, s.queue.shift()!, RULES.gauntlet.blowsShare);
  } else s.attackers = attackers(s, id);
  return s;
}

// ─── What the scroll can read ──────────────────────────────────────────

/** Whether the attacker in front shows a state the scroll can test. */
export function foeShows(s: BoutState, state: FoeState): boolean {
  const a = s.attackers[0];
  if (!a) return false;
  if (state === 'open') return a.stagger > 0 || a.phase === 'open';
  return a.phase === state;
}

/** The name `foe is` reads: the attacker in front's. */
export function foeName(s: BoutState): string | null {
  return s.attackers[0] ? challenger(s.attackers[0].id).name : null;
}

/** Whether the student can act on this beat at all: false while down or jarred. */
export function canAct(s: BoutState): boolean {
  return s.down === 0;
}

/** Whether the student has the chi for a move. */
export function hasChi(s: BoutState, move: Move): boolean {
  return s.chi >= Math.max(0, RULES.chiCost[move] ?? 0);
}

// ─── A beat ────────────────────────────────────────────────────────────

/**
 * Resolve one beat.
 *
 * @param s - the bout, changed in place
 * @param move - the student's move this beat; null for a wait, or for a move that does not
 *   touch the bout (a purchase)
 * @param fist - the student's blow, in fist points
 * @param flurry - whether this blow repeats its line without a pause
 * @returns what the beat did worth a journal line
 */
export function resolveBeat(
  s: BoutState,
  move: Move | null,
  fist: number,
  flurry = false,
): BeatNote[] {
  if (s.result) return [];
  const notes: BeatNote[] = [];
  s.beat++;
  if (s.down > 0) {
    s.down--;
    move = null;
  }
  if (move && RULES.chiCost[move] !== undefined) {
    if (!hasChi(s, move)) {
      notes.push('fumbled');
      move = null;
    } else s.chi = Math.min(RULES.chiMax, s.chi - RULES.chiCost[move]);
  }
  if (move === 'parry') s.parry = RULES.hammer.parryBeats;
  if (move === 'strike' || move === 'kick' || move === 'palm' || move === 'sweep')
    blow(s, move, fist, flurry, notes);
  for (const a of [...s.attackers]) foeBeat(s, a, notes);
  if (s.parry > 0) s.parry--;
  s.chi = Math.min(RULES.chiMax, s.chi + RULES.chiRegen);
  s.attackers = s.attackers.filter((a) => a.hp > 0);
  if (s.attackers.length === 0) {
    if (s.queue.length) {
      s.attackers = attackers(s, s.queue.shift()!, RULES.gauntlet.blowsShare);
      notes.push('next-challenger');
    } else s.result = 'won';
  }
  if (!s.result && s.beat >= clockFor(s.challenger)) s.result = 'lost';
  return notes;
}

function blow(s: BoutState, form: Move, fist: number, flurry: boolean, notes: BeatNote[]) {
  const targets = form === 'sweep' ? s.attackers : s.attackers.slice(0, 1);
  const mirrored = s.forms.slice(0, RULES.mirrorMemory).includes(form);
  s.forms = [form, ...s.forms].slice(0, 4);
  for (const a of targets) {
    const p = patternOf(a);
    let dmg = 1;
    if (form === 'sweep') dmg = p === 'gang' ? RULES.redgate.sweepMult : RULES.sweepSingle;
    if (p === 'hide') dmg *= Math.max(0, fist - RULES.hideArmor) / fist;
    if (p === 'wall' && !flurry) {
      dmg *= RULES.wallGlance;
      notes.push('glanced');
    }
    if (p === 'hammer' && a.stagger > 0) dmg *= RULES.hammer.openMult;
    if (p === 'shell') {
      if (a.phase === 'open') dmg *= RULES.shell.openMult;
      else {
        dmg = 0;
        s.down = Math.max(s.down, RULES.shell.jarBeats);
        s.chi = Math.max(0, s.chi - RULES.shell.jarChi);
        notes.push('jarred');
      }
    }
    if (
      p === 'twins' &&
      ((a.phase === 'high' && form !== 'kick') || (a.phase === 'low' && form === 'kick'))
    ) {
      dmg = 0;
      notes.push('blocked');
    }
    if (p === 'mirror' && mirrored) {
      dmg = 0;
      s.chi = Math.max(0, s.chi - RULES.mirrorAnswerChi);
      notes.push('mirrored');
    }
    a.hp -= dmg;
    a.struck = true;
  }
}

const NEXT_PHASE: Record<string, string> = {
  idle: 'winds',
  winds: 'smash',
  smash: 'idle',
  shell: 'jab',
  jab: 'open',
  open: 'shell',
  high: 'low',
  low: 'high',
};

function foeBeat(s: BoutState, a: Attacker, notes: BeatNote[]) {
  const p = patternOf(a);
  const struck = a.struck === true;
  a.struck = false;
  if (a.stagger > 0) {
    a.stagger--;
    return;
  }
  if (p === 'crane') {
    s.chi = Math.max(0, s.chi - RULES.craneSap);
    if (!struck) a.hp = Math.min(a.maxHp, a.hp + RULES.craneMend);
  }
  if (p === 'gang' && --a.next <= 0) {
    a.next = RULES.redgate.every;
    s.chi = Math.max(0, s.chi - RULES.redgate.hitChi);
  }
  if (p === 'hammer' && a.phase === 'smash') {
    if (s.parry > 0) {
      a.stagger = RULES.hammer.stagger + 1;
      notes.push('parried');
    } else {
      s.down = RULES.hammer.downBeats;
      s.chi = Math.max(0, s.chi - RULES.hammer.downChi);
      notes.push('smashed');
    }
  }
  if (p === 'shell' && a.phase === 'jab') s.chi = Math.max(0, s.chi - RULES.shell.jabChi);
  if (--a.left <= 0 && NEXT_PHASE[a.phase]) enterPhase(s, a, NEXT_PHASE[a.phase]);
}

/** Whether a pattern shows phases the gate card should name. */
export function showsPhase(p: Pattern): boolean {
  return p === 'hammer' || p === 'shell' || p === 'twins';
}
