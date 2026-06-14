/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Producer — domain language',
  description: 'Click a thing, a number goes up, spend it on something that grows the number — pacing against a curve, the curve is the content.',
  curated: [
    {
      term: 'modifier stacking',
      note: 'The reward is the headline multiplier compounding base × upgrades × achievements × milestones — there is no story, the curve is the content.',
    },
    {
      term: 'upgrade kinds',
      note: 'UpgradeDef.kind ∈ {multiplier, cross-building-click-bonus} — the discriminator over the upgrade union.',
    },
  ],
}
