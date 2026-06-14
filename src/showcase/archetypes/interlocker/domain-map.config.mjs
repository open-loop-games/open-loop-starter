/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Spec'],
  title: 'Interlocker — domain language',
  description: 'Kittens Game first arc: a wide multi-resource graph with multi-input conversion chains and building-to-building synergy.',
  curated: [
    {
      term: 'the resource graph',
      note: 'Resources flow through crafts (multi-input recipes), gated by sciences, produced/consumed by buildings staffed by jobs. Megalith is the canonical multi-input craft.',
    },
    {
      term: 'Spec, not Def',
      note: "Interlocker's domain definitions use the -Spec suffix (ResourceSpec, BuildingSpec, JobSpec, ScienceSpec, CraftSpec).",
    },
  ],
}
