import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  { what: 'Old Standard font', by: 'The Old Standard Project Authors', license: 'SIL OFL 1.1' },
  {
    what: 'Barlow Semi Condensed font',
    by: 'The Barlow Project Authors',
    url: 'https://github.com/jpt/barlow',
    license: 'SIL OFL 1.1',
  },
];
