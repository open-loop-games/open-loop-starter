// ─── Skeleton ───
// The night of January 14, 1979, as evidence: where each person was, hour by
// hour. One card is one sighting — a person, a place, an hour. The board
// arranges the cards; the stakeout watches the same places and hours. Pure
// data and pure functions, shared by the modules and the spine.

/** The places the night model covers: the stakeout's rows. */
export type PlaceId = 'mill' | 'post' | 'church' | 'bus' | 'hospital' | 'ditch';

export const PLACES: { id: PlaceId; displayName: string }[] = [
  { id: 'mill', displayName: 'The mill' },
  { id: 'post', displayName: 'Post office' },
  { id: 'church', displayName: 'Church' },
  { id: 'bus', displayName: 'Bus stop' },
  { id: 'hospital', displayName: 'Hospital' },
  { id: 'ditch', displayName: 'Ditch road' },
];

/** The night's hours, two to a slot: the stakeout's columns. */
export const HOURS = ['18:00', '20:00', '22:00', '00:00', '02:00', '04:00'] as const;
export type Hour = 0 | 1 | 2 | 3 | 4 | 5;

/** Who a card names. The six suspects are watched; Ada is only ever on the board. */
export type PersonId = 'varga' | 'ames' | 'kell' | 'ferro' | 'ashby' | 'pruitt' | 'ada';

export const PEOPLE: Record<PersonId, string> = {
  varga: 'Varga',
  ames: 'Ames',
  kell: 'Kell',
  ferro: 'Ferro',
  ashby: 'Ashby',
  pruitt: 'Pruitt',
  ada: 'Ada',
};

export interface CardDef {
  id: string;
  who: PersonId;
  where: PlaceId;
  when: Hour;
}

const card = (who: PersonId, where: PlaceId, when: Hour): CardDef => ({
  id: `${who}-${where}-${when}`,
  who,
  where,
  when,
});

/**
 * Every sighting the night holds, in the order the clerks write them up. The
 * postmistress's and the minister's nights come first and whole, so the first
 * board has strings to find and the first alibis can hold early; the rest
 * arrive scattered.
 */
export const DECK: CardDef[] = [
  card('kell', 'post', 0),
  card('ames', 'church', 2),
  card('kell', 'post', 1),
  card('ferro', 'mill', 3),
  card('ames', 'church', 3),
  card('kell', 'post', 2),
  card('ada', 'post', 0),
  card('ames', 'church', 0),
  card('kell', 'post', 3),
  card('ashby', 'hospital', 1),
  card('ames', 'church', 1),
  card('varga', 'bus', 1),
  card('pruitt', 'ditch', 4),
  card('ferro', 'mill', 5),
  card('ashby', 'hospital', 3),
  card('ada', 'church', 1),
  card('varga', 'mill', 0),
  card('pruitt', 'ditch', 1),
  card('ferro', 'mill', 2),
  card('ashby', 'hospital', 5),
  card('pruitt', 'ditch', 2),
  card('ada', 'bus', 2),
  card('ferro', 'mill', 4),
  card('ashby', 'hospital', 2),
  card('pruitt', 'ditch', 3),
  card('ashby', 'hospital', 4),
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(DECK.map((c) => [c.id, c]));

/** The suspects' hours: every card that does not name Ada. */
export const SUSPECT_CARDS = DECK.filter((c) => c.who !== 'ada');

/** How strongly two cards string together: the facts they share, 0 to 2. */
export function stringStrength(a: CardDef, b: CardDef): number {
  return (a.who === b.who ? 1 : 0) + (a.where === b.where ? 1 : 0) + (a.when === b.when ? 1 : 0);
}

// ─── The board ───

/** The corkboard's full side; the open part is the top-left square. */
export const BOARD_SIDE = 6;
/** Open sides by expansions bought: 3×3, then 4×4, 5×5 and 6×6. */
export const BOARD_SIDES = [3, 4, 5, 6] as const;

/** Cell index on the full board. */
export const cellAt = (x: number, y: number) => y * BOARD_SIDE + x;

/**
 * Total string strength over a board: each orthogonal pair of pinned cards
 * counts once. `pins` is indexed by cell; open cells are those inside `side`.
 */
export function boardStrength(pins: readonly (string | null)[], side: number): number {
  let total = 0;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const a = pins[cellAt(x, y)];
      if (!a) continue;
      const right = x + 1 < side ? pins[cellAt(x + 1, y)] : null;
      const down = y + 1 < side ? pins[cellAt(x, y + 1)] : null;
      if (right) total += stringStrength(CARD_BY_ID[a], CARD_BY_ID[right]);
      if (down) total += stringStrength(CARD_BY_ID[a], CARD_BY_ID[down]);
    }
  }
  return total;
}

