import type { EngineModule } from 'open-loop-engine';
import { gatheringModule } from './gathering';
import { progressionModule } from './progression';
import { economyModule } from './economy';

export const villageGathererModule: EngineModule[] = [
  gatheringModule,
  progressionModule,
  economyModule,
];
