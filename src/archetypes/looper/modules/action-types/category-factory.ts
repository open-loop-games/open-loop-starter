/**
 * Shared machinery for per-action-type persistent state.
 *
 * Every action-type (basic, progress, regular, multipart) owns a Map of
 * per-def state built inside a nested persistent context. The shape of the
 * state differs per type (ProgressState has `gainChain`, MultipartState has
 * segment-machine fields) but the surrounding scaffolding is identical:
 * type guard, dedupe, push two persistent contexts, build state, pop, store.
 *
 * `createActionTypeCategory` centralizes that scaffolding. Each action-type
 * file becomes a thin call site that provides the type tag and a builder
 * closure — the helper stays type-parametric so `ProgressState`/`MultipartState`
 * don't collapse to a shared shape.
 */

import { withPersistentContext } from 'open-loop-engine';
import type { ActionDef } from '../../data/types';

export interface ActionTypeCategory<TState> {
  /** Build per-def state. No-op for wrong type or already-installed id. */
  installOne(def: ActionDef): void;
  /** Lookup state by action id. */
  getState(id: string): TState | undefined;
  /** (def, state) pairs for every installed action, in registration order. */
  getAll(): Array<{ def: ActionDef; state: TState }>;
  /** Underlying state map — read-only access for type-specific iteration (reset, cross-lookup). */
  readonly states: ReadonlyMap<string, TState>;
}

export function createActionTypeCategory<TState>(params: {
  typeTag: ActionDef['type'];
  build: (def: ActionDef) => TState;
  /** Called after state is registered, inside normal runtime context (no persistent scope). */
  onInstall?: (def: ActionDef, state: TState) => void;
}): ActionTypeCategory<TState> {
  const defMap = new Map<string, ActionDef>();
  const states = new Map<string, TState>();

  function installOne(def: ActionDef): void {
    if (def.type !== params.typeTag) return;
    if (states.has(def.id)) return;
    defMap.set(def.id, def);
    const state = withPersistentContext('action-runner', () =>
      withPersistentContext(`${params.typeTag}:${def.id}`, () => params.build(def)),
    );
    states.set(def.id, state);
    params.onInstall?.(def, state);
  }

  return {
    installOne,
    getState(id) {
      return states.get(id);
    },
    getAll() {
      const out: Array<{ def: ActionDef; state: TState }> = [];
      for (const [id, def] of defMap) {
        const state = states.get(id);
        if (state) out.push({ def, state });
      }
      return out;
    },
    states,
  };
}
