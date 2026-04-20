import { settingsModule } from './settings';
import { uiRegistryModule } from './ui-registry';

export const sharedBase = [settingsModule, uiRegistryModule];
