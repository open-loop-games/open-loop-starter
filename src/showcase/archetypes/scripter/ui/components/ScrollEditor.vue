<!--
  ScrollEditor — the scroll, written and performed in one view. Each row of the draft is
  its own input over a coloured copy of the text, with a gloss or an error under it, so a
  reader always sees what the student will make of the line. While the draft is the inked
  scroll, the gutter shows what each row did on the last beat (▶ performed, … waiting,
  ↷ passed over, ✕ fumbled), the gloss carries live readings, and the row the student is
  on fills with the beat. Unlearned words are dotted and name the technique that teaches
  them. Chips insert at the caret: a test at the caret, a move on a new row.

  Keys: Enter splits a row (indenting under a block head), Backspace at the start joins,
  ↑/↓ move between rows, Tab/Shift+Tab indent and outdent, Escape leaves the editor so Tab
  moves focus again, Ctrl+Enter inks.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Button from '@/ui/components/Button.vue';
import {
  CHALLENGERS,
  TECHNIQUES,
  WORD_TECHNIQUE,
  techniqueCost,
  type TechniqueId,
} from '../../data';
import {
  MOVES,
  getDojo,
  getKata,
  getLineage,
  glossRow,
  type KataRow,
  type RowMark,
} from '../../modules';
import { fmt } from '../format';

const emit = defineEmits<{ technique: [id: TechniqueId] }>();

const kata = getKata();
const dojo = getDojo();
const lineage = getLineage();

const rows = ref<string[]>(kata.draft.value.split('\n'));
watch(
  () => kata.draft.value,
  (text) => {
    if (text !== rows.value.join('\n')) rows.value = text.split('\n');
  },
);
const text = computed(() => rows.value.join('\n'));
const dirty = computed(() => text.value !== kata.inked.value);
const parsed = computed(() => kata.parse(text.value));
const info = computed(() => {
  const byLine = new Map<number, KataRow>();
  for (const r of parsed.value.rows) byLine.set(r.line, r);
  return byLine;
});

function commit() {
  kata.draft.value = text.value;
}
function ink() {
  kata.ink(text.value);
}
function revert() {
  rows.value = kata.inked.value.split('\n');
  commit();
}

// ─── Colouring ───
const CONTROL = new Set(['if', 'when', 'else']);
const TESTS = new Set([
  'ready',
  'ki',
  'students',
  'senpai',
  'chi',
  'foes',
  'foe',
  'winds',
  'open',
  'high',
  'low',
  'is',
]);
const MODIFIERS = new Set(['alternate', 'max']);
const NAMES = new Set(CHALLENGERS.map((c) => c.name));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function paint(raw: string): string {
  const hash = raw.indexOf('#');
  const code = hash >= 0 ? raw.slice(0, hash) : raw;
  const comment = hash >= 0 ? raw.slice(hash) : '';
  const words = code.split(/(\s+|:|<=|>=|<|>)/).map((w) => {
    const lw = w.toLowerCase();
    if (w === '' || /^\s+$/.test(w) || w === ':') return esc(w);
    const technique = WORD_TECHNIQUE[lw];
    if (technique && !dojo.knows(technique)) return `<span class="t-locked">${esc(w)}</span>`;
    if (/^\d+x$/.test(lw))
      return dojo.knows('repetition')
        ? `<span class="t-num">${esc(w)}</span>`
        : `<span class="t-locked">${esc(w)}</span>`;
    if (CONTROL.has(lw)) return `<span class="t-ctl">${esc(w)}</span>`;
    if ((MOVES as readonly string[]).includes(lw)) return `<span class="t-move">${esc(w)}</span>`;
    if (MODIFIERS.has(lw)) return `<span class="t-mod">${esc(w)}</span>`;
    if (TESTS.has(lw) || /^(<=|>=|<|>)$/.test(w)) return `<span class="t-test">${esc(w)}</span>`;
    if (/^\d+(\.\d+)?$/.test(w)) return `<span class="t-num">${esc(w)}</span>`;
    if (NAMES.has(lw)) return `<span class="t-name">${esc(w)}</span>`;
    return `<span class="t-bad">${esc(w)}</span>`;
  });
  return words.join('') + (comment ? `<span class="t-com">${esc(comment)}</span>` : '');
}

