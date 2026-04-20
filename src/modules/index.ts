import { settingsModule } from './settings';
import { uiPrefsModule } from './ui-prefs';
import { uiRegistryModule } from './ui-registry';

export const sharedBase = [settingsModule, uiPrefsModule, uiRegistryModule];
