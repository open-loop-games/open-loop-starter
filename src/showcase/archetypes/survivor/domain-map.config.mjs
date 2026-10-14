/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Kind'],
  title: 'Survivor — domain language',
  description:
    'One More Take: the stunt double on an action set that never wraps. Extras pour onto the soundstage, the effects crew fires the rigs on their own clocks, and the double only chooses where to stand. Two geometric curves race: rig damage compounds through the rewrites, extra hp and arrivals compound scene by scene.',
  curated: [
    {
      term: 'take',
      note: 'One run: from Action! to CUT when the lead falls, a wipeout, or the strike. Whatever the end, the reels banked pay clout.',
    },
    {
      term: 'scene',
      note: 'The opposition’s content ordinal: it advances once a minute, and a rating starts the take deeper into it.',
    },
    {
      term: 'extra',
      note: 'A body on the floor. Its hp is a factor on the scene’s; a downed extra drops a reel where it fell.',
    },
    {
      term: 'rig',
      note: 'An auto-firing effect the double wears: up to four, each a shape that asks a different place to stand. Fires on its own clock and holds at ready while nothing qualifies.',
    },
    {
      term: 'reel',
      note: 'What a downed extra drops. Reels stay on the floor until walked over; banked reels fill the rewrite bar and pay clout at the wrap.',
    },
    {
      term: 'rewrite',
      note: 'The offered draft: the writers’ pages at each level of the reel ladder. Take one; the rest go in the bin for this offer only.',
    },
    {
      term: 'the shot',
      note: 'A camera frame that drifts round the double. An extra downed inside it drops a gold reel worth double.',
    },
    {
      term: 'rating',
      note: 'The take’s danger, chosen at the call sheet: G, PG, PG-13, R. Each starts deeper into the scene curve, stages more and pays more; it opens once enough stars have wrapped the one below.',
    },
    {
      term: 'the climax',
      note: 'Seven minutes into a take: the set clears and the rating’s lead walks on. The scene keeps stepping while the lead stands.',
    },
    {
      term: 'lead',
      note: 'The rating’s staged villain. The take is in the can only when it falls. R’s lead, the Big Bad, wraps the picture.',
    },
    {
      term: 'strike crew',
      note: 'The sweeper: three minutes after the climax it walks on, cannot be downed, and a touch ends the take as struck.',
    },
    {
      term: 'chalk mark',
      note: 'A ring on the floor. Kills inside it fill it, and each filled mark cuts the lead’s hp by a quarter.',
    },
    {
      term: 'set piece',
      note: 'A staged formation rolled into a minute of the take: a stampede, the charge (a wall with a gap), or a ring that surrounds the double. A harsher rating stages more.',
    },
    {
      term: 'guest star',
      note: 'A guest event rolled into a minute: a rival who walks at the scene’s end with its jackpot unless downed first, or a crowd call that brings a wave at once.',
    },
    {
      term: 'ledger',
      note: 'Each star’s harshest rating wrapped. The ratings’ gates read it, so R needs more than one star.',
    },
    {
      term: 'clout',
      note: 'The currency between takes, paid by every take, a wipeout included. It buys agency perks and signs stars.',
    },
    {
      term: 'agency',
      note: 'The perks clout buys. Each multiplies one chain the rewrite perks also feed.',
    },
    {
      term: 'star',
      note: 'The character select: a body (opening rig, health, speed) and an instinct, the policy parameters the shipping movement and draft policies read when the star improvises.',
    },
    {
      term: 'driver',
      note: 'Who calls the moves in a take: the player (input and picked pages) or the star’s instinct. The mechanics are the same either way.',
    },
    {
      term: 'η',
      note: 'Reels banked over reels dropped. A driver output: the spine assumes it, the probes measure it.',
    },
    {
      term: 'the orbit',
      note: 'The distance from the nearest extra an improvising star tries to hold: inside the loadout’s reach, outside contact, pulled in by its engage.',
    },
  ],
};