// ─── Under each row ───
/** A challenger as a gloss names them: the display name up to its epithet. */
const displayName = (name: string) =>
  (CHALLENGERS.find((c) => c.name === name)?.displayName ?? name).split(',')[0];
const techniqueName = (id: TechniqueId) => TECHNIQUES.find((t) => t.id === id)!.displayName;

interface Under {
  kind: 'gloss' | 'error' | 'locked' | 'none';
  text: string;
  technique?: TechniqueId;
}
function under(line: number): Under {
  const r = info.value.get(line);
  if (!r || r.kind === 'blank' || r.kind === 'comment') return { kind: 'none', text: '' };
  if (r.kind === 'error') {
    const t = r.error.technique;
    if (t && !dojo.techniques.getPurchasable(t)!.visible.value) {
      return {
        kind: 'error',
        text: `${r.error.message}, and no challenger has brought it to this dojo. The student will pass over this line.`,
      };
    }
    return t
      ? { kind: 'locked', text: r.error.message, technique: t }
      : { kind: 'error', text: `${r.error.message}. The student will pass over this line.` };
  }
  const live = !dirty.value;
  return { kind: 'gloss', text: glossRow(r, live ? kata.reading : undefined, displayName) };
}
function tally(line: number): string {
  if (dirty.value) return '';
  const t = kata.tallies.value[line];
  if (!t) return '';
  return `done ${t.done}, passed over ${t.passed}${t.waited ? `, waited ${t.waited}` : ''}`;
}

const MARK: Record<RowMark, string> = { run: '▶', wait: '…', skip: '↷', fumble: '✕' };
const MARK_LABEL: Record<RowMark, string> = {
  run: 'performed',
  wait: 'waiting',
  skip: 'passed over',
  fumble: 'fumbled',
};
const mark = (line: number): RowMark | null =>
  dirty.value ? null : (kata.marks.value[line] ?? null);
const active = (line: number) => !dirty.value && kata.activeLine.value === line;

// ─── Editing ───
const inputs = ref<HTMLInputElement[]>([]);
let focused = 0;
async function focusAt(row: number, col: number) {
  await nextTick();
  const el = inputs.value[row];
  if (!el) return;
  el.focus();
  const c = Math.min(col, el.value.length);
  el.setSelectionRange(c, c);
}
function depthOf(s: string) {
  return s.length - s.trimStart().length;
}

function onInput(i: number, e: Event) {
  rows.value[i] = (e.target as HTMLInputElement).value;
  commit();
}
function onKey(i: number, e: KeyboardEvent) {
  const el = e.target as HTMLInputElement;
  const pos = el.selectionStart ?? 0;
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    ink();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const row = rows.value[i];
    const head = row.slice(0, pos);
    const depth = depthOf(row) + (head.trim().endsWith(':') ? 2 : 0);
    const tail = ' '.repeat(depth) + row.slice(pos).trimStart();
    rows.value.splice(i, 1, head, tail);
    commit();
    void focusAt(i + 1, depth);
  } else if (e.key === 'Backspace' && pos === 0 && el.selectionEnd === 0 && i > 0) {
    e.preventDefault();
    const prev = rows.value[i - 1];
    rows.value.splice(i - 1, 2, prev + rows.value[i].trimStart());
    commit();
    void focusAt(i - 1, prev.length);
  } else if (e.key === 'ArrowUp' && i > 0) {
    e.preventDefault();
    void focusAt(i - 1, pos);
  } else if (e.key === 'ArrowDown' && i < rows.value.length - 1) {
    e.preventDefault();
    void focusAt(i + 1, pos);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const row = rows.value[i];
    if (e.shiftKey) {
      const cut = Math.min(2, depthOf(row));
      rows.value[i] = row.slice(cut);
      void focusAt(i, Math.max(0, pos - cut));
    } else {
      rows.value[i] = `  ${row}`;
      void focusAt(i, pos + 2);
    }
    commit();
  } else if (e.key === 'Escape') {
    el.blur();
  }
}
function onPaste(i: number, e: ClipboardEvent) {
  const pasted = e.clipboardData?.getData('text') ?? '';
  if (!pasted.includes('\n')) return;
  e.preventDefault();
  const el = e.target as HTMLInputElement;
  const row = rows.value[i];
  const parts = (
    row.slice(0, el.selectionStart ?? 0) +
    pasted +
    row.slice(el.selectionEnd ?? 0)
  ).split(/\r?\n/);
  rows.value.splice(i, 1, ...parts);
  commit();
  void focusAt(i + parts.length - 1, parts[parts.length - 1].length);
}

