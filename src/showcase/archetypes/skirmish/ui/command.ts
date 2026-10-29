/**
 * The player's selection and the move order it takes. The field's clicks and the command
 * card's buttons both edit one selection and issue one move, so every order the field
 * gives has a keyboard path through the same calls into the orders module.
 *
 * A pick is a place or a convoy, never a figure: the sim holds counts, and part of a
 * count is still training. Picking a place selects your units there, your ready units
 * when it is your safehouse; a rival's place can be picked to read, and takes no order.
 */
import { reactive } from 'vue';
import type { Place } from '../data/map';
import { UNIT_KINDS, type UnitKind } from '../data/units';
import { deploy, redeploy, redirect } from '../modules/orders';
import type { Side } from '../modules/side';

export type Pick = { kind: 'squad'; place: Place } | { kind: 'convoy'; id: number };

export interface Selection {
  picks: Pick[];
  /** Districts a move walks through before its destination, queued by shift+right-click. */
  via: Place[];
  /** The kinds a move sends from a squad; a convoy always moves whole. */
  kinds: Record<UnitKind, boolean>;
}

export function createSelection(): Selection {
  return reactive({
    picks: [],
    via: [],
    kinds: Object.fromEntries(UNIT_KINDS.map((k) => [k, true])) as Record<UnitKind, boolean>,
  });
}

export const samePick = (a: Pick, b: Pick): boolean =>
  a.kind === 'squad'
    ? b.kind === 'squad' && a.place === b.place
    : b.kind === 'convoy' && a.id === b.id;

/** Select only these picks, or add them to the selection, or take back the ones already in it. */
export function select(
  sel: Selection,
  picks: Pick[],
  mode: 'replace' | 'toggle' = 'replace',
): void {
  sel.via.splice(0);
  if (mode === 'replace') {
    sel.picks.splice(0, sel.picks.length, ...picks);
    return;
  }
  for (const pick of picks) {
    const at = sel.picks.findIndex((q) => samePick(q, pick));
    if (at >= 0) sel.picks.splice(at, 1);
    else sel.picks.push(pick);
  }
}

export function clearSelection(sel: Selection): void {
  sel.picks.splice(0);
  sel.via.splice(0);
}

/** Let go of the convoys that are no longer on the road: they arrived and joined a squad. */
export function pruneSelection(sel: Selection, side: Side): void {
  const ids = new Set(side.convoys.value.map((c) => c.id));
  for (let i = sel.picks.length - 1; i >= 0; i--) {
    const pick = sel.picks[i]!;
    if (pick.kind === 'convoy' && !ids.has(pick.id)) sel.picks.splice(i, 1);
  }
}

/**
 * Send everything selected that answers to `side` to a place, through `via`. A squad sends
 * the kinds toggled on, a convoy turns on its road. Nothing goes into the other seat's
 * safehouse, which is besieged from a district beside it. Returns the orders that moved
 * something.
 */
export function moveSelection(
  side: Side,
  sel: Selection,
  to: Place,
  via: readonly Place[] = sel.via,
): number {
  const other = side.id === 'p' ? 'e' : 'p';
  if (to === other) return 0;
  const stops = via.filter((v) => typeof v === 'number');
  const kinds = UNIT_KINDS.filter((k) => sel.kinds[k]);
  let orders = 0;
  for (const pick of sel.picks) {
    if (pick.kind === 'convoy') {
      if (redirect(side, pick.id, to, stops)) orders++;
    } else if (pick.place === side.id) {
      if (typeof to !== 'number') continue;
      let moved = 0;
      for (const k of kinds) moved += deploy(side, k, to, Infinity, stops);
      if (moved > 0) orders++;
    } else if (typeof pick.place === 'number') {
      if (redeploy(side, pick.place, to, stops, kinds) > 0) orders++;
    }
  }
  sel.via.splice(0);
  return orders;
}
