// ─── Skeleton ───
// Authored content: the plots, and what the gardener reads about each plant,
// pest and almanac lesson. Numbers that are balance are in `./spine.ts`.

import type { Armour, LessonId, PestKind, PlantId } from './spine';

export interface PlotDef {
  id: string;
  displayName: string;
  blurb: string;
  /**
   * Row-major map, every row the same width. `S` the gap in the wall pests
   * come through, `G` the seedbed, `#` stone (no planting, no passing), `.` open
   * bed.
   */
  map: string[];
}

export const PLOTS: PlotDef[] = [
  {
    id: 'herb-border',
    displayName: 'The Herb Border',
    blurb: 'Thyme and sage along the south wall. The slugs come out of the long grass at dusk.',
    map: [
      '...............',
      '...............',
      '....#.....#....',
      'S...#.....#...G',
      '....#.....#....',
      '...............',
      '...............',
      '..#.........#..',
      '...............',
    ],
  },
  {
    id: 'bean-rows',
    displayName: 'The Bean Rows',
    blurb:
      'Runner beans on hazel poles, and stone edging nobody has moved in years. The mice are quick.',
    map: [
      '#.............#',
      '.......#.......',
      '..#....#....#..',
      'S.#.........#.G',
      '..#....#....#..',
      '.......#.......',
      '#......#......#',
      '...............',
      '###.........###',
    ],
  },
  {
    id: 'orchard',
    displayName: 'The Old Orchard',
    blurb:
      'Stumps and windfalls under the pear trees. A badger comes through behind the last wave.',
    map: [
      '.......#.......',
      '..#.........#..',
      '.....#...#.....',
      'S.............G',
      '.....#...#.....',
      '..#.........#..',
      '.......#.......',
      '...#.......#...',
      '.......#.......',
    ],
  },
];

export const PLANT_TEXT: Record<PlantId, { displayName: string; description: string }> = {
  hedge: {
    displayName: 'Box Hedge',
    description: 'Fills a cell. Pests walk the long way round it.',
  },
  thrush: {
    displayName: 'Thrush Perch',
    description:
      'A song thrush takes one pest at a time, the one nearest the seedbed, and cracks a beetle on its anvil stone. It never leaves the ground for a moth.',
  },
  trap: {
    displayName: 'Sticky Trap',
    description: 'Everything in reach, moths too, wades through it at a crawl.',
  },
  bat: {
    displayName: 'Bat Box',
    description:
      'Pipistrelles hawk moths out of the air. They never stoop for anything on the ground.',
  },
  marigold: {
    displayName: 'Marigolds',
    description:
      'Companion planting: every plant touching it, diagonals included, hunts half again as hard. Two marigolds on one plant do no more than one.',
  },
  ladybird: {
    displayName: 'Ladybird Hotel',
    description:
      'A slow release that lands on a cluster and works through all of it. Greenfly are its meat; a shell turns it.',
  },
};

export const PEST_TEXT: Record<PestKind, string> = {
  slug: 'Slug',
  mouse: 'Field mouse',
  beetle: 'Chafer beetle',
  aphid: 'Greenfly',
  moth: 'Silver Y moth',
  badger: 'Badger',
};

/** What each armour kind is called where a plant's strengths are read out. */
export const ARMOUR_TEXT: Record<Armour, string> = {
  soft: 'soft pests',
  shell: 'shells',
  swarm: 'greenfly',
  wing: 'moths',
};

export interface LessonDef {
  id: LessonId;
  displayName: string;
  description: string;
}

export const LESSONS: LessonDef[] = [
  {
    id: 'well-fed',
    displayName: 'Well-fed Birds',
    description: '+10% damage from every plant per level.',
  },
  {
    id: 'bins',
    displayName: 'Compost Bins',
    description: '+15% starting compost in every plot per level.',
  },
  {
    id: 'perches',
    displayName: 'Taller Perches',
    description: '+0.2 cells of reach for every hunting plant per level.',
  },
  { id: 'cloches', displayName: 'Cloches', description: '+4 seedlings in the seedbed per level.' },
  {
    id: 'early-riser',
    displayName: 'Early Riser',
    description: '+50% compost from calling it a day per level.',
  },
];
