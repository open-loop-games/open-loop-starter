// ─── Skeleton ───
// The ground a night covers: the prison's four zones and the two past the wall,
// the actions in each, the items they pass along, and the landmarks that end
// each stage. Durations come from `./spine.ts`; a gate's duration is derived
// there, never authored here. The reference plan through all of it is
// `REFERENCE_ROUTE` in `./spine.ts`.

import { ACTION_SECONDS, GATE_SECONDS } from './spine';
import type { SkillId } from './skills';

export type ItemId = 'picks' | 'smokes' | 'keycard' | 'fence' | 'gate';

export interface ZoneDef {
  id: string;
  displayName: string;
  /** zone depth; a night stands in zone `depth` once that gate falls */
  order: number;
}

export const ZONES: ZoneDef[] = [
  { id: 'cell', displayName: 'Cell 4471', order: 0 },
  { id: 'corridor', displayName: 'C-Block Corridor', order: 1 },
  { id: 'laundry', displayName: 'Laundry', order: 2 },
  { id: 'yard', displayName: 'The Yard', order: 3 },
  { id: 'woods', displayName: 'Blackwater Woods', order: 4 },
  { id: 'rail-yard', displayName: 'The Rail Yard', order: 5 },
];

export interface ActionDef {
  id: string;
  displayName: string;
  /** zone index the action happens in; runnable once the night has reached it */
  zone: number;
  /** base-seconds of work at speed 1 */
  baseSeconds: number;
  /** skill weights, summing to 1: the speed product's exponents and the xp split */
  weights: Partial<Record<SkillId, number>>;
  /** completions allowed per night */
  limit?: number;
  /** items spent on completion; held at dispatch or the action is skipped */
  consumes?: Partial<Record<ItemId, number>>;
  /** items held (not spent) the action needs */
  needs?: Partial<Record<ItemId, number>>;
  /** items gained on completion */
  gives?: Partial<Record<ItemId, number>>;
  /** Nerve restored on completion; the ride's amount falls with the night clock */
  nerve?: 'coffee' | 'hamper' | 'ride';
  /** completion raises the kept patrol-knowledge level */
  learnsPatrol?: true;
  /** landmark depth reached on completion */
  opens?: number;
  flavor: string;
}

