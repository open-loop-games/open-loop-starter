import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  {
    what: 'Chakra Petch font',
    by: 'The Chakra Petch Project Authors',
    url: 'https://github.com/m4rc1e/Chakra-Petch',
    license: 'SIL OFL 1.1',
  },
  {
    what: 'Barlow font',
    by: 'The Barlow Project Authors',
    url: 'https://github.com/jpt/barlow',
    license: 'SIL OFL 1.1',
  },
];
