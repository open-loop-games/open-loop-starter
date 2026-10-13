/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Phase-shifter — domain language',
  description:
    'The one-way mechanic lifecycle: a short ladder of doors, each opened by hand once its record holds, each retiring the mechanisms before it. Night Clerk reads a box, pins a board, then replays a night until six alibis hold.',
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
      term: 'night',
      note: 'One replay of 18:00 to 06:00 in the model. What it turns up is unfiled until dawn, when it banks as contradictions.',
    },
    {
      term: 'fidelity',
      note: "The night model's multiplier: the square root of the board's lifetime leads over the door's threshold.",
    },
  ],
};
