/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Spec'],
  title: 'Defender — domain language',
  description: 'Bloons TD first arc: bloons walk a fixed path, towers auto-fire from a fixed roster, coverage composition under cost pressure.',
  curated: [
    {
      term: 'wave vs wave-stream',
      note: 'A WaveDef is a round; a WaveStreamSpec is the temporal spawn schedule of bloons within that round.',
    },
    {
      term: 'coverage, not adjacency',
      note: 'Towers have area-of-effect but no neighbour-bonus structure — this is Threat-Range Coverage, NOT Placement-Adjacency.',
    },
  ],
}
