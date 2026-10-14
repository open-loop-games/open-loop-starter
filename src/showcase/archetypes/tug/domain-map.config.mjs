/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Tug — domain language',
  description:
    'Hold the Causeway: Fairhold and a neighbouring lord’s keep face each other across a causeway one road wide. Squads wait in each bailey until its horn, march out in ranks and meet at a line that sways; the Chronicle carries renown and boons up a ladder of five lords.',
  curated: [
    {
      term: 'battle',
      note: 'One run: from the toss to a fallen gate. Starting the next resets both keeps and the causeway, never the Chronicle.',
    },
    {
      term: 'keep',
      note: 'One side: Fairhold (the player’s) or the lord’s. Its harvest pays silver at a flat rate; ground held on the causeway pays nothing.',
    },
    {
      term: 'causeway',
      note: 'The one road between the two gates, three files wide. Fairhold’s half is the Homeward Road; the lord’s is the Heathen Mile.',
    },
    {
      term: 'squad',
      note: 'What one purchase raises: five yeomen, three bowmen, two knights or one mangonel. Its members share the squad’s hp and damage.',
    },
    {
      term: 'bailey',
      note: 'Where raised squads wait for their keep’s horn.',
    },
    {
      term: 'horn',
      note: 'A keep’s release: the bailey empties onto the causeway in ranks. Both keeps sound the opening horn together; after it the horns alternate, the toss deciding who leads.',
    },
    {
      term: 'line',
      note: 'Where the two fronts meet. It sways with each release and with which troop stands at the front.',
    },
    {
      term: 'cover',
      note: 'The ramparts’ reach: a defender takes less damage the deeper it stands in its own half, none at the middle. A mangonel ignores it.',
    },
    {
      term: 'charge',
      note: 'A knight with bowmen in sight rides past whatever stands between and strikes them.',
    },
    {
      term: 'gate',
      note: 'A keep’s hp. Troops with nothing ahead batter it every second; a mangonel batters it hardest and must close to it. The gatehouse bows shoot the nearest attacker.',
    },
    {
      term: 'tithe',
      note: 'The in-battle income ladder: each raise adds a quarter of the base harvest, at an escalating price.',
    },
    {
      term: 'last week',
      note: 'The end of the campaign season: past it, every blow doubles every thirty seconds, so a stable line breaks.',
    },
    {
      term: 'renown',
      note: 'The career currency, paid by every battle (a defeat pays a share). It fills the Chronicle’s volumes.',
    },
    {
      term: 'boon',
      note: 'A Boon of the Crown: one a volume. Strength boons grow Fairhold’s harvest, its troops or its gate; the Charter of the Longbow opens the bowmen.',
    },
    {
      term: 'temperament',
      note: 'How a lord composes its waves: a param bundle over the one decision function. Behaviour only; difficulty comes from the rung.',
    },
    {
      term: 'rung',
      note: 'Lords beaten: the scaled-opposition index. The lord’s harvest grows by one boon level a rung.',
    },
  ],
};
