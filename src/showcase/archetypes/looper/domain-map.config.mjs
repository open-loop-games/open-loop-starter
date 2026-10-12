/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Price', 'Prediction'],
  title: 'Looper — domain language',
  description:
    'The loop game: the player writes a plan, a night executes it against a draining budget, and a thin layer of mastery survives each reset. The game is the diff between two nights.',
  curated: [
    {
      term: 'night',
      note: 'One run. It ends on empty Nerve, on the freight, or on turning in, and the night module resets. Nothing a night carries survives it except mastery, Intel and the ground discovered.',
    },
    {
      term: 'Nerve',
      note: "The run budget: seconds of night left, drained by the night clock and refilled only by route content: coffee and the hamper inside, the milk truck past the wall. A refill is work spent to buy time, so it is counted inside a gate's fill.",
    },
    {
      term: 'plan',
      note: 'The authored policy: an ordered list of actions with repeat counts, executed top to bottom. It is the only player decision during play; an action the night cannot do is skipped, not waited on.',
    },
    {
      term: 'gate',
      note: 'An action that opens a landmark. Its duration is derived from the predicted capacity of the night it is scheduled to fall on, never authored.',
    },
    {
      term: 'talent',
      note: "A skill's in-night level, 1 + α·L. It resets with the night. Contrast mastery.",
    },
    {
      term: 'mastery',
      note: "The share of a night's talent level a skill banks at the night's end: linear to a knee, square root past it. It multiplies talent, so every later night starts faster.",
    },
    {
      term: 'splits',
      note: 'Night-seconds to each landmark. After the first escape the night ends on the freight, so splits — not depth — are what improves.',
    },
  ],
};
