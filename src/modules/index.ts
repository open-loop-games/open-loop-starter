import type { EngineModule } from 'open-loop-engine';
import { settingsModule } from './settings';
import { demoModule } from './demo';

export const allModules: EngineModule[] = [settingsModule, demoModule];
