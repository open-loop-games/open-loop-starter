/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Balance'],
  title: 'Survivor — domain language',
  description:
    'A containment breach on a scrolling floor. Two geometric curves race: device DPS compounds through the draft, specimen HP and annulus density compound on minute marks. Income is a risk transaction — kills land at the edge of the kill radius, motes land where the specimen died, and the collect radius is smaller — so how much threat a seat chooses to meet is an economic term, not a survival tactic.',
  curated: [
    {
      term: 'mote',
      note: 'The XP a specimen drops where it dies. Motes PERSIST, so the floor behind the operator accumulates uncollected income and deferring collection is a coherent gamble paid for against the beat schedule.',
    },
    {
      term: 'η',
      note: 'Collection efficiency — motes banked over motes dropped. A POLICY output, never predicted by the closed form, which is why the probe reports measured against assumed: a run that misses its schedule is either badly balanced or badly piloted, and nothing else separates those.',
    },
    {
      term: 'the orbit',
      note: 'The distance from the nearest specimen a seat tries to hold — inside the kill radius, outside contact. Dancing on the edge. A high-engage seat orbits closer, banks more, and eats more contact; the single number that makes a seat’s movement policy differ.',
    },
    {
      term: 'the annulus',
      note: 'Spawns only appear in a ring around the operator, so threat is always local and always escapable. That is what makes disengagement possible — and what makes it cost everything, since distance is zero damage and zero income.',
    },
    {
      term: 'beat',
      note: 'A draft. Fires on banked motes rather than on the clock, against a ladder DERIVED so the authored 30–90s schedule lands under expected income. Never authored beside the schedule it is meant to satisfy.',
    },
    {
      term: 'seat',
      note: 'A personality: simultaneously the character-select roster, the AI policy bundle driving the operator, and the balance sweep axis. Bundles a movement bias (engage, η) and a draft bias (defenseShare), never a stat block.',
    },
    {
      term: 'σ / defenseShare',
      note: 'The share of draft picks a seat spends on survivability — this archetype’s guns-versus-butter term. Picks spent defensively are picks not spent on DPS, so σ feeds back into what each remaining offensive pick must deliver to hold time-to-kill flat.',
    },
    {
      term: 'collector',
      note: 'A rare drop that pulls every mote on screen. One or two a run, signposted by an edge arrow — which is what turns routing to one through your own uncollected field into a decision. Amortized into the ladder derivation, never modelled as a point impulse.',
    },
    {
      term: 'traversal collapse',
      note: 'The loss condition density produces: no gap wide enough to move through, and carving one needs the DPS a disengaged run never built. Reachability over a crowding threshold, not distance.',
    },
    {
      term: 'notes',
      note: 'The cross-run currency. A continuous accumulator — notes bank on EVERY run end including death, which is what makes a failed run progress rather than a wasted one.',
    },
  ],
};
