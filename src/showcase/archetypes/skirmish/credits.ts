import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  { what: 'City and defense models', by: 'Kenney', url: 'https://www.kenney.nl', license: 'CC0' },
  {
    what: 'Crew figures and their animations',
    by: 'Kay Lousberg',
    url: 'https://www.kaylousberg.com',
    license: 'CC0',
  },
  {
    what: 'Kenney Future Square and Kenney High fonts',
    by: 'Kenney',
    url: 'https://www.kenney.nl',
    license: 'CC0',
  },
];
