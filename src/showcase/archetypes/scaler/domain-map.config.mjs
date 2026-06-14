/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Scaler — domain language',
  description: 'Producer shape plus stacked prestige layers: each ascension resets the layer below and grants a new currency and multiplier.',
  curated: [
    {
      term: 'prestige layers',
      note: 'Tier ∈ {coin, prestige, transcend}. Each layer resets the one below it and grants a new currency + an upgrade tree + a multiplier.',
    },
    {
      term: 'challenge',
      note: 'A voluntary nerf run taken inside the outer prestige loop ("production halved", "no upgrades") for a permanent stacking bonus.',
    },
  ],
}
