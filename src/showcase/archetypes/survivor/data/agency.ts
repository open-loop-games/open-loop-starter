// ─── Skeleton ───
// The agency: what clout buys between takes. Each perk multiplies one modifier chain the
// rewrite perks also feed, so a quantity has one stack whoever raised it.

import { AGENCY_ANCHORS, AGENCY_STEP, agencyBaseCost, type AgencyAnchor } from './spine';

/** The modifier chains a take reads: one a quantity. */
export type ChainId = 'damage' | 'fireRate' | 'maxHp' | 'moveSpeed' | 'pickup';

export interface AgencyDef {
  id: AgencyAnchor['id'];
  name: string;
  blurb: string;
  baseCost: number;
  maxLevel: number;
  /** The chain this perk multiplies, and by how much a level. */
  chain?: ChainId;
  step?: number;
}

const AGENCY_TEXT: Record<AgencyAnchor['id'], { name: string; blurb: string; chain?: ChainId }> = {
  'effects-budget': {
    name: 'Effects Budget',
    blurb: 'Bigger charges on every rig.',
    chain: 'damage',
  },
  padding: { name: 'Padding', blurb: 'Hidden pads under the costume.', chain: 'maxHp' },
  cardio: { name: 'Personal Trainer', blurb: 'You arrive on set faster.', chain: 'moveSpeed' },
  'boom-mic': { name: 'Sound Guy', blurb: 'Reels drift to you from further out.', chain: 'pickup' },
  'script-doctor': { name: 'Script Doctor', blurb: 'Every rewrite offers a fourth page.' },
};

// ─── Balance ───
// Prices come from the spine: the first level costs `takesForFirst` full takes, and each
// level costs AGENCY_GROWTH times the last, solved so the whole shop costs `shopTakes` takes.

export const AGENCY: readonly AgencyDef[] = AGENCY_ANCHORS.map((a) => {
  const text = AGENCY_TEXT[a.id];
  return {
    id: a.id,
    name: text.name,
    blurb: text.blurb,
    baseCost: agencyBaseCost(a),
    maxLevel: a.maxLevel,
    chain: text.chain,
    step: (AGENCY_STEP as Record<string, number>)[a.id],
  };
});