// ─── Chips ───
interface Chip {
  text: string;
  insert: string;
  technique: TechniqueId | null;
}
const CHIPS: Chip[] = [
  { text: 'strike', insert: 'strike', technique: null },
  { text: 'breathe', insert: 'breathe', technique: null },
  { text: 'recruit', insert: 'recruit', technique: null },
  { text: 'if ready recruit:', insert: 'if ready recruit: ', technique: 'reading' },
  { text: 'if ki >= 100:', insert: 'if ki >= 100: ', technique: 'reading' },
  { text: 'temper', insert: 'temper', technique: 'iron-body' },
  { text: 'if ready temper:', insert: 'if ready temper: ', technique: 'iron-body' },
  { text: '3x', insert: '3x ', technique: 'repetition' },
  { text: 'if chi < 15:', insert: 'if chi < 15: ', technique: 'breath-reading' },
  { text: 'parry', insert: 'parry', technique: 'turning-hand' },
  { text: 'if foe winds:', insert: 'if foe winds: ', technique: 'turning-hand' },
  { text: 'when foe open:', insert: 'when foe open: ', technique: 'patience' },
  { text: 'kick', insert: 'kick', technique: 'high-and-low' },
  { text: 'if foe high:', insert: 'if foe high: ', technique: 'high-and-low' },
  { text: 'palm', insert: 'palm', technique: 'mirror' },
  { text: 'alternate strike kick palm', insert: 'alternate strike kick palm', technique: 'mirror' },
  { text: 'sweep', insert: 'sweep', technique: 'many-hands' },
  { text: 'if foes > 1:', insert: 'if foes > 1: ', technique: 'many-hands' },
  { text: 'if foe is …:', insert: 'if foe is ', technique: 'names' },
  { text: 'else:', insert: 'else:', technique: 'names' },
  { text: 'promote', insert: 'promote', technique: 'lineage' },
  { text: 'if ready promote:', insert: 'if ready promote: ', technique: 'lineage' },
  { text: 'max', insert: ' max', technique: 'thousand-hands' },
];
interface ShownChip extends Chip {
  state: 'known' | 'locked';
  price: string;
}
const chips = computed(() =>
  CHIPS.flatMap((c): ShownChip[] => {
    if (!c.technique || dojo.knows(c.technique)) return [{ ...c, state: 'known', price: '' }];
    if (!dojo.techniques.getPurchasable(c.technique)!.visible.value) return [];
    return [{ ...c, state: 'locked', price: fmt(techniqueCost(c.technique)) }];
  }),
);
function insert(c: Chip) {
  if (c.technique && !dojo.knows(c.technique)) {
    emit('technique', c.technique);
    return;
  }
  const i = Math.min(focused, rows.value.length - 1);
  const el = inputs.value[i];
  const row = rows.value[i];
  const a = el?.selectionStart ?? row.length;
  const b = el?.selectionEnd ?? a;
  const test = c.insert.endsWith(': ') || c.insert === 'else:';
  const appendRow =
    !test &&
    c.insert !== ' max' &&
    c.insert !== '3x ' &&
    row.trim() !== '' &&
    a === row.length &&
    !row.trim().endsWith(':');
  if (appendRow) {
    const depth = depthOf(row);
    rows.value.splice(i + 1, 0, ' '.repeat(depth) + c.insert);
    commit();
    void focusAt(i + 1, depth + c.insert.length);
    return;
  }
  rows.value[i] = row.slice(0, a) + c.insert + row.slice(b);
  commit();
  void focusAt(i, a + c.insert.length);
}

