/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Prediction'],
  title: 'Explorer — domain language',
  description:
    'Zone as gameplay: a fogged map the huntsman uncovers one tile at a time, walking out on carried jerky and back to bank what he hunts. Nothing resets; the reward is territory.',
  curated: [
    {
      term: 'band',
      note: 'A ring of terrain at a depth from the lodge: meadow, forest, fen, snowfield, deepwood. Each band past the forest needs a piece of terrain gear, and its quarry pays G× the band before.',
    },
    {
      term: 'tether',
      note: 'The charted ground the huntsman can walk to and still get home from on the jerky he carries. The chart fences it with the last light; a camp or a satchel moves it outward.',
    },
    {
      term: 'restock point',
      note: 'The lodge or a camp: standing on one refills the satchel from the lodge store. Only the lodge banks the pack.',
    },
    {
      term: 'pack',
      note: 'What the huntsman carries home: meat, hides and antler, under one total capacity. It banks only at the lodge, and a mauling or an empty satchel loses it.',
    },
    {
      term: 'reference trip',
      note: "The spine's unit: walk from the lodge to the middle of band k, hunt four times, walk home and bank. Every price is sized by what this trip earns per second.",
    },
    {
      term: "Hart's trail",
      note: 'The Pale Hart shows itself only after a stay of deepwood kills, so the last band is dwelt in, not walked through. Taking the Hart is the ending.',
    },
  ],
};
