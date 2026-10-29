import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  {
    what: 'Libre Baskerville font',
    by: 'The Libre Baskerville Project Authors',
    url: 'https://github.com/impallari/Libre-Baskerville',
    license: 'SIL OFL 1.1',
  },
  {
    what: 'Alegreya font',
    by: 'The Alegreya Project Authors',
    url: 'https://github.com/huertatipografica/Alegreya',
    license: 'SIL OFL 1.1',
  },
];
