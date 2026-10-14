// ─── Skeleton ───
// What outlasts a watch. The logbook's entries buy the keeper's knowledge, and charters open
// postings. A posting is the run's setup: chosen between watches, read by the storm, the wind
// and the wrack, never by the payout.

export type PostingId = 'haven' | 'skerry' | 'wrath';

export interface PostingDef {
  id: PostingId;
  name: string;
  /** Storm growth per night. The Skerry sits on the spine's reference g. */
  g: number;
  /** Where storms come from: a fresh forecast each dawn, or one prevailing gale. */
  wind: 'veering' | 'N' | 'E' | 'S' | 'W';
  /** Multiplier on every net's catch. */
  wrack: number;
  blurb: string;
}

export const POSTINGS: readonly PostingDef[] = [
  {
    id: 'haven',
    name: 'Haven Point',
    g: 1.45,
    wind: 'veering',
    wrack: 1,
    blurb: 'Sheltered water, slow storms that veer night to night. A long watch.',
  },
  {
    id: 'skerry',
    name: 'The Skerry',
    g: 1.5,
    wind: 'veering',
    wrack: 1.25,
    blurb: 'Rich wrack on the tideline; the storms build faster to match.',
  },
  {
    id: 'wrath',
    name: 'Cape Wrath',
    g: 1.7,
    wind: 'W',
    wrack: 1,
    blurb: 'Every gale comes from the west, and every gale is worse. A short, hard watch.',
  },
];

export type KnowledgeId =
  | 'stone'
  | 'tides'
  | 'almanac'
  | 'stores'
  | 'charter-skerry'
  | 'charter-wrath';

/** Permanent keeper's knowledge, bought with logbook entries between watches. */
export interface KnowledgeDef {
  id: KnowledgeId;
  name: string;
  blurb: string;
  baseCost: number;
  growth: number;
  limit: number;
  /** Levels of another entry needed first. */
  requires?: { id: KnowledgeId; levels: number };
  /** The posting a charter opens. */
  opens?: PostingId;
}

export const KNOWLEDGE: readonly KnowledgeDef[] = [
  {
    id: 'stone',
    name: 'Dressed stone',
    blurb: 'Breakwaters ward ×1.25 per level. The storms you are posted to grow with you.',
    baseCost: 4,
    growth: 1.8,
    limit: Infinity,
  },
  {
    id: 'tides',
    name: 'Tide tables',
    blurb: 'Nets catch ×1.25 per level.',
    baseCost: 3,
    growth: 1.8,
    limit: Infinity,
  },
  {
    id: 'stores',
    name: "Keeper's stores",
    blurb: 'Start each posting with +50% salvage per level.',
    baseCost: 2,
    growth: 1.6,
    limit: Infinity,
  },
  {
    id: 'almanac',
    name: 'Storm almanac',
    blurb: 'Storms grow 15% gentler per level. The one lesson that lengthens a watch.',
    baseCost: 8,
    growth: 2.5,
    limit: 4,
    requires: { id: 'stone', levels: 2 },
  },
  {
    id: 'charter-skerry',
    name: 'Charter: The Skerry',
    blurb: 'Opens a posting to the Skerry.',
    baseCost: 5,
    growth: 1,
    limit: 1,
    opens: 'skerry',
  },
  {
    id: 'charter-wrath',
    name: 'Charter: Cape Wrath',
    blurb: 'Opens a posting to Cape Wrath.',
    baseCost: 9,
    growth: 1,
    limit: 1,
    opens: 'wrath',
  },
];

// ─── Balance ───
// Per-level ratios. Stone multiplies ward, so it re-pegs the storm and adds reach, not
// nights. The almanac keeps a fraction of (g − 1) per level: the one entry that lengthens a
// watch, and gated behind stone so pace follows power.
export const KNOWLEDGE_EFFECT = {
  stone: 1.25,
  tides: 1.25,
  stores: 0.5,
  /** Fraction of (g − 1) one almanac level keeps. */
  almanacBend: 0.85,
} as const;
