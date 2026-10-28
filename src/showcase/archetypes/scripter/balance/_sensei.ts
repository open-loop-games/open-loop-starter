/**
 * The reference sensei, one act at a time, through the game's own verbs: a player,
 * working only what a player works by hand. The arc probe times its beats; the games
 * site's beat script saves at them.
 *   - Writes the scroll a player would for the words the dojo knows and the visitor the
 *     gate has announced, and inks it when it differs from the one inked: a template per
 *     challenger until the Envoy's Names make one dispatching scroll do.
 *   - Learns an arrived, unbeaten challenger's answer first. While it is within reach
 *     and unaffordable, writes no purchase lines, so the purse can fill.
 *   - Graduates once a run pays at least half the Insight ever earned (never less than
 *     two) and no challenger at the gate is unbeaten, then studies every scroll it can.
 *
 * The student's executor is the shipping automation; the sensei only writes for it. The
 * caller advances the engine between acts and calls `act` once a second of play.
 */

import { Decimal, type DecimalSource } from '@open-loop/engine';
import { getDojo, getGate, getGraduation, getKata, getLineage, type KataError } from '../modules';
import {
  ANCHORS,
  CHALLENGERS,
  SCROLLS,
  techniqueCost,
  type ChallengerId,
  type ScrollId,
  type TechniqueId,
} from '../data';

const num = (x: DecimalSource) => Decimal.fromValue(x).toNumber();

// ─── The reference scrolls ─────────────────────────────────────────────

/** The bout lines a template holds for one challenger, given the words known. */
export function boutLines(id: ChallengerId | null, k: (t: TechniqueId) => boolean): string[] {
  const flurry = k('repetition') ? '3x strike' : 'strike';
  switch (id) {
    case 'bao':
      return [k('repetition') ? '9x strike' : 'strike'];
    case 'wen':
      return [flurry];
    case 'gang':
      return k('turning-hand') ? ['if foe winds: parry', 'strike'] : [flurry];
    case 'ma':
      return k('patience') ? ['when foe open: 3x strike'] : [flurry];
    case 'twins':
      return k('high-and-low') ? ['if foe high: 3x kick', '3x strike'] : [flurry];
    case 'lu':
      return k('mirror') ? ['3x alternate strike kick palm'] : [flurry];
    case 'redgate':
      return k('many-hands') ? ['if foes > 1: sweep', 'strike'] : [flurry];
    default:
      return [flurry];
  }
}

/** The dispatcher the Envoy's Names allow: a block for each challenger that needs its own form. */
function dispatcher(): string[] {
  return [
    'if foes > 1: sweep',
    'if foe is gang:',
    '  if foe winds: parry',
    '  strike',
    'else:',
    '  if foe is ma:',
    '    when foe open: 3x strike',
    '  else:',
    '    if foe high: 3x kick',
    '    3x alternate strike kick palm',
  ];
}

/**
 * The scroll the reference sensei writes.
 *
 * @param k - whether the dojo knows a technique
 * @param visitor - the challenger at or announced to the gate, if any
 * @param saving - whether to leave out the purchase lines, so the purse fills
 */
export function referenceScroll(
  k: (t: TechniqueId) => boolean,
  visitor: ChallengerId | null,
  saving: boolean,
): string {
  if (!k('reading')) return 'strike\nstrike\nstrike\nrecruit';
  const max = k('thousand-hands') ? ' max' : '';
  const lines: string[] = [];
  if (!saving) {
    if (k('lineage')) lines.push(`if ready promote: promote${max}`);
    lines.push(`if ready recruit: recruit${max}`);
    if (k('iron-body')) lines.push('if ready temper: temper');
  }
  if (k('breath-reading')) lines.push('if chi < 15: breathe');
  lines.push(...(k('names') ? dispatcher() : boutLines(visitor, k)));
  return lines.join('\n');
}

// ─── The sensei ────────────────────────────────────────────────────────

/** What one act did that a probe records. */
export interface SenseiAct {
  /** The errors of the scroll it inked, or null when it inked none. */
  inked: KataError[] | null;
  /** The Insight a graduation paid, or null when it did not graduate. */
  graduated: number | null;
  /** The scrolls it studied after graduating, in order, repeats included. */
  studied: ScrollId[];
}

const ANSWER: Partial<Record<ChallengerId, TechniqueId>> = Object.fromEntries(
  CHALLENGERS.filter((c) => c.answer).map((c) => [c.id, c.answer as TechniqueId]),
);

/** Binds the sensei to the running engine's modules; call `act` once a second of play. */
export function createReferenceSensei(): { act: () => SenseiAct } {
  const lineage = getLineage();
  const dojo = getDojo();
  const gate = getGate();
  const kata = getKata();
  const graduation = getGraduation();

  function act(): SenseiAct {
    const out: SenseiAct = { inked: null, graduated: null, studied: [] };
    const unbeaten = lineage.arrived.value.filter((id) => !lineage.beaten.value.includes(id));
    const income = num(dojo.kiRate.value) + num(dojo.strikeValue.value) / kata.beatSeconds.value;
    let saving = false;
    for (const id of lineage.arrived.value) {
      const tech = ANSWER[id];
      if (!tech || dojo.knows(tech)) continue;
      if (dojo.learn(tech)) continue;
      const price = techniqueCost(tech);
      if (unbeaten.includes(id) && price <= ANCHORS.saveHorizonSeconds * income) saving = true;
    }
    if (!saving)
      for (const tech of ['reading', 'lineage', 'thousand-hands'] as TechniqueId[])
        dojo.learn(tech);

    const visitor = gate.bout.value?.challenger ?? gate.next.value?.id ?? null;
    const want = referenceScroll(dojo.knows, visitor, saving);
    if (want !== kata.inked.value) out.inked = kata.ink(want);

    const insightEver = num(lineage.insight.cumulative!.value);
    if (
      !gate.inBout.value &&
      unbeaten.length === 0 &&
      graduation.pendingInsight.value >= Math.max(2, Math.floor(0.5 * insightEver))
    ) {
      out.graduated = graduation.graduate();
      for (const s of SCROLLS) while (graduation.study(s.id)) out.studied.push(s.id);
    }
    return out;
  }

  return { act };
}
