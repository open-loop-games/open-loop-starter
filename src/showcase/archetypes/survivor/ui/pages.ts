/** How a rewrite page reads, typed as a screenplay page: one shape for the modal and the slip. */
import { PERK_BY_ID, RIG_BY_ID } from '../data';
import type { Card } from '../modules/sim/draft';

export interface Page {
  slug: string;
  heading: string;
  action: string;
  cont: string;
  /** A rig or perk the take has not had before. */
  isNew: boolean;
}

export function pageOf(c: Card): Page {
  switch (c.kind) {
    case 'rig-new': {
      const r = RIG_BY_ID[c.rig];
      return {
        slug: 'NEW RIG',
        heading: r.name,
        action: r.blurb,
        cont: 'ENTERS — LV 1',
        isNew: true,
      };
    }
    case 'rig-level': {
      const r = RIG_BY_ID[c.rig];
      return {
        slug: 'BIGGER GAG',
        heading: r.name,
        action: r.blurb,
        cont: `(CONT'D) LV ${c.toLevel - 1} → ${c.toLevel}`,
        isNew: false,
      };
    }
    case 'perk': {
      const p = PERK_BY_ID[c.perk];
      return {
        slug: 'NOTE FROM THE DIRECTOR',
        heading: p.name,
        action: p.blurb,
        cont: `x${c.toStack}`,
        isNew: c.toStack === 1,
      };
    }
    case 'craft-service':
      return {
        slug: 'CRAFT SERVICE',
        heading: 'Coffee and a sandwich',
        action: 'Restores some stamina. The writers are out of pages.',
        cont: '',
        isNew: false,
      };
  }
}
