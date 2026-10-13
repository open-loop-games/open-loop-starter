/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Phase-shifter — domain language',
  description:
    'The one-way mechanic lifecycle: a short ladder of doors, each opened by hand once its record holds, each retiring the mechanisms before it. Night Clerk reads a box, pins a board, stakes out a replayed night until six alibis hold, then reads one last page.',
  curated: [
    {
      term: 'door',
      note: 'The progress that moves the game to its next phase. Opened once, by hand, when its record holds; nothing closes it. The phase is the count of doors opened.',
    },
    {
      term: 'record',
      note: 'What a door reads: a quantity spending never lowers — pages read, lifetime leads, suspects cleared — so a door can never be priced out of reach.',
    },
    {
      term: 'mechanism',
      note: 'Anything the player meets: a verb, a hire, a producer, an automation. Each is live from the door that installs it until the door that retires it.',
    },
    {
      term: 'retired',
      note: 'A mechanism past its retiring door: its chains read zero and its buttons hide. It is filed away, stamped, and never comes back.',
    },
    {
      term: 'replaces',
      note: "A mechanism that takes over another one's role at the same door: the clerks read, then cross-reference, then file. Stamped REASSIGNED.",
    },
    {
      term: 'card',
      note: 'One sighting: a person, a place, an hour. The clerks write cards up from notes; the board pins them; the night watches where they point.',
    },
    {
      term: 'string',
      note: 'What runs between two neighbouring cards that share a fact. Its strength is the facts shared, and string earns leads.',
    },
    {
      term: 'watch',
      note: 'A place at an hour on the stakeout. A clerk posted there sees whoever the night puts there, or nobody.',
    },
    {
      term: 'hint',
      note: "A watch a pinned card points at: the board's hand-off to the night.",
    },
    {
      term: 'strain',
      note: "Empty watches in one night. Once it reaches what the roster can carry, the model breaks and the night's finds are lost.",
    },
    {
      term: 'alibi',
      note: 'What a suspect says they did. It holds once every hour of it has been seen; six holding open the last door.',
    },
  ],
};
