/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Spec'],
  title: 'Defender — domain language',
  description:
    'Maze tower defence in a walled kitchen garden. By day the gardener plants hedges that re-route the pests and plants that see them off; by night the wave walks to the seedbed. Each plot keeps its best score, and the sum is the gardener’s level.',
  curated: [
    {
      term: 'plot',
      note: 'One field: a fixed map and a fixed run of waves. Holding it opens the next. Its run is not saved; only its best score outlasts it.',
    },
    {
      term: 'wave',
      note: "One night's pests, composed from the spine's closed forms. It resolves as a batch: nothing can be planted until it is over.",
    },
    {
      term: 'build phase',
      note: 'The day between waves, on a timer. Calling it a day ends it early and pays compost for the daylight given up; the first one waits for the gardener.',
    },
    {
      term: 'path',
      note: 'The route the pests walk from the gap to the seedbed: the shortest one through the beds left open. A planting may lengthen it but never seal it.',
    },
    {
      term: 'leak',
      note: 'A pest that reaches the seedbed. It eats seedlings; an empty seedbed loses the plot.',
    },
    {
      term: 'committed value',
      note: "The compost on the board plus the compost in hand when a wave launches: the spine's prediction of what the gardener has built.",
    },
    {
      term: 'pressure',
      note: "A plot's HP pool over what the reference planting deals. Below 1 the plot leaves a margin; above 1 the almanac has to carry the gardener.",
    },
    {
      term: 'level',
      note: "The gardener's level: read from the sum of each plot's best score, so a worse night on a plot pays nothing.",
    },
    {
      term: 'almanac',
      note: 'The lessons the notes buy, one note a level each. They carry into every plot, and can be taken back for free.',
    },
    {
      term: 'companion',
      note: "A plant touching marigolds, diagonals included: it hunts harder by the marigolds' boost.",
    },
    {
      term: 'counter wheel',
      note: 'Each night sends one kind of pest, each plot in its own rotation, and each attack form meets each armour kind at its own multiplier. The board shows the next three nights, so the gardener plants for the night ahead.',
    },
    {
      term: 'answer share',
      note: "The share of the reference board's hunting compost that can hurt tonight's kind, weighted by the matrix. A night is sized against that share, not the whole board.",
    },
    {
      term: 'the dark',
      note: "Nights past a plot's last, offered when the plot is held: the rotation turns on and HP outgrows bounty each night until the seedbed is eaten. Its depth adds to the plot's best score.",
    },
    {
      term: 'hold',
      note: "The moment a plot's last night is seen off: the plot is held, its victory banked, and the run waits for the gardener to call it a night or go on.",
    },
    {
      term: 'toll',
      note: 'How much of a pool of one kind a board lands before one gets through, against slugs. Measured per kind; a night is sized by it.',
    },
  ],
};
