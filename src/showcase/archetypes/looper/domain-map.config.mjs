/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Looper — domain language',
  description: 'A run is a rehearsal: actions queue against a draining budget, most state resets, a thin layer of mastery carries forward.',
  curated: [
    {
      term: 'loop',
      note: 'One run. The action queue replays each loop against a draining mana budget; when it empties the run ends.',
    },
    {
      term: 'progressVar vs regularVar',
      note: 'progressVar persists across loops (Wander-shape); regularVar is a per-loop pool whose total derives from progressVar levels.',
    },
    {
      term: 'stat tiers',
      note: 'A stat has two tiers — Level resets per loop, Talent persists across loops.',
    },
    {
      term: 'action types',
      note: 'ActionDef.type ∈ {progress, regular, basic} is a labelling convention over existing engine primitives, not new engine surface.',
    },
  ],
}
