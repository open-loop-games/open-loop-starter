/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Prediction', 'Plan'],
  title: 'Interlocker — domain language',
  description:
    'A wide production graph: raw buildings feed four workshops that turn stock into spars, aluminium, engines and aeroplanes, opened by patents, staffed by a fixed headcount of compagnons, fed with bread by the season, powered by steam and capped by bins. An Exposition turns what the works hold and what the Ministry has bought into a medal of renown, and clears the works.',
  curated: [
    {
      term: 'raw-equivalent',
      note: "The economy's unit of value: one raw building's second of output. A worked good is worth the raw units its recipe walks down to, steam at the coal it burns (spar 2, aluminium 3, engine 12, aeroplane 27.5); prices, bins, orders and the jury's score are sized in it.",
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
      note: 'What held a workshop back on the last tick: locked, unstaffed, labour (crew-bound), an input it is short of, steam, storage (its output bin is full) or hunger. The Works schematic paints it.',
    },
    {
      term: 'Exposition',
      note: 'The prestige: once the jury sits, staging it turns the score into a medal of renown and clears the works. It needs the threshold of aeroplanes in the hangar. A run is the time between two Expositions.',
    },
    {
      term: 'charter',
      note: 'An imperial grant bought with renown, kept across every Exposition. The Patent Pool keeps the four founding patents through the reset.',
    },
    {
      term: 'medal',
      note: 'The renown an Exposition pays: floor(2·√(score / SCORE_UNIT)), so each step costs more score than the last. The score is the raw-equivalent of the worked goods held, plus the dossier. The Grand Prix is the medal that ends the story.',
    },
    {
      term: 'order',
      note: 'A Ministry of War order: one to three worked goods, all orders worth the same, filled in consignments before it lapses. A completed order goes into the dossier, which the jury scores and no bin caps.',
    },
    {
      term: 'season',
      note: "A quarter of the works' year on the play clock, one bin's fill long. The gardens yield by the season and its weather; winter is what the larder must carry.",
    },
    {
      term: 'steam',
      note: 'What Boiler Houses raise from coal for the engine shop, the rigging hall and the rolling mill. When it falls short, the shed order says which draw goes without.',
    },
    {
      term: 'bureau',
      note: "One of the foreman's three offices, bought with renown once every charter is held. Each unlocks an automation tier: seating, the estate or the Académie.",
    },
  ],
};