export const ACTIONS: ActionDef[] = [
  // Cell 4471
  {
    id: 'push-ups',
    displayName: 'Push-ups',
    zone: 0,
    baseSeconds: ACTION_SECONDS['push-ups'],
    weights: { brawn: 1 },
    flavor: 'Count them under your breath.',
  },
  {
    id: 'shadow-walk',
    displayName: 'Shadow-walk the Cell',
    zone: 0,
    baseSeconds: ACTION_SECONDS['shadow-walk'],
    weights: { stealth: 1 },
    flavor: 'Heel, edge, toe. No creak.',
  },
  {
    id: 'rehearse',
    displayName: 'Rehearse Your Story',
    zone: 0,
    baseSeconds: ACTION_SECONDS.rehearse,
    weights: { guile: 1 },
    flavor: '"Infirmary, boss. Chest pains."',
  },
  {
    id: 'bend-wire',
    displayName: 'Bend Bedspring Wire',
    zone: 0,
    baseSeconds: ACTION_SECONDS['bend-wire'],
    weights: { finesse: 1 },
    limit: 3,
    gives: { picks: 1 },
    flavor: 'A pick, if you are patient.',
  },
  {
    id: 'pick-cell',
    displayName: 'Pick the Cell Lock',
    zone: 0,
    baseSeconds: GATE_SECONDS['pick-cell'],
    weights: { finesse: 0.7, stealth: 0.3 },
    limit: 1,
    consumes: { picks: 1 },
    opens: 1,
    flavor: 'Old Yale tumbler. Five pins.',
  },
  // C-Block Corridor
  {
    id: 'learn-patrol',
    displayName: 'Watch the Patrol',
    zone: 1,
    baseSeconds: ACTION_SECONDS['learn-patrol'],
    weights: { stealth: 0.7, guile: 0.3 },
    learnsPatrol: true,
    flavor: 'Count the paces. Note who yawns. Remember it.',
  },
  {
    id: 'coffee',
    displayName: 'Swipe the Guard’s Coffee',
    zone: 1,
    baseSeconds: ACTION_SECONDS.coffee,
    weights: { stealth: 0.5, finesse: 0.5 },
    limit: 2,
    nerve: 'coffee',
    flavor: 'Still warm. Steadies the hands.',
  },
  {
    id: 'smokes',
    displayName: 'Trade with Cell 12',
    zone: 1,
    baseSeconds: ACTION_SECONDS.smokes,
    weights: { guile: 1 },
    limit: 3,
    gives: { smokes: 1 },
    flavor: 'Whispers through the bars. One pack.',
  },
  {
    id: 'slip-patrol',
    displayName: 'Slip the Patrol',
    zone: 1,
    baseSeconds: GATE_SECONDS['slip-patrol'],
    weights: { stealth: 0.8, brawn: 0.2 },
    limit: 1,
    opens: 2,
    flavor: 'Forty paces between flashlights.',
  },
  // Laundry
  {
    id: 'hamper',
    displayName: 'Hide in a Hamper',
    zone: 2,
    baseSeconds: ACTION_SECONDS.hamper,
    weights: { stealth: 1 },
    limit: 1,
    nerve: 'hamper',
    flavor: 'Starch and bleach. Your heart slows.',
  },
  {
    id: 'bribe',
    displayName: 'Bribe the Trustee',
    zone: 2,
    baseSeconds: ACTION_SECONDS.bribe,
    weights: { guile: 0.8, finesse: 0.2 },
    limit: 1,
    consumes: { smokes: 2 },
    gives: { keycard: 1 },
    flavor: 'Two packs buys a keycard and a short memory.',
  },
  {
    id: 'badge-door',
    displayName: 'Badge Through the Yard Door',
    zone: 2,
    baseSeconds: GATE_SECONDS['badge-door'],
    weights: { stealth: 0.5, guile: 0.5 },
    limit: 1,
    needs: { keycard: 1 },
    opens: 3,
    flavor: 'Green light. Do not run.',
  },
  // The Yard
  {
    id: 'cut-fence',
    displayName: 'Cut the Inner Fence',
    zone: 3,
    baseSeconds: GATE_SECONDS['cut-fence'],
    weights: { brawn: 0.6, finesse: 0.4 },
    limit: 1,
    gives: { fence: 1 },
    flavor: 'Bolt cutters from the motor pool.',
  },
  {
    id: 'wall-climb',
    displayName: 'Scale the Wall',
    zone: 3,
    baseSeconds: GATE_SECONDS['wall-climb'],
    weights: { brawn: 0.7, stealth: 0.3 },
    limit: 1,
    needs: { fence: 1 },
    opens: 4,
    flavor: 'Between sweeps of the searchlight.',
  },
  // Blackwater Woods
  {
    id: 'ride',
    displayName: 'Catch the Milk Truck',
    zone: 4,
    baseSeconds: ACTION_SECONDS.ride,
    weights: { guile: 0.6, stealth: 0.4 },
    limit: 1,
    consumes: { smokes: 1 },
    nerve: 'ride',
    flavor: 'A pack for the driver, and he never saw you. He leaves at half past two.',
  },
  {
    id: 'cross-woods',
    displayName: 'Cross the Woods',
    zone: 4,
    baseSeconds: GATE_SECONDS['cross-woods'],
    weights: { brawn: 0.5, stealth: 0.5 },
    limit: 1,
    opens: 5,
    flavor: 'Keep the river on your left and the dogs behind you.',
  },
  // The Rail Yard
  {
    id: 'padlock',
    displayName: 'Pick the Yard Padlock',
    zone: 5,
    baseSeconds: ACTION_SECONDS.padlock,
    weights: { finesse: 0.8, stealth: 0.2 },
    limit: 1,
    consumes: { picks: 1 },
    gives: { gate: 1 },
    flavor: 'The same wire, a heavier lock.',
  },
  {
    id: 'board-freight',
    displayName: 'Board the Freight',
    zone: 5,
    baseSeconds: GATE_SECONDS['board-freight'],
    weights: { brawn: 0.6, finesse: 0.4 },
    limit: 1,
    needs: { gate: 1 },
    opens: 6,
    flavor: 'The 4:10 to anywhere. Run alongside, then jump.',
  },
];

export const ITEM_NAMES: Record<ItemId, string> = {
  picks: 'Wire picks',
  smokes: 'Smokes',
  keycard: 'Keycard',
  fence: 'Fence cut',
  gate: 'Yard gate open',
};

/** Landmark names, by depth — the splits board reads these. */
export const LANDMARKS: Record<number, string> = {
  1: 'Out of the cell',
  2: 'Into the laundry',
  3: 'Into the yard',
  4: 'Over the wall',
  5: 'Into the rail yard',
  6: 'On the freight',
};

/** The plan a first night starts with: make a pick, use it, train the rest of the night. */
export const DEFAULT_PLAN: { id: string; times: number }[] = [
  { id: 'bend-wire', times: 1 },
  { id: 'pick-cell', times: 1 },
  { id: 'push-ups', times: 3 },
];
