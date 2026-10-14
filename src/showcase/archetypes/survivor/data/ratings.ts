// ─── Skeleton ───
// The ratings: the take's danger, chosen at the call sheet. Each starts the take deeper
// into the opposition curve, stages more set pieces and guests (`script.ts`), and pays more
// clout for the same reels. A rating opens once enough stars have wrapped the one below.

export interface RatingDef {
  id: 'g' | 'pg' | 'pg13' | 'r';
  label: string;
  index: number;
  blurb: string;
  /** Clout multiplier on the reels a take banks. */
  pay: number;
  /** Signed stars that must have wrapped the rating below before this one opens. */
  gate: number;
}

export const RATINGS: readonly RatingDef[] = [
  {
    id: 'g',
    label: 'G',
    index: 0,
    blurb: 'General audiences. The extras are polite.',
    pay: 1,
    gate: 0,
  },
  {
    id: 'pg',
    label: 'PG',
    index: 1,
    blurb: 'Some peril. The crowd starts a scene ahead.',
    pay: 1.25,
    gate: 1,
  },
  {
    id: 'pg13',
    label: 'PG-13',
    index: 2,
    blurb: 'Intense sequences of action violence.',
    pay: 1.5,
    gate: 1,
  },
  {
    id: 'r',
    label: 'R',
    index: 3,
    blurb: 'Relentless. Nobody pulls their punches.',
    pay: 2,
    gate: 2,
  },
];
