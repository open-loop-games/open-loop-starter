import { computed, inject, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type Engine } from 'open-loop-engine';
import type { ActionDef } from '../data/types';
import { ActionsKey, type ActionsModule } from '../modules';

export interface ActionRow {
  def: ActionDef;
  effectiveCost: ComputedRef<DecimalSource>;
  progress: ComputedRef<DecimalSource>;
  progressFraction: ComputedRef<number>;
  timesCompleted: ComputedRef<number>;
}

export interface ActionsView {
  rows: ComputedRef<ActionRow[]>;
  /** Filter to a specific zone — used by the action drawer. */
  rowsByZone: (zoneId: string) => ComputedRef<ActionRow[]>;
  getRow: (id: string) => ActionRow | undefined;
}

export function useActions(): ActionsView {
  const engine = inject<Engine>('engine');
  const actions = engine?.tryInject(ActionsKey);
  if (!actions) {
    throw new Error('useActions() called outside an active looper engine');
  }
  const mod: ActionsModule = actions;

  const rows = computed<ActionRow[]>(() => mod.getAll().map((def) => buildRow(def, mod)));

  function buildRow(def: ActionDef, m: ActionsModule): ActionRow {
    const state = m.getState(def.id);
    return {
      def,
      effectiveCost: computed(() => state?.effectiveCost.value ?? def.baseCost),
      progress: computed(() => state?.progress.value ?? 0),
      progressFraction: computed(() => {
        if (!state) return 0;
        const cost = state.effectiveCost.value;
        if (Decimal.lte(cost, 0)) return 0;
        return Math.max(0, Math.min(1, Decimal.div(state.progress.value, cost).toNumber()));
      }),
      timesCompleted: computed(() => state?.timesCompleted.value ?? 0),
    };
  }

  function rowsByZone(zoneId: string): ComputedRef<ActionRow[]> {
    return computed(() =>
      mod
        .getAll()
        .filter((def) => def.zoneId === zoneId)
        .map((def) => buildRow(def, mod)),
    );
  }

  function getRow(id: string): ActionRow | undefined {
    const def = mod.getDef(id);
    return def ? buildRow(def, mod) : undefined;
  }

  return { rows, rowsByZone, getRow };
}
