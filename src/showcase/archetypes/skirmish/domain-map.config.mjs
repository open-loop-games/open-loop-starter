/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Balance'],
  title: 'Skirmish — domain language',
  description:
    'N factions each fund an army from a compounding economy and contest one continuous field in real time; nothing survives from one match to the next.',
  curated: [
    {
      term: 'split',
      note: 'The fraction φ of income a faction reinvests in its economy, which compounds; the rest, 1 − φ, buys army, which is consumed. The economic decision is a split, not a curve.',
    },
    {
      term: 'persona',
      note: 'A keyed behavioural variant an AI opponent is drawn from at match creation (PersonaDef): its split and its targeting weights. A persona matchup is a design object of its own.',
    },
    {
      term: 'counter matrix',
      note: 'UnitArchetypeTag × UnitArchetypeTag damage multipliers. Composition against a rival reads through it, so who to build depends on what the rivals build.',
    },
  ],
};
