import {
  persistent,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';

export interface UIPrefsState {
  bulkMode: Persistent<string>;
}

export const UIPrefsKey: InjectionKey<UIPrefsState> = Symbol(
  'ui-prefs',
) as InjectionKey<UIPrefsState>;

export const uiPrefsModule: EngineModule = {
  id: 'ui-prefs',
  install(ctx) {
    const bulkMode = persistent<string>('1', { id: 'bulkMode' });
    ctx.provide(UIPrefsKey, { bulkMode });
  },
};
