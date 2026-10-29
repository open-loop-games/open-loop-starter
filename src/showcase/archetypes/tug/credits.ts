import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  { what: 'IM Fell English font', by: 'Igino Marini', license: 'SIL OFL 1.1' },
  {
    what: 'EB Garamond font',
    by: 'The EB Garamond Project Authors',
    url: 'https://github.com/octaviopardo/EBGaramond12',
    license: 'SIL OFL 1.1',
  },
];
