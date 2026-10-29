import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  {
    what: 'Shippori Mincho font',
    by: 'The Shippori Mincho Project Authors',
    url: 'https://github.com/fontdasu/ShipporiMincho',
    license: 'SIL OFL 1.1',
  },
  {
    what: 'Spectral font',
    by: 'The Spectral Project Authors',
    url: 'https://github.com/productiontype/Spectral',
    license: 'SIL OFL 1.1',
  },
];
