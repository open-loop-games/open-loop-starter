import { WORD_TECHNIQUE, type TechniqueId } from '../data';

/**
 * The kata language: the text a sensei inks onto a scroll and the student performs.
 *
 * One move per line, read top to bottom, then from the top again:
 *
 *   [if|when <test>:] [<N>x] <move> [max]        # comment
 *   [<N>x] alternate <move> <move> […]           # the next move in turn, each time
 *   if <test>:                                   # a block: the lines indented under it
 *     <line>                                     #   run only while the test holds
 *   else:                                        # the lines under it run only while
 *     <line>                                     #   the block above's test does not
 *
 *   test := ready <purchase> | <ki|students|senpai|chi|foes> <op> <number>
 *         | foe <winds|open|high|low> | foe is <name>
 *
 * `if` passes over a line whose test fails without spending a beat; `when` makes the student
 * stand and wait until it holds. Every word past `strike`, `breathe` and `recruit` is a
 * technique the dojo must learn first, and the scroll refuses words it has not been taught.
 * Pure: no engine, so the editor, the executor and the probes share one reading.
 */

export type Move =
  | 'strike'
  | 'kick'
  | 'palm'
  | 'sweep'
  | 'breathe'
  | 'parry'
  | 'recruit'
  | 'promote'
  | 'temper';
export type Purchase = 'recruit' | 'promote' | 'temper';
export type Subject = 'ki' | 'students' | 'senpai' | 'chi' | 'foes';
export type FoeState = 'winds' | 'open' | 'high' | 'low';
export type Op = '>=' | '<=' | '>' | '<';

export type Test =
  | { kind: 'ready'; purchase: Purchase }
  | { kind: 'compare'; subject: Subject; op: Op; value: number }
  | { kind: 'foe'; state: FoeState }
  | { kind: 'foe-is'; name: string };

export interface Guard {
  mode: 'if' | 'when';
  test: Test;
  /** An `else:` block's guard: the test of the block above it, turned around. */
  negate?: boolean;
}

/** One performable line: JSON-plain, because it rides in the executor's saved list. */
export interface KataLine {
  /** 1-based row in the inked text, for highlighting. */
  line: number;
  /** Every test the line answers to: the block heads above it, then its own. */
  guards: Guard[];
  reps: number;
  /** One move, or several taken in turn: the line's n-th performance takes moves[n % length]. */
  moves: Move[];
  max: boolean;
}

export interface KataError {
  line: number;
  message: string;
  /** Set when the word exists but is not learned yet: the technique that teaches it. */
  technique?: TechniqueId;
}

/** What one row of the text is, for the editor: every row has one. */
export type KataRow =
  | { kind: 'blank' | 'comment'; line: number; depth: number }
  | { kind: 'error'; line: number; depth: number; error: KataError }
  | {
      kind: 'block';
      line: number;
      depth: number;
      guard: Guard;
      outer: Guard[];
      otherwise?: boolean;
    }
  | { kind: 'move'; line: number; depth: number; parsed: KataLine; outer: Guard[] };

export interface ParseResult {
  lines: KataLine[];
  errors: KataError[];
  rows: KataRow[];
  /** Rows that count against the scroll's cap: moves and block heads. Comments are free. */
  moves: number;
}

export const MOVES: readonly Move[] = [
  'strike',
  'kick',
  'palm',
  'sweep',
  'breathe',
  'parry',
  'recruit',
  'promote',
  'temper',
];
export const PURCHASES: readonly Purchase[] = ['recruit', 'promote', 'temper'];
/** The moves that land a blow: in a bout they strike the foe, outside one they train. */
export const BLOWS: readonly Move[] = ['strike', 'kick', 'palm', 'sweep'];
const SUBJECTS: readonly Subject[] = ['ki', 'students', 'senpai', 'chi', 'foes'];
const FOE_STATES: readonly FoeState[] = ['winds', 'open', 'high', 'low'];
const OPS: readonly Op[] = ['>=', '<=', '>', '<'];
export const MAX_REPS = 9;

const isMove = (w: string | undefined): w is Move => (MOVES as readonly string[]).includes(w ?? '');
export const isPurchase = (w: string | undefined): w is Purchase =>
  (PURCHASES as readonly string[]).includes(w ?? '');