const status = computed(() => {
  if (dirty.value) return 'the student performs the old scroll until you ink this one';
  if (kata.holding.value) return 'the student waits for the moment';
  return kata.activeLine.value
    ? `performing line ${kata.activeLine.value}`
    : 'the student finds nothing to do';
});
</script>

<template>
  <section class="if-panel scroll-editor" aria-label="The scroll">
    <h2 class="if-title">
      The scroll
      <small class="status" :class="{ dirty, waiting: !dirty && kata.holding.value }">{{
        status
      }}</small>
    </h2>
    <div class="desk">
      <div class="paper">
        <ol class="rows">
          <li
            v-for="(row, i) in rows"
            :key="i"
            class="row"
            :class="{
              active: active(i + 1) && !kata.holding.value,
              waiting: active(i + 1) && kata.holding.value,
            }"
          >
            <span class="gutter num" :title="mark(i + 1) ? MARK_LABEL[mark(i + 1)!] : undefined">
              <span
                v-if="mark(i + 1)"
                :key="lineage.beats.value"
                class="mark"
                :class="mark(i + 1)!"
                >{{ MARK[mark(i + 1)!] }}</span
              >
              {{ i + 1 }}
            </span>
            <div class="line">
              <!-- paint() escapes the row before it colours it. -->
              <pre aria-hidden="true" v-html="paint(row) || ' '" />
              <input
                :ref="(el) => (inputs[i] = el as HTMLInputElement)"
                :value="row"
                spellcheck="false"
                autocomplete="off"
                :aria-label="`line ${i + 1}`"
                :aria-describedby="`scroll-under-${i}`"
                @input="onInput(i, $event)"
                @keydown="onKey(i, $event)"
                @paste="onPaste(i, $event)"
                @focus="focused = i"
              />
              <span
                v-if="active(i + 1) && !kata.holding.value"
                class="beatbar"
                :style="{ transform: `scaleX(${kata.beatProgress.value})` }"
              />
            </div>
            <p :id="`scroll-under-${i}`" class="under" :class="under(i + 1).kind">
              <template v-if="under(i + 1).kind === 'locked'">
                {{ under(i + 1).text }} — learn
                <Button class="technique" @click="emit('technique', under(i + 1).technique!)">
                  {{ techniqueName(under(i + 1).technique!) }}
                </Button>
                first ({{ fmt(techniqueCost(under(i + 1).technique!)) }} Ki).
              </template>
              <template v-else>{{ under(i + 1).text }}</template>
              <span v-if="tally(i + 1)" class="tally num"> · {{ tally(i + 1) }}</span>
            </p>
          </li>
        </ol>
      </div>
      <div class="seal-col">
        <Button class="seal" :disabled="!dirty" title="Ink the scroll (Ctrl+Enter)" @click="ink">
          <b aria-hidden="true">印</b>INK
        </Button>
        <Button v-if="dirty" class="if-act quiet" @click="revert">Revert</Button>
      </div>
    </div>
    <div class="foot">
      <span class="meter num" :class="{ over: parsed.moves > kata.lineCap.value }">
        {{ parsed.moves }} / {{ kata.lineCap.value }} moves
      </span>
      <span class="keys">Enter splits · Tab indents · Ctrl+Enter inks</span>
    </div>
    <div class="chips" role="group" aria-label="Words the student reads">
      <span class="label">The student reads</span>
      <Button
        v-for="c in chips"
        :key="c.text"
        class="chip"
        :class="c.state"
        :title="c.state === 'locked' ? `not learned yet: ${c.price} Ki` : 'insert at the caret'"
        @mousedown.prevent
        @click="insert(c)"
      >
        {{ c.text }}<span v-if="c.state === 'locked'" class="price num">· {{ c.price }}</span>
      </Button>
    </div>
  </section>
</template>

