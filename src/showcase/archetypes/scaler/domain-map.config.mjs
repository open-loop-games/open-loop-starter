/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Scaler — domain language',
  description:
    'Paragon: a hero ladder under two prestige layers told as a comic, with Elseworlds as the graded run inside the first layer, Legends on lifetime Justice, and no click and no RNG.',
  curated: [
    {
      term: 'hero tier',
      note: 'A producer tier of the corps: each unit earns Justice every second. A tier shows once the one below is staffed.',
    },
    {
      term: 'Reboot the Timeline',
      note: 'The first prestige layer: wipes the run and banks Legacy, a cube root of Justice earned this timeline. The issue number counts Reboots.',
    },
    {
      term: 'Legacy',
      note: 'The first layer’s currency. Legacy earned since the last Rewrite multiplies every hero, bent to √ past the knee; spending it never costs the bonus.',
    },
    {
      term: 'Rewrite the Multiverse',
      note: 'The second prestige layer: wipes the run and Legacy with its shop, and banks Continuity, a square root of Legacy earned. The volume number counts Rewrites.',
    },
    {
      term: 'Continuity',
      note: 'The second layer’s currency. Continuity ever earned multiplies the corps; nothing resets it.',
    },
    {
      term: 'Elseworld',
      note: 'A timeline under a worse rule, entered by a Reboot. Reaching its goal before the next Reboot makes its reward permanent. Distinct from the Rewrite: an Elseworld wipes only the run.',
    },
    {
      term: 'Legend',
      note: 'An achievement on lifetime Justice; each multiplies every hero, and no reset takes it back.',
    },
    {
      term: 'Dispatch Desk',
      note: 'The first automation tier: recruits by blended payback, and saves for a dearer tier when that pays sooner.',
    },
    {
      term: 'Succession Plan',
      note: 'The second automation tier: reboots once pending Legacy reaches a share of Legacy earned, never inside an Elseworld.',
    },
    {
      term: 'Eternal Dispatch',
      note: 'A Continuity upgrade that keeps the Dispatch Desk and Elseworld Protocols through a Rewrite: the conditional keep-set.',
    },
  ],
};
