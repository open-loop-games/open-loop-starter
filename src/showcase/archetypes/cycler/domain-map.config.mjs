/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Cycler — domain language',
  description:
    'Skerry Light: a keeper on a bare rock builds by day against the quarter tonight’s gale is forecast to come from; the storm grows each night until the tower falls, and the logbook buys knowledge that outlasts the watch.',
  curated: [
    {
      term: 'watch',
      note: 'One run: from taking a posting to the light going out. The watch module’s whole context resets at its end.',
    },
    {
      term: 'day',
      note: 'The calm phase: nets fill, and the keeper hauls, builds, takes pieces up, mends and takes a find.',
    },
    {
      term: 'night',
      note: 'The pressure phase: the storm’s breakers land on the forecast quarter. Shoring up is the only verb.',
    },
    {
      term: 'quarter',
      note: 'The side of the rock tonight’s gale comes from: north, east, south or west. Forecast at dawn.',
    },
    {
      term: 'ward',
      note: 'Force a side turns aside per night: the sum of its five shore cells’ breakwaters, braced and buttressed.',
    },
    {
      term: 'storm',
      note: 'Tonight’s total force, W₀·g^(night−1). Pegged at the watch’s start to the saturated ward of permanent power.',
    },
    {
      term: 'tideline',
      note: 'The nets’ held catch: each net holds its own until hauled, and spills when full.',
    },
    {
      term: 'find',
      note: 'What the tide leaves at dawn: three are offered, one is taken, the rest wash out at dusk.',
    },
    {
      term: 'posting',
      note: 'The rock a watch is kept on, chosen between watches: storm growth, wind and wrack.',
    },
    {
      term: 'logbook entry',
      note: 'The meta currency: a cube root of force weathered plus a cube root of salvage gathered, paid when the light goes out.',
    },
  ],
};
