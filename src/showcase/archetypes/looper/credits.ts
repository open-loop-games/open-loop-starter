import type { GameCredit } from '@/ui/components/CreditList.vue';

/** The sourced assets this game ships, credited in its About popover. */
export const credits: GameCredit[] = [
  { what: 'Kenney Future Narrow font', by: 'Kenney', url: 'https://www.kenney.nl', license: 'CC0' },
  {
    what: 'Noto Serif SemiCondensed font',
    by: 'The Noto Project Authors',
    url: 'https://github.com/notofonts/latin-greek-cyrillic',
    license: 'SIL OFL 1.1',
  },
];
