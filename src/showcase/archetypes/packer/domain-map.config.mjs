/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Packer — domain language',
  description:
    "A frigate's hull lattice, plated out section by section, where every module's firepower comes from the modules around it. Salvage from the fitted board buys modules, plating and refits.",
  curated: [
    {
      term: 'relation',
      note: "The neighbour set a module's effect reaches over the lattice: edge-adjacent, corner-adjacent, or a knight's move. A weapon's relation is none; it only receives.",
    },
    {
      term: 'link',
      note: "A booster's term on a weapon it reaches. Links sum into one family; a Coolant Manifold amplifies the links of the boosters beside it.",
    },
    {
      term: 'stamp',
      note: "An Arc Beacon's term on a weapon a knight's move away. Stamps sum into their own family, which multiplies the link family.",
    },
    {
      term: 'bay',
      note: 'Modules fabricated and not fitted: a type’s fabricated count minus its modules on the board. Fitting draws from it; lifting or stowing returns to it.',
    },
    {
      term: 'section',
      note: 'A block of hull cells plated in authored order. The corvette core is section 0 and always open; plating the next section opens its cells to fitting.',
    },
    {
      term: 'refit',
      note: 'A one-time purchase that multiplies every weapon through the firepower chain, leaving the layout unchanged.',
    },
    {
      term: 'packing',
      note: "A stage's best arrangement: what it fires and the modules it fields. The packing probe measures each stage's on the shipping evaluator, and the spine solves every price from them.",
    },
    {
      term: 'stage',
      note: "The board between two beats: its open cells, the types unlocked and the refits held. The spine's income is constant within a stage, at the rate of the stage's best packing.",
    },
  ],
};
