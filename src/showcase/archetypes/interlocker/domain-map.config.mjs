/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Prediction', 'Plan'],
  title: 'Interlocker — domain language',
  description:
    'A wide production graph: raw buildings feed four workshops that turn stock into spars, aluminium, engines and aeroplanes, opened by patents, staffed by a fixed headcount of compagnons, fed with bread and capped by bins. An Exposition turns the hangar into renown and clears the works.',
  curated: [
    {
      term: 'raw-equivalent',
      note: "The economy's unit of value: one raw building's second of output. A worked good is worth the raw units its recipe walks down to (spar 2, aluminium 3, engine 11, aeroplane 25); prices and bins are sized in it.",
    },
    {
      term: 'trade',
      note: 'One of the four workshops a compagnon can be seated at: sawyer, smelter, machinist, rigger. A trade opens with its patent and runs at its role rate per compagnon seated.',
    },
    {
      term: 'bin',
      note: "A stock's storage capacity. Overflow is lost; bonded warehouses and the Crédit Mobilier widen every bin. The hangar is the aeroplanes' bin, and the Exposition's throttle.",
    },
    {
      term: 'limit',
      note: 'What held a workshop back on the last tick: locked, unstaffed, labour (crew-bound), an input it is short of, storage (its output bin is full) or hunger. The Works schematic paints it.',
    },
    {
      term: 'Exposition',
      note: 'The prestige: staging it turns the aeroplanes in the hangar into renown and clears the works. A run is the time between two Expositions.',
    },
    {
      term: 'charter',
      note: 'An imperial grant bought with renown, kept across every Exposition. The Patent Pool keeps the four founding patents through the reset.',
    },
  ],
};
