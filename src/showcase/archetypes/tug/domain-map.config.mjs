/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Tug — domain language',
  description:
    'You and the opponent feed the same lane: units auto-walk, resolve combat on contact, and the front line drifts toward whoever is losing.',
  curated: [
    {
      term: 'shared lane',
      note: 'Both sides spend income to produce units into ONE lane; units auto-walk toward the enemy base and resolve combat without commands when streams meet.',
    },
    {
      term: 'counter matrix',
      note: 'UnitArchetypeTag drives the counter-type matrix; the decision space is composition + send-timing + counter-reading, not APM.',
    },
  ],
};
