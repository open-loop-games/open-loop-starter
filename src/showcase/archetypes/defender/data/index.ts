import type { DefenderData } from './types';
import { TOWERS } from './towers';
import { BLOONS } from './bloons';
import { WAVES } from './waves';
import { ECONOMY } from './economy';
import { PATH } from './path';

export * from './types';
export { TOWERS } from './towers';
export { BLOONS } from './bloons';
export { WAVES } from './waves';
export { ECONOMY } from './economy';
export { PATH } from './path';

export const DEFAULT_DEFENDER_DATA: DefenderData = {
  towers: TOWERS,
  bloons: BLOONS,
  waves: WAVES,
  economy: ECONOMY,
  path: PATH,
};
