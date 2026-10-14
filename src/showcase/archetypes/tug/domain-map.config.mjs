/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Tug — domain language',
  description:
    'Hold the Causeway: Fairhold and a neighbouring lord’s keep face each other across a causeway one road wide. Squads wait in each bailey until its horn, march out in ranks and meet at a line that sways; the Chronicle carries renown and boons up a march of fifteen fields, three for each of five lords.',
  curated: [
    {
      term: 'battle',
      note: 'One run: from the toss to a fallen gate or the season’s close. Starting the next resets both keeps and the causeway, never the Chronicle.',
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
      note: 'A keep’s hp. A troop with nothing ahead batters it; a mangonel throws at it from sixty paces over any line. The gatehouse bows shoot the nearest attacker.',
    },
    {
      term: 'tithe',
      note: 'The in-battle income ladder: each raise adds a quarter of the base harvest, at an escalating price.',
    },
    {
      term: 'last week',
      note: 'The end of the campaign season: harvests and musters surge ×2, then ×3. When it ends the season closes, and the keep whose gate lost the larger share yields.',
    },
    {
      term: 'renown',
      note: 'The career currency, paid by every battle (a defeat pays a share). It fills the Chronicle’s volumes.',
    },
    {
      term: 'boon',
      note: 'A Boon of the Crown: one a volume. Strength boons grow Fairhold’s harvest, its troops or its gate, without limit; a weapon boon opens a kind for the walls.',
    },
    {
      term: 'temperament',
      note: 'How a lord composes its waves: a param bundle over the one decision function, with a spend profile over the battle, an early horn or not, and the weapon on its walls. Behaviour only; difficulty comes from the rung.',
    },
    {
      term: 'rung',
      note: 'Fields taken on the march: the scaled-opposition index. The lord’s men grow in grit and blows by a share of a boon level a field.',
    },
    {
      term: 'field',
      note: 'One battle row of the march: which troops either keep may raise, the fords and stakes across the causeway, the lord’s purse, and on a keep field the champions who ride out.',
    },
    {
      term: 'ford',
      note: 'A band of the causeway where every man walks slower.',
    },
    {
      term: 'stakes',
      note: 'A band of the causeway where a knight walks slower and cannot charge.',
    },
    {
      term: 'champion',
      note: 'A lord’s named rider: one member many times as hard as its troop, out of the lord’s gate at a set second.',
    },
    {
      term: 'twist',
      note: 'One condition a battle, drawn in camp: weather, calendar or camp. It acts on both keeps alike.',
    },
    {
      term: 'keep weapon',
      note: 'An engine on the walls, charged over the battle and fired by its keep: the trebuchet’s stone on the foremost ranks, or fire-pots on the nearest engine in throw.',
    },
    {
      term: 'early horn',
      note: 'A keep sounds its horn before its time, for half the silver the waiting seconds would pay; its schedule restarts from it.',
    },
  ],
};
