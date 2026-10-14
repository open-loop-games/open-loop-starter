// ─── Skeleton ───
// The ratings: the take's danger, chosen at the call sheet. Each starts the take deeper
// into the opposition curve. Taking a rating to CUT opens the next; a harsher rating pays
// nothing more.

export interface RatingDef {
  id: 'g' | 'pg' | 'pg13' | 'r';
  label: string;
  index: number;
  blurb: string;
}

export const RATINGS: readonly RatingDef[] = [
  { id: 'g', label: 'G', index: 0, blurb: 'General audiences. The extras are polite.' },
  { id: 'pg', label: 'PG', index: 1, blurb: 'Some peril. The crowd starts a scene ahead.' },
  { id: 'pg13', label: 'PG-13', index: 2, blurb: 'Intense sequences of action violence.' },
  { id: 'r', label: 'R', index: 3, blurb: 'Relentless. Nobody pulls their punches.' },
];