/** Strip a comment and lowercase; the leading spaces are the row's depth. */
function code(raw: string): { depth: number; text: string; comment: boolean } {
  const noComment = raw.replace(/#.*$/, '');
  const depth = noComment.length - noComment.trimStart().length;
  return {
    depth,
    text: noComment.trim().toLowerCase(),
    comment: noComment.trim() === '' && raw.trim() !== '',
  };
}

/**
 * Parse scroll text into performable lines, and say what every row is.
 *
 * @param text - the scroll as the player typed it
 * @param knows - whether the dojo has learned a technique
 * @param names - the challenger names `foe is` may name
 * @param lineCap - how many moves the scroll holds; blank and comment rows are free
 * @returns the lines that parsed, one error per row that did not, every row, and the move count
 *
 * @example
 * parseKata('if ready recruit: recruit\nstrike', () => true, [], 4).lines.length // 2
 */
export function parseKata(
  text: string,
  knows: (technique: TechniqueId) => boolean,
  names: readonly string[],
  lineCap: number,
): ParseResult {
  const lines: KataLine[] = [];
  const errors: KataError[] = [];
  const rows: KataRow[] = [];
  /** Open blocks, innermost last: the depth of each head and its guard. */
  const blocks: { depth: number; guard: Guard }[] = [];
  /** The last block closed at each depth, which an `else:` there turns around. */
  const closed = new Map<number, Guard>();
  let moves = 0;

  text.split('\n').forEach((raw, i) => {
    const line = i + 1;
    const { depth, text: src, comment } = code(raw);
    if (src === '') {
      rows.push({ kind: comment ? 'comment' : 'blank', line, depth });
      return;
    }
    moves++;
    while (blocks.length && depth <= blocks[blocks.length - 1].depth) {
      const b = blocks.pop()!;
      closed.set(b.depth, b.guard);
    }
    const fail = (e: Omit<KataError, 'line'>) => {
      const error = { ...e, line };
      errors.push(error);
      rows.push({ kind: 'error', line, depth, error });
    };
    if (moves > lineCap)
      return fail({ message: `the scroll holds ${lineCap} moves; this is move ${moves}` });
    const outerHere = blocks.map((b) => b.guard);
    if (src === 'else:' || src === 'else') {
      const lock = WORD_TECHNIQUE.else && !knows(WORD_TECHNIQUE.else) ? WORD_TECHNIQUE.else : null;
      if (lock) return fail({ message: '"else" is not learned yet', technique: lock });
      const above = closed.get(depth);
      if (!above) return fail({ message: '"else:" follows an "if" block at the same indent' });
      closed.delete(depth);
      const guard: Guard = { ...above, negate: !above.negate };
      rows.push({ kind: 'block', line, depth, guard, outer: outerHere, otherwise: true });
      blocks.push({ depth, guard });
      return;
    }
    closed.delete(depth);
    const parsed = parseOne(src, knows, names);
    if ('message' in parsed) return fail(parsed);
    const outer = outerHere;
    if (parsed.block) {
      rows.push({ kind: 'block', line, depth, guard: parsed.block, outer });
      blocks.push({ depth, guard: parsed.block });
      return;
    }
    const kataLine: KataLine = { ...parsed.line, line, guards: [...outer, ...parsed.line.guards] };
    lines.push(kataLine);
    rows.push({ kind: 'move', line, depth, parsed: kataLine, outer });
  });

  return { lines, errors, rows, moves };
}

type One =
  | { block: Guard; line?: undefined }
  | { block?: undefined; line: Omit<KataLine, 'line'> }
  | Omit<KataError, 'line'>;

function parseOne(src: string, knows: (t: TechniqueId) => boolean, names: readonly string[]): One {
  const unknown = (word: string, shown = word): Omit<KataError, 'line'> | null => {
    const technique = WORD_TECHNIQUE[word];
    return technique && !knows(technique)
      ? { message: `"${shown}" is not learned yet`, technique }
      : null;
  };

  let rest = src;
  const guards: Guard[] = [];
  const colon = rest.indexOf(':');
  if (colon >= 0) {
    const head = rest.slice(0, colon).trim().split(/\s+/);
    rest = rest.slice(colon + 1).trim();
    const mode = head[0];
    if (mode !== 'if' && mode !== 'when')
      return { message: 'a test starts with "if" or "when" — try "if ready recruit:"' };
    const modeLock = unknown(mode);
    if (modeLock) return modeLock;
    const test = parseTest(head.slice(1), names);
    if ('message' in test) return test;
    const testLock = testWords(test)
      .map((w) => unknown(w, w === 'is' ? 'foe is' : w))
      .find(Boolean);
    if (testLock) return testLock;
    const guard: Guard = { mode, test };
    if (rest === '') {
      if (mode === 'when')
        return {
          message:
            'a block opens with "if"; "when" waits on one line — say the move after the colon',
        };
      return unknown('block', 'a block') ?? { block: guard };
    }
    guards.push(guard);
  }

  const words = rest.split(/\s+/).filter(Boolean);
  let reps = 1;
  const repMatch = words[0]?.match(/^(\d+)x$/);
  if (repMatch) {
    const lock = unknown('repeat', repMatch[0]);
    if (lock) return lock;
    reps = Number(repMatch[1]);
    if (reps < 1 || reps > MAX_REPS) return { message: `repeat between 1x and ${MAX_REPS}x` };
    words.shift();
  }

  let moves: Move[];
  if (words[0] === 'alternate') {
    const lock = unknown('alternate');
    if (lock) return lock;
    words.shift();
    if (words.length < 2)
      return { message: 'alternate takes two moves or more — try "alternate strike kick"' };
    for (const w of words) {
      if (!isMove(w))
        return { message: `"${w}" is not a move — try ${MOVES.slice(0, 4).join(', ')}` };
      if (isPurchase(w)) return { message: 'alternate takes moves of the body, not purchases' };
      const wl = unknown(w);
      if (wl) return wl;
    }
    moves = words.splice(0) as Move[];
  } else {
    const verb = words.shift();
    if (!isMove(verb))
      return { message: `"${verb ?? ''}" is not a move — try strike, breathe or recruit` };
    const lock = unknown(verb);
    if (lock) return lock;
    moves = [verb];
  }

  let max = false;
  if (words[0] === 'max') {
    if (moves.length > 1 || !isPurchase(moves[0]))
      return { message: 'only a purchase takes "max" — try "recruit max"' };
    const lock = unknown('max');
    if (lock) return lock;
    max = true;
    words.shift();
  }
  if (words.length > 0) return { message: `unexpected "${words.join(' ')}" — one move per line` };
  return { line: { guards, reps, moves, max } };
}

function testWords(t: Test): string[] {
  switch (t.kind) {
    case 'ready':
      return ['ready', t.purchase];
    case 'compare':
      return [t.subject];
    case 'foe':
      return [t.state];
    case 'foe-is':
      return ['is'];
  }
}

function parseTest(words: string[], names: readonly string[]): Test | Omit<KataError, 'line'> {
  if (words[0] === 'ready') {
    if (!isPurchase(words[1]) || words.length !== 2)
      return { message: '"ready" takes a purchase — try "ready recruit"' };
    return { kind: 'ready', purchase: words[1] };
  }
  if (words[0] === 'foe') {
    if (words[1] === 'is') {
      const name = words.slice(2).join(' ');
      if (!names.includes(name)) {
        const some = names
          .slice(0, 3)
          .map((n) => `"foe is ${n}"`)
          .join(', ');
        return { message: `no challenger here is called "${name}"${some ? ` — try ${some}` : ''}` };
      }
      return { kind: 'foe-is', name };
    }
    if (!(FOE_STATES as readonly string[]).includes(words[1] ?? '') || words.length !== 2) {
      return {
        message: `"foe ${words.slice(1).join(' ')}" — the student reads foe ${FOE_STATES.join(', ')}`,
      };
    }
    return { kind: 'foe', state: words[1] as FoeState };
  }
  // "ki>=50" reads the same as "ki >= 50".
  const joined = words
    .join(' ')
    .replace(/\s*(>=|<=|>|<)\s*/, ' $1 ')
    .trim()
    .split(/\s+/);
  const [subject, op, num] = joined;
  if (!(SUBJECTS as readonly string[]).includes(subject)) {
    return {
      message: `the student can't read "${words.join(' ')}" — try "ready recruit" or "chi < 20"`,
    };
  }
  if (!(OPS as readonly string[]).includes(op))
    return { message: `"${op ?? ''}" is not a comparison — try "${subject} < 20"` };
  const value = Number(num);
  if (!Number.isFinite(value) || joined.length !== 3)
    return { message: `"${num ?? ''}" is not a number — try "${subject} ${op} 20"` };
  return { kind: 'compare', subject: subject as Subject, op: op as Op, value };
}

/** Whether a comparison holds. */
export function compare(lhs: number, op: Op, rhs: number): boolean {
  switch (op) {
    case '>=':
      return lhs >= rhs;
    case '<=':
      return lhs <= rhs;
    case '>':
      return lhs > rhs;
    case '<':
      return lhs < rhs;
  }
}

// ─── Glosses: each row said in plain words ─────────────────────────────

const MOVE_WORDS: Record<Move, string> = {
  strike: 'strike',
  kick: 'kick low',
  palm: 'strike with the palm',
  sweep: 'sweep every attacker',
  breathe: 'breathe, taking back chi',
  parry: 'raise a parry',
  recruit: 'hire a student',
  promote: 'raise a senpai',
  temper: 'temper the fist',
};
const MAX_WORDS: Partial<Record<Move, string>> = {
  recruit: 'hire every student the purse allows',
  promote: 'raise every senpai the purse allows',
  temper: 'temper the fist as far as the purse allows',
};
const TIMES = [
  '',
  'once',
  'twice',
  'three times',
  'four times',
  'five times',
  'six times',
  'seven times',
  'eight times',
  'nine times',
];
const OP_WORDS: Record<Op, string> = {
  '<': 'below',
  '>': 'above',
  '<=': 'at most',
  '>=': 'at least',
};
const READY_WORDS: Record<Purchase, string> = {
  recruit: 'a student can be hired',
  promote: 'a senpai can be raised',
  temper: 'the fist can be tempered',
};
const FOE_WORDS: Record<FoeState, string> = {
  winds: 'the foe is winding up',
  open: 'the foe is open',
  high: 'the foe guards high',
  low: 'the foe guards low',
};

const NOT_READY: Record<Purchase, string> = {
  recruit: 'no student can be hired yet',
  promote: 'no senpai can be raised yet',
  temper: 'the fist cannot be tempered yet',
};
const NOT_FOE: Record<FoeState, string> = {
  winds: 'the foe is not winding up',
  open: 'the foe is not open',
  high: 'the foe does not guard high',
  low: 'the foe does not guard low',
};
const NOT_OP: Record<Op, Op> = { '<': '>=', '>': '<=', '<=': '>', '>=': '<' };

/** A guard's test in plain words, turned around when the guard is an `else:`. */
export function guardWords(g: Guard, displayName: (name: string) => string = (n) => n): string {
  if (!g.negate) return testWordsPlain(g.test, displayName);
  const t = g.test;
  switch (t.kind) {
    case 'ready':
      return NOT_READY[t.purchase];
    case 'compare':
      return testWordsPlain({ ...t, op: NOT_OP[t.op] }, displayName);
    case 'foe':
      return NOT_FOE[t.state];
    case 'foe-is':
      return `the foe is not ${displayName(t.name)}`;
  }
}

/** A test in plain words. */
export function testWordsPlain(t: Test, displayName: (name: string) => string = (n) => n): string {
  switch (t.kind) {
    case 'ready':
      return READY_WORDS[t.purchase];
    case 'compare':
      return t.subject === 'foes'
        ? `${OP_WORDS[t.op]} ${t.value} attackers stand`
        : `${t.subject} is ${OP_WORDS[t.op]} ${t.value}`;
    case 'foe':
      return FOE_WORDS[t.state];
    case 'foe-is':
      return `the foe is ${displayName(t.name)}`;
  }
}

function actionWords(l: Pick<KataLine, 'moves' | 'reps' | 'max'>): string {
  const what =
    l.moves.length > 1
      ? `${l.moves.slice(0, -1).join(', ')} and ${l.moves[l.moves.length - 1]} in turn, one each time`
      : l.max
        ? (MAX_WORDS[l.moves[0]] ?? MOVE_WORDS[l.moves[0]])
        : MOVE_WORDS[l.moves[0]];
  return l.reps > 1 ? `${what}, ${TIMES[l.reps]} without a pause` : what;
}

/**
 * A row of the scroll in plain words.
 *
 * @param row - the row, from {@link parseKata}
 * @param now - an optional live reading for a test, shown after it ("now 32")
 * @param displayName - a challenger's display name from its `foe is` name
 * @returns the gloss, or '' for blank rows; errors are said by their own message
 */
export function glossRow(
  row: KataRow,
  now?: (t: Test) => string | null,
  displayName?: (name: string) => string,
): string {
  const test = (g: Guard) => {
    const live = now?.(g.test);
    return `${guardWords(g, displayName)}${live ? ` (now ${live})` : ''}`;
  };
  // The indent already says which block a row is in, and the block's own row says its test.
  switch (row.kind) {
    case 'blank':
    case 'comment':
      return '';
    case 'error':
      return row.error.message;
    case 'block':
      return `${row.otherwise ? 'Otherwise' : 'The lines indented below'} run only while ${test(row.guard)}.`;
    case 'move': {
      const own = row.parsed.guards.slice(row.outer.length);
      const act = actionWords(row.parsed);
      if (own.length === 0) return `${act[0].toUpperCase()}${act.slice(1)}.`;
      const g = own[0];
      return g.mode === 'if'
        ? `If ${test(g)}: ${act}. Otherwise pass over this line.`
        : `Wait until ${test(g)}, then ${act}.`;
    }
  }
}