<style scoped>
.status {
  color: var(--if-indigo);
}
.status.dirty {
  color: var(--if-amber);
}
.status.waiting {
  color: var(--if-amber);
}
.desk {
  display: grid;
  grid-template-columns: 1fr 76px;
  gap: 14px;
  align-items: start;
}
.paper {
  background: var(--if-washi);
  color: var(--if-sumi);
  border-top: 6px solid var(--if-rod);
  border-bottom: 6px solid var(--if-rod);
  padding: 10px 0;
  min-height: 160px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: grid;
  grid-template-columns: 52px 1fr;
}
.gutter {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-right: 8px;
  font-size: 12px;
  color: var(--if-sumi-wash);
}
.mark {
  width: 14px;
  text-align: center;
  font-size: 13px;
}
.mark.run {
  color: var(--if-vermilion);
}
.mark.wait {
  color: var(--if-amber);
}
.mark.skip {
  color: var(--if-sumi-wash);
  animation: fade 900ms forwards;
}
.mark.fumble {
  color: var(--if-vermilion);
}
@keyframes fade {
  to {
    opacity: 0;
  }
}
.line {
  position: relative;
  height: 28px;
}
.row.active .line {
  background: var(--if-washi-shade);
}
.row.waiting .line {
  background: var(--if-washi-wait);
}
.line pre,
.line input {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0 10px;
  font: 16px/28px var(--if-face);
  white-space: pre;
  border: 0;
}
.line pre {
  pointer-events: none;
  overflow: hidden;
}
.line input {
  width: 100%;
  background: transparent;
  color: transparent;
  caret-color: var(--if-sumi);
  outline: none;
}
.line input:focus {
  box-shadow: inset 3px 0 0 var(--if-indigo-deep);
}
.beatbar {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 3px;
  height: 2px;
  background: var(--if-sumi);
  transform-origin: left;
}
.under {
  grid-column: 2;
  margin: 0;
  padding: 0 10px 5px;
  font-size: 13px;
  line-height: 1.35;
}
.under.none {
  padding: 0;
}
.under.gloss {
  color: var(--if-sumi-wash);
}
.under.error,
.under.locked {
  color: var(--if-vermilion);
}
.technique {
  font: inherit;
  color: var(--if-indigo-deep);
  background: none;
  border: 0;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}
.tally {
  color: var(--if-sumi-blue);
  font-size: 12px;
}
.seal-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}
.seal {
  width: 72px;
  height: 72px;
  border: 2px solid var(--if-vermilion);
  color: var(--if-vermilion);
  background: transparent;
  transform: rotate(-4deg);
  display: grid;
  place-items: center;
  font: 13px var(--if-face);
  letter-spacing: 0.2em;
  cursor: pointer;
}
.seal b {
  display: block;
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
  letter-spacing: 0;
}
.seal:not([disabled]):hover {
  background: var(--if-vermilion-soft);
}
.seal[disabled] {
  opacity: 0.35;
  cursor: default;
}
.foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--if-tatami);
}
.meter.over {
  color: var(--if-vermilion);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}
.chips .label {
  color: var(--if-tatami);
  margin-right: 4px;
}
.chip {
  font: inherit;
  color: var(--if-moonlight);
  background: var(--if-lacquer);
  border: 1px solid var(--if-lacquer-edge);
  padding: 2px 8px;
  cursor: pointer;
}
.chip:hover {
  border-color: var(--if-lamplight);
}
.chip.locked {
  color: var(--if-tatami-dim);
  border-style: dashed;
}
.chip .price {
  font-size: 11px;
  margin-left: 5px;
}
:deep(.t-ctl) {
  color: var(--if-indigo-deep);
  font-weight: 600;
}
:deep(.t-move) {
  color: var(--if-sumi);
  font-weight: 600;
}
:deep(.t-test),
:deep(.t-name) {
  color: var(--if-sumi-blue);
}
:deep(.t-num) {
  color: var(--if-sumi-red);
  font-family: var(--if-numerals);
}
:deep(.t-mod) {
  color: var(--if-sumi-red);
}
:deep(.t-com) {
  color: var(--if-sumi-wash);
  font-style: italic;
}
:deep(.t-locked) {
  color: var(--if-sumi-faded);
  text-decoration: underline dotted var(--if-sumi-faded);
  text-underline-offset: 4px;
}
:deep(.t-bad) {
  color: var(--if-vermilion);
  text-decoration: underline wavy var(--if-vermilion);
  text-underline-offset: 4px;
}
</style>