/** What pinning `cardId` at cell `(x, y)` would add to the board's strength. */
export function pinGain(
  pins: readonly (string | null)[],
  side: number,
  cardId: string,
  x: number,
  y: number,
): number {
  const c = CARD_BY_ID[cardId];
  let gain = 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
    const n = pins[cellAt(nx, ny)];
    if (n) gain += stringStrength(c, CARD_BY_ID[n]);
  }
  return gain;
}

// ─── The stakeout ───

/** A watch: one place at one hour. */
export const watchKey = (where: PlaceId, when: Hour) => `${where}@${when}`;

/** Who stands at each watch on the night, if anyone. Suspects never share a watch. */
export const SUSPECT_AT: Record<string, PersonId> = Object.fromEntries(
  SUSPECT_CARDS.map((c) => [watchKey(c.where, c.when), c.who]),
);

/** Every watch on the grid, row by row. */
export const ALL_WATCHES: string[] = PLACES.flatMap((p) =>
  HOURS.map((_, h) => watchKey(p.id, h as Hour)),
);

// ─── Policies ───
// The spine's reference player, as pure functions over the board and the
// stakeout. The spine walks them, the probe plays them through the game's
// verbs, and the clerks' planning automation runs `planWatches` without its
// search: one policy, so the prediction and the game cannot drift apart.

/**
 * The open empty cell where `cardId` adds the most string, first in reading
 * order on a tie; null when the open board is full.
 */
export function bestCell(
  pins: readonly (string | null)[],
  side: number,
  cardId: string,
): { x: number; y: number; gain: number } | null {
  let best: { x: number; y: number; gain: number } | null = null;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (pins[cellAt(x, y)]) continue;
      const gain = pinGain(pins, side, cardId, x, y);
      if (!best || gain > best.gain) best = { x, y, gain };
    }
  }
  return best;
}

export interface StakeoutView {
  /** Watches the night can staff. */
  roster: number;
  /** Banked sightings per watch. */
  seen: Readonly<Record<string, number>>;
  /** Watches known to hold nobody. */
  empty: ReadonlySet<string>;
  /** Watches the board's cards point at. */
  hints: ReadonlySet<string>;
  /** Sightings an hour of an alibi needs before it holds. */
  need: number;
  /** Empty watches a night survives; one more breaks the model. */
  strainCap: number;
  /** Whether to spend watches searching unknown ground. */
  search: boolean;
}

/** Sightings still short of `need` over the watches known to hold `who`. */
function shortfall(v: StakeoutView, known: readonly string[], who: PersonId): number {
  return known
    .filter((k) => SUSPECT_AT[k] === who)
    .reduce((n, k) => n + Math.max(0, v.need - (v.seen[k] ?? 0)), 0);
}

/**
 * A night's watches. Known suspects short of `need` first, nearest-finished
 * alibi first; then, when searching, unknown watches — beside a known one in
 * the same place first — at most one fewer than would break the model; then
 * known suspects again, for the accounts a sighting files.
 */
export function planWatches(v: StakeoutView): string[] {
  const known = ALL_WATCHES.filter((k) => v.hints.has(k) || (v.seen[k] ?? 0) > 0);
  const plan: string[] = [];
  const take = (keys: string[], limit = Infinity) => {
    for (const k of keys) {
      if (plan.length >= v.roster || limit <= 0) return;
      if (plan.includes(k)) continue;
      plan.push(k);
      limit--;
    }
  };

  const needy = known
    .filter((k) => (v.seen[k] ?? 0) < v.need)
    .sort((a, b) => shortfall(v, known, SUSPECT_AT[a]) - shortfall(v, known, SUSPECT_AT[b]));
  take(needy);

  if (v.search) {
    const unknown = ALL_WATCHES.filter((k) => !known.includes(k) && !v.empty.has(k));
    const near = (k: string) => {
      const [where, when] = k.split('@');
      const h = Number(when);
      return [h - 1, h + 1].filter((n) => known.includes(`${where}@${n}`)).length;
    };
    take(
      [...unknown].sort((a, b) => near(b) - near(a)),
      v.strainCap - 1,
    );
  }

  take(known);
  return plan;
}
