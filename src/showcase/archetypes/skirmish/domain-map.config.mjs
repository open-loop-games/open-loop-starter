/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Skirmish — domain language',
  description:
    'Chrome & Cantrip: a shadow crew and a rival outfit fight over three districts of a sprawl where the ley lines have woken. Hustlers earn scrip, ley taps draw aether, training floors turn both into four kinds of unit, and the crew that burns the other’s safehouse takes the contract.',
  curated: [
    {
      term: 'match',
      note: 'One run against one contract: from the briefing to a burned safehouse. Starting the next resets both seats and the districts, never the career.',
    },
    {
      term: 'seat',
      note: 'One side of a match: the player’s crew or the rival. Both play the same policy; the rival through its persona, the player through hired lieutenants or by hand.',
    },
    {
      term: 'contract',
      note: 'A rival outfit to beat: its persona, its income terms and its briefing. The career fights them in order.',
    },
    {
      term: 'persona',
      note: 'A parameter bundle the one shared policy reads: production mix, how hard it counters, payback horizon, research order, when it assaults and when it pulls back.',
    },
    {
      term: 'hustler',
      note: 'A worker producer: one scrip a second, at a geometric price. The economy grows by hiring them until one no longer pays back inside the horizon.',
    },
    {
      term: 'ley tap',
      note: 'A producer of aether, the second input hexers, riggers and enforcers are trained from.',
    },
    {
      term: 'turf',
      note: 'Income from districts held outright: one producer whose count is the districts a seat holds.',
    },
    {
      term: 'training floor',
      note: 'A converter that turns scrip and aether into one unit kind, while its switch is on and the bunks have room.',
    },
    {
      term: 'bunks',
      note: 'The supply cap: one bag holding every unit a seat has, at home and in the districts. Coffin squats raise it.',
    },
    {
      term: 'district',
      note: 'One of three places between the safehouses. Control drifts toward the side present in it; a side that holds it outright earns turf and may assault from it.',
    },
    {
      term: 'squad',
      note: 'A seat’s units standing in one district, by kind. Units at home are the reserve and hold the gates.',
    },
    {
      term: 'assault',
      note: 'An order on a held, uncontested district: its squad fires on the rival safehouse while the safehouse turret fires back.',
    },
    {
      term: 'focus',
      note: 'Where a squad’s fire goes: on one kind if it stands in the district, else spread by count.',
    },
    {
      term: 'pairing',
      note: 'The attack kind × body kind table every hit is read through: razors cut flesh, hexers fry drones, riggers brick chrome, and each reverse cell resists.',
    },
    {
      term: 'astral scout',
      note: 'A paid reveal: every district and the rival safehouse are seen for a while, then fog returns with each sighting kept at its age.',
    },
    {
      term: 'lieutenant',
      note: 'The player’s automation, one per automation tier: the fixer plays the economy, the quartermaster builds and researches, the tactician commands. Each has a switch.',
    },
  ],
};
