import { computed } from 'vue';
import {
  CONDITION_BY_ID,
  HULL_W,
  PIECE_BY_ID,
  SHIP_BY_ID,
  SHIPS,
  type ConditionDef,
  type ConditionId,
  type PieceId,
} from '../data';
import {
  getBoard,
  getFleet,
  getYard,
  runsCold,
  underConditions,
  type LayoutParams,
  type LinkBoosterId,
  type Placed,
} from '../modules';

/**
 * View-side reads of the ship in service: its def, which of its two acts is running, and
 * which fitted modules the sector's conditions silence. Derived from the fleet, the yard
 * and the board; holds no state.
 */
export function useShipInService() {
  const fleet = getFleet();
  const yard = getYard();
  const def = computed(() => SHIP_BY_ID[fleet.ship.value]);
  /** 0 for the base hull, 1 once the section that opens the second act is plated */
  const act = computed(() => {
    const opener = def.value.acts[1].beats[0]!;
    return yard.plated(Number(opener.slice(opener.indexOf('section-') + 8))) ? 1 : 0;
  });
  return {
    def,
    act,
    hullClass: computed(() => def.value.classes[act.value]),
    actName: computed(() => def.value.acts[act.value].name),
    /** the act's number across the whole story, 1 to 6 */
    actNumber: computed(() => fleet.shipIndex.value * 2 + act.value + 1),
    next: computed(() => SHIPS[fleet.shipIndex.value + 1] ?? null),
  };
}

/** The defs of a list of condition ids. */
export const conditionDefs = (ids: readonly ConditionId[]): ConditionDef[] =>
  ids.map((id) => CONDITION_BY_ID[id]);

/** How a condition bears on one module: `dark` gives nothing, `weak` gives less. */
export interface Silenced {
  by: ConditionId;
  dark: boolean;
}

/** What a module gives under these strengths: its link, stamp, amplification or yield, over its reach. */
function strength(type: PieceId, p: LayoutParams): number {
  const def = PIECE_BY_ID[type];
  if (def.role === 'booster') {
    const boost = p.boost[type as LinkBoosterId];
    return def.relation === 'ray' ? boost * Math.min(p.rayRange, HULL_W) : boost;
  }
  if (def.role === 'beacon') return p.beaconGain;
  if (def.role === 'amplifier') return p.coolantGain;
  if (def.role === 'tractor') return p.tractorGain;
  return 1;
}

/**
 * The condition that silences a fitted module, or null: one that runs it cold, or whose
 * rewrite (`underConditions`) alone lowers what it gives. So the board marks what the
 * sector took away by the layout's own rules.
 */
export function silencedBy(p: Placed, conditions: readonly ConditionId[]): Silenced | null {
  const board = getBoard();
  if (PIECE_BY_ID[p.type].role === 'weapon') return null;
  if (conditions.includes('close-quarters') && runsCold(board.view, board.params.value, p.x, p.y))
    return { by: 'close-quarters', dark: true };
  const base = board.baseParams.value;
  const calm = strength(p.type, base);
  for (const c of conditions) {
    const under = strength(p.type, underConditions(base, [c]));
    if (under < calm) return { by: c, dark: under === 0 };
  }
  return null;
}
