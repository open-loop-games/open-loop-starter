/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Prediction'],
  title: 'Explorer — domain language',
  description:
    'Zone as gameplay: a fogged map the huntsman uncovers one tile at a time, walking out on carried jerky and water and back to bank what he hunts and charts. Nothing resets; the reward is territory.',
  curated: [
    {
      term: 'band',
      note: 'A ring of terrain at a depth from the lodge: meadow, forest, fen, snowfield, deepwood. Each band past the forest needs a piece of terrain gear, and its quarry pays G× the band before.',
    },
    {
      term: 'tether',
      note: 'The charted ground the huntsman can walk to and still get back from on what he carries: home on his jerky, and to water on his water. The chart fences it with the last light; a spring, a camp, a satchel or a skin moves it outward.',
    },
    {
      term: 'restock point',
      note: 'The lodge or a camp: standing on one refills the satchel from the lodge store and banks the notes. The lodge banks the pack, and so does a camp once the sledge is taken.',
    },
    {
      term: 'notes',
      note: 'The ground a trip has charted and not yet banked. Notes bank at the lodge or a camp; a fall loses them. Only banked ground counts toward Wayfinder.',
    },
    {
      term: 'water source',
      note: 'Where the skin refills: the lodge well, a spring, the river, a tile beside a Fen mere, and a camp once the mattock is taken. Water in the Snowfield is frozen and refills nothing.',
    },
    {
      term: 'den',
      note: "One beast in the forest, the Fen and the Snowfield, an even fight for the next band's bow. It never regrows, and taking it pays a trophy that changes the ground from then on.",
    },
    {
      term: 'pack',
      note: 'What the huntsman carries home: meat, hides and antler, under one total capacity. It banks only at the lodge (or any camp, once the sledge is taken), and a mauling or an empty satchel or skin loses it.',
    },
    {
      term: 'reference trip',
      note: "The spine's unit: walk to the middle of band k, hunt four times, walk back to where the haul banks, refilling water on the way. Every price is sized by what this trip earns per second.",
    },
    {
      term: "Hart's trail",
      note: 'The Pale Hart shows itself only after a stay of deepwood kills, so the last band is dwelt in, not walked through. Taking the Hart is the ending.',
    },
  ],
};
