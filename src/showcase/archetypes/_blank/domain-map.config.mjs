/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Balance'],
  title: 'Blank — domain language',
  description:
    'The neutral base: one tracked amount rising at a tunable rate, with one automation tier that ships locked. Replace this with your game.',
  curated: [
    {
      term: 'amount',
      note: 'The one tracked number, amount(t) = ratePerSecond · t. A placeholder for your economy; rename it to the noun your game uses.',
    },
  ],
};
