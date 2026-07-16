import { settingsModule } from './settings';
import { uiPrefsModule } from './ui-prefs';

export const sharedBase = [settingsModule, uiPrefsModule];
