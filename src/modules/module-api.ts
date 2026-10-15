import { getCurrentScope, onScopeDispose } from 'vue';
import type { EngineContext, InjectionKey } from '@open-loop/engine';

/**
 * A module's published API on both surfaces: the engine's `ctx.provide` and a
 * module-scope getter that works outside a component setup.
 */
export interface ModuleApi<T> {
  /** Call in `install()`: provides `api` under the key and makes it what `get()` returns. */
  publish(ctx: EngineContext, api: T): void;
  /**
   * The API the newest live engine published. Throws when no live engine has.
   * Two live engines can share a page: the balance workbench boots headless
   * ones over the game's own modules.
   */
  get(): T;
}

/**
 * Create the published API for one module.
 *
 * @param key - the module's injection key; its description names the module in errors.
 * @returns the pair the module uses: `publish` in `install()`, `get` as its getter.
 * @example
 * const core = createModuleApi(CoreKey);
 * export const getCore = core.get;
 * // in install(ctx): core.publish(ctx, { amount, ratePerSecond });
 */
export function createModuleApi<T>(key: InjectionKey<T>): ModuleApi<T> {
  const label = key.description ?? 'module';
  const published: T[] = [];

  return {
    publish(ctx, api) {
      ctx.provide(key, api);
      published.push(api);
      // The engine runs install() in an effect scope it stops on dispose, so a
      // disposed engine withdraws its API and the getter falls back to the one
      // before it.
      if (getCurrentScope()) {
        onScopeDispose(() => {
          published.splice(published.lastIndexOf(api), 1);
        });
      }
    },
    get() {
      if (published.length === 0) {
        throw new Error(`[${label}] API read before an engine installed it`);
      }
      return published[published.length - 1]!;
    },
  };
}
