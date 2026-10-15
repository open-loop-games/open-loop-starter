import {
  Decimal,
  addResource,
  computed,
  createAutomationTiers,
  createSequencer,
  persistent,
  shallowRef,
  tunable,
  type AutomationTiers,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type RegisterTick,
  type Sequencer,
  type ShallowRef,
  type StartResult,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  CHALLENGERS,
  EXECUTOR_TIERS,
  FIRST_SCROLL,
  FLOWING_FORM_KI,
  META,
  RACK_SLOTS,
  scrollLines,
  type ScripterAutomationTier,
} from '../data';
import { DojoKey } from './dojo';
import { GateKey } from './gate';
import {
  BLOWS,
  compare,
  isPurchase,
  parseKata,
  type KataError,
  type KataLine,
  type Move,
  type ParseResult,
  type Test,
} from './kata-lang';
import { LineageKey } from './lineage';
import { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';

/**
 * The scroll and the student who performs it.
 *
 * The inked lines sit in a list-mode sequencer. A line's tests are its `canStart`: a
 * failing `if` is `'never'` (pass over it, no beat spent), a failing `when` is `'notNow'`
 * (hold, and the beats pass). The student moves on a beat clock this module owns, and each
 * beat runs in one order: the line in hand performs its move, the move resolves (a bout
 * beat at the gate, a training strike, a purchase), and only then does the sequencer
 * advance. So the next line's tests read the bout after the challenger's own beat, and a
 * held line resumes on the beat after its moment comes.
 */

/** A list item: the line, and how far into its repetitions and rotation the student is. */
export interface KataItem {
  line: KataLine;
  /** Repetitions done of this pass through the line. */
  rep: number;
  /** Performances of the line ever: `alternate` takes moves[turn % length]. */
  turn: number;
}

/** What a scroll row did on the last beat, for the editor's gutter. */
export type RowMark = 'run' | 'wait' | 'skip' | 'fumble';

/** Per row: performances, passes and waits since the scroll was inked. */
export interface RowTally {
  done: number;
  passed: number;
  waited: number;
}

export interface RackSlot {
  name: string;
  text: string;
}

export interface KataApi {
  /** The sensei's draft, as typed. */
  draft: Persistent<string>;
  /** The text the student performs. */
  inked: Persistent<string>;
  rack: Persistent<RackSlot[]>;
  sequencer: Sequencer<KataItem>;
  tiers: AutomationTiers;
  tier: ComputedRef<ScripterAutomationTier>;
  beatSeconds: ComputedRef<number>;
  lineCap: ComputedRef<number>;
  /** The inked row the student performs or waits at, else null. */
  activeLine: ComputedRef<number | null>;
  holding: ComputedRef<boolean>;
  /** Share of the beat elapsed, for the editor's beat bar. */
  beatProgress: ShallowRef<number>;
  marks: ShallowRef<Record<number, RowMark>>;
  tallies: ShallowRef<Record<number, RowTally>>;
  /** Parse with what the dojo knows now. */
  parse(text: string): ParseResult;
  /** Ink a scroll: rows that parse are performed, rows with errors are passed over. */
  ink(text: string): KataError[];
  /** What a test reads now, for the editor's live gloss. */
  reading(test: Test): string | null;
  saveToRack(slot: number, name: string): void;
  inkFromRack(slot: number): KataError[];
  /** After a graduation: a student who cannot read the inked scroll falls back to the first one. */
  revalidate(): void;
}

export const KataKey: InjectionKey<KataApi> = Symbol('scripter/kata') as InjectionKey<KataApi>;

const kataApi = createModuleApi(KataKey);

/** The scroll: the draft, the inked kata and its executor. Read it after the engine starts. */
export const getKata = kataApi.get;

/** Beats one engine tick may run, so a long offline stride cannot stall the frame. */
const MAX_BEATS_PER_TICK = 4000;

export function createKataModule(): EngineModule {
  return {
    id: 'scripter/kata',
    dependencies: ['scripter/tuning', 'scripter/lineage', 'scripter/dojo', 'scripter/gate'],
    install(ctx) {
      const tuning = ctx.inject(ScripterTuningRegistryKey);
      const lineage = ctx.inject(LineageKey);
      const dojo = ctx.inject(DojoKey);
      const gate = ctx.inject(GateKey);

      const draft = persistent<string>(FIRST_SCROLL, { id: 'draft' });
      const inked = persistent<string>('', { id: 'inked' });
      const rack = persistent<RackSlot[]>(
        Array.from({ length: RACK_SLOTS }, (_, i) => ({ name: `Scroll ${i + 1}`, text: '' })),
        { id: 'rack' },
      );

      const tiers = createAutomationTiers({
        id: 'executor-tiers',
        tiers: [
          { id: 'novice', displayName: EXECUTOR_TIERS[0].displayName, order: 0 },
          {
            id: 'steady-breath',
            displayName: EXECUTOR_TIERS[1].displayName,
            order: 1,
            unlockWhen: () => lineage.beats.value >= ANCHORS.steadyBreathBeats,
          },
          {
            id: 'flowing-form',
            displayName: EXECUTOR_TIERS[2].displayName,
            order: 2,
            unlockWhen: { kind: 'cumulative-gte', resource: 'ki', value: FLOWING_FORM_KI },
          },
          {
            id: 'empty-mind',
            displayName: EXECUTOR_TIERS[3].displayName,
            order: 3,
            unlockWhen: () => lineage.graduations.value >= 1,
          },
          {
            id: 'no-mind',
            displayName: EXECUTOR_TIERS[4].displayName,
            order: 4,
            unlockWhen: () => lineage.graduations.value >= 3,
          },
        ],
      });
      tiers.on('unlocked', (id) =>
        lineage.say(
          'rite',
          `The student reaches ${EXECUTOR_TIERS.find((t) => t.id === id)!.displayName}.`,
        ),
      );
      const beat0 = tunable(
        tuning,
        'executor/beatSeconds0' satisfies ScripterTunableKey,
        () => ANCHORS.beatSeconds0,
      );
      const shrink = tunable(
        tuning,
        'executor/beatShrink' satisfies ScripterTunableKey,
        () => ANCHORS.beatShrinkPerTier,
      );
      const beatSeconds = computed(
        () => Number(beat0.value) * Math.pow(Number(shrink.value), tiers.currentTierOrder.value),
      );
      const lineCap = computed(
        () =>
          scrollLines(tiers.currentTierOrder.value) +
          META['old-masters-ink'].effect * lineage.level('old-masters-ink'),
      );
      const names = computed(() =>
        CHALLENGERS.filter((c) => lineage.arrived.value.includes(c.id)).map((c) => c.name),
      );

      // ─── Tests ───
      const subject = (s: Extract<Test, { kind: 'compare' }>['subject']): number => {
        switch (s) {
          case 'ki':
            return Decimal.fromValue(dojo.ki.value).toNumber();
          case 'students':
            return dojo.studentCount.value;
          case 'senpai':
            return Decimal.fromValue(dojo.senpai.count.value).toNumber();
          case 'chi':
            return gate.chi();
          case 'foes':
            return gate.foes();
        }
      };
      // TODO(expansion): `ki`/`students` tests could compile to resource-gte/count-gte Gates, but
      // affordability and bout state have no Gate kind, so one evaluator reads every test.
      function holds(t: Test): boolean {
        switch (t.kind) {
          case 'ready':
            return dojo.ready(t.purchase);
          case 'compare':
            return compare(subject(t.subject), t.op, t.value);
          case 'foe':
            return gate.shows(t.state);
          case 'foe-is':
            return gate.name() === t.name;
        }
      }

      // ─── The executor ───
      /**
       * The sequencer's tick hooks (its hold retry and advance-cap reset) run in the settle
       * step of each beat, after the move has resolved.
       */
      const settle = new Set<(dt: number) => void>();
      const registerSettle: RegisterTick = (cb) => {
        settle.add(cb);
        return () => settle.delete(cb);
      };
      const sequencer = createSequencer<KataItem>({
        id: 'scroll',
        mode: 'list',
        registerTick: registerSettle,
        canStart: (item): StartResult => {
          for (const g of item.metadata.line.guards) {
            if (holds(g.test) === !!g.negate) return g.mode === 'when' ? 'notNow' : 'never';
          }
          return 'now';
        },
      });

      const marks = shallowRef<Record<number, RowMark>>({});
      const tallies = shallowRef<Record<number, RowTally>>({});
      let beatMarks: Record<number, RowMark> = {};
      const tally = (line: number, k: keyof RowTally) => {
        const cur = tallies.value[line] ?? { done: 0, passed: 0, waited: 0 };
        tallies.value = { ...tallies.value, [line]: { ...cur, [k]: cur[k] + 1 } };
      };
      sequencer.on('skipped', (item) => {
        beatMarks[item.metadata.line.line] = 'skip';
        tally(item.metadata.line.line, 'passed');
      });

      const heldLine = () => sequencer.items.value[sequencer.cursor]?.metadata.line.line ?? null;

      function perform(move: Move | null, max: boolean, flurry: boolean, line: number | null) {
        if (move && isPurchase(move)) {
          const bought = dojo.buy(move, max);
          if (Decimal.gt(bought, 0))
            lineage.say('buy', `${move} ×${Decimal.floor(bought).toString()}`);
          else {
            lineage.fumbles.value++;
            if (line !== null) beatMarks[line] = 'fumble';
            lineage.say('fumble', `${move} — fumbled, the purse is short`);
          }
          gate.resolve(null, false);
          return;
        }
        if (gate.inBout.value) {
          const notes = gate.resolve(move, flurry);
          if (notes.includes('fumbled') && line !== null) {
            lineage.fumbles.value++;
            beatMarks[line] = 'fumble';
          }
          if (move && BLOWS.includes(move)) lineage.strikes.value++;
          return;
        }
        if (move && BLOWS.includes(move)) {
          addResource(dojo.ki, dojo.strikeValue.value);
          lineage.strikes.value++;
        }
      }

      function beat() {
        lineage.beats.value++;
        beatMarks = {};
        const items = sequencer.items.value;
        if (
          !sequencer.currentItem &&
          !sequencer.holding &&
          items.length &&
          sequencer.cursor >= items.length
        ) {
          sequencer.resetCursor();
        }
        const cur = sequencer.currentItem;
        let done = false;
        if (cur && gate.canAct()) {
          const m = cur.metadata;
          const move = m.line.moves[m.turn % m.line.moves.length];
          const rep = m.rep + 1;
          done = rep >= m.line.reps;
          sequencer.updateCurrentItem((x) => ({ ...x, rep: done ? 0 : rep, turn: x.turn + 1 }));
          beatMarks[m.line.line] = 'run';
          tally(m.line.line, 'done');
          perform(move, m.line.max, m.rep > 0, m.line.line);
        } else {
          if (sequencer.holding) {
            const line = heldLine();
            if (line !== null) {
              beatMarks[line] = 'wait';
              tally(line, 'waited');
            }
          }
          perform(null, false, false, null);
        }
        if (done) sequencer.complete();
        for (const cb of [...settle]) cb(beatSeconds.value);
        // Off the end of the scroll: back to the top, its tests read after this beat resolved.
        if (
          !sequencer.currentItem &&
          !sequencer.holding &&
          items.length &&
          sequencer.cursor >= items.length
        ) {
          sequencer.resetCursor();
        }
        marks.value = beatMarks;
      }

      let carry = 0;
      const beatProgress = shallowRef(0);
      ctx.onTick((dt) => {
        carry += dt;
        let n = 0;
        while (carry >= beatSeconds.value && n++ < MAX_BEATS_PER_TICK) {
          carry -= beatSeconds.value;
          beat();
        }
        if (n > MAX_BEATS_PER_TICK) carry = 0;
        beatProgress.value = carry / beatSeconds.value;
      });

      // ─── Inking ───
      const parse = (text: string) => parseKata(text, dojo.knows, names.value, lineCap.value);
      function load(text: string, lines: KataLine[]) {
        sequencer.clear();
        for (const line of lines)
          sequencer.enqueue({ id: `line-${line.line}`, metadata: { line, rep: 0, turn: 0 } });
        sequencer.resetCursor();
        inked.value = text;
        tallies.value = {};
        marks.value = {};
      }
      function ink(text: string): KataError[] {
        draft.value = text;
        const parsed = parse(text);
        load(text, parsed.lines);
        lineage.say(
          'ink',
          `A new scroll is inked: ${parsed.lines.length} moves${parsed.errors.length ? `, ${parsed.errors.length} passed over` : ''}.`,
        );
        return parsed.errors;
      }
      function revalidate() {
        const parsed = parse(inked.value);
        if (inked.value && !parsed.errors.length) return;
        load(FIRST_SCROLL, parse(FIRST_SCROLL).lines);
        if (inked.value !== FIRST_SCROLL)
          lineage.say(
            'fumble',
            'The new student cannot read the old scroll, and falls back to the first one.',
          );
      }

      const reading = (t: Test): string | null => {
        switch (t.kind) {
          case 'ready':
            return dojo.ready(t.purchase) ? 'yes' : 'not yet';
          case 'compare':
            return String(Math.floor(subject(t.subject)));
          case 'foe':
            return gate.inBout.value ? (gate.shows(t.state) ? 'yes' : 'no') : 'no bout';
          case 'foe-is':
            return gate.name() ?? 'no bout';
        }
      };

      // A fresh dojo starts with the first scroll inked; a save's load replaces it.
      load(FIRST_SCROLL, parse(FIRST_SCROLL).lines);

      kataApi.publish(ctx, {
        draft,
        inked,
        rack,
        sequencer,
        tiers,
        tier: computed(() => tiers.currentTierId.value as ScripterAutomationTier),
        beatSeconds,
        lineCap,
        activeLine: computed(
          () =>
            sequencer.currentItem?.metadata.line.line ?? (sequencer.holding ? heldLine() : null),
        ),
        holding: computed(() => sequencer.holding),
        beatProgress,
        marks,
        tallies,
        parse,
        ink,
        reading,
        saveToRack(slot, name) {
          rack.value = rack.value.map((s, i) =>
            i === slot ? { name: name.trim() || s.name, text: draft.value } : s,
          );
        },
        inkFromRack(slot) {
          const text = rack.value[slot]?.text ?? '';
          return text ? ink(text) : [];
        },
        revalidate,
      });
    },
  };
}
