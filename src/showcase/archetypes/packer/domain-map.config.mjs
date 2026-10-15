/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Packer — domain language',
  description:
    "Three ships' hull lattices, each plated out section by section, where every module's firepower comes from the modules around it. Salvage from the fitted board buys modules, plating and refits; the board's firepower downs the carriers that hold the breach line, and each ship's last carrier opens the next ship.",
  curated: [
    {
      term: 'relation',
      note: "The cells a module's effect reaches over the lattice: edge-adjacent, corner-adjacent, a knight's move, or a ray down the line a Fire Director faces. A weapon's relation is none; it only receives.",
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
      term: 'yield',
      note: "A Salvage Tractor's term on an edge-adjacent weapon. Yields sum into their own family, which multiplies the weapon's salvage and leaves its firepower.",
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
      term: 'ship',
      note: 'One of three hulls the story is played on, each with its own lattice, sections, refits and carriers. Recommissioning into the next ship clears the yard and the board.',
    },
    {
      term: 'act',
      note: "One of a ship's two halves: the beats it schedules and the gap ladder they sit on. A ship's second act plates the extended hull.",
    },
    {
      term: 'sector',
      note: 'A stretch of the breach line, held by one carrier. While it holds, its conditions rewrite the board; when it falls, the next sector opens and its conditions take over.',
    },
    {
      term: 'condition',
      note: "What a sector brings: one relation rewritten while it holds, such as an ion storm darkening corner links. The next sector's conditions are announced ahead.",
    },
    {
      term: 'carrier',
      note: 'The enemy holding a sector. An engagement fires the board at its hull for one window; it falls or withdraws. A carrier past a ship’s last authored one is raised with a harder hull.',
    },
    {
      term: 'honour',
      note: 'What a fallen carrier pays: a permanent multiplier on every weapon, kept across every ship.',
    },
    {
      term: 'calibration',
      note: 'A repeatable refit once the breach line opens: every weapon hits harder, each level priced above the last. The salvage sink when a carrier holds and nothing else is left to buy.',
    },
    {
      term: 'grant',
      note: "The salvage a ship after the first is commissioned with: enough to buy its opening fit. It counts toward the ship's gates.",
    },
    {
      term: 'packing',
      note: "A stage's best arrangement: what it fires and the modules it fields. The packing probe measures each stage's on the shipping evaluator, and the spine solves every price from them.",
    },
    {
      term: 'stage',
      note: "The board between two events: its ship, open cells, types unlocked, refits held, honours and conditions. The spine's income is constant within a stage, at the rate of the stage's best packing.",
    },
  ],
};
