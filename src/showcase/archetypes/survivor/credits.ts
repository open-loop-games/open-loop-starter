import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  { what: 'Cast and crowd figures', by: 'Kenney', url: 'https://www.kenney.nl', license: 'CC0' },
  {
    what: 'Pixel Art Assets',
    by: 'Will Tice / unTied Games',
    url: 'https://untiedgames.itch.io',
    license: 'Purchased license',
  },
];
