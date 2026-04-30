import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { Decimal, type DecimalSource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { ActionDef } from '../data/types';
import { ActionsKey, type ActionsModule } from '../modules';
import { usePrereqs } from './usePrereqs';

export interface ActionRow {
  def: ActionDef;
  /** Adjusted ticks needed at the current Level — drives the "X ticks remaining" readout. */
  adjustedTicks: ComputedRef<DecimalSource>;
  /** Current ticks of progress on this attempt. */
  progress: ComputedRef<DecimalSource>;
  /** Progress fraction (0..1) for the per-action gauge. */
  progressFraction: ComputedRef<number>;
  /** Cumulative completion count across loops (drives prereq predicates + UI count). */
  timesCompleted: ComputedRef<number>;
  /** True when every `def.prereqs` entry currently matches state — drives drawer visibility. */
  visible: ComputedRef<boolean>;
  /** Visibility AND `canStart` — drives runnability gating (currently identical to `visible`). */
  unlocked: ComputedRef<boolean>;
}

export interface ActionsView {
  rows: ComputedRef<ActionRow[]>;
  /** All actions in a zone (registration order) — visible-or-not. */
  rowsByZone: (zoneId: string) => ComputedRef<ActionRow[]>;
  /** Zone actions filtered through the prereq web — drives progressive disclosure. */
  visibleRowsByZone: (zoneId: string) => ComputedRef<ActionRow[]>;
  getRow: (id: string) => ActionRow | undefined;
}

export function useActions(): ActionsView {
  const mod: ActionsModule = useModule(ActionsKey);
  const prereqs = usePrereqs();

  const rows = computed<ActionRow[]>(() => mod.getAll().map((def) => buildRow(def, mod)));

  function buildRow(def: ActionDef, m: ActionsModule): ActionRow {
    const state = m.getState(def.id);
    return {
      def,
      adjustedTicks: computed(() => state?.adjustedTicks.value ?? def.manaCost),
      progress: computed(() => state?.progress.value ?? 0),
      progressFraction: computed(() => {
        if (!state) return 0;
        const cost = state.adjustedTicks.value;
        if (Decimal.lte(cost, 0)) return 0;
        return Math.max(0, Math.min(1, Decimal.div(state.progress.value, cost).toNumber()));
      }),
      timesCompleted: computed(() => state?.timesCompleted.value ?? 0),
      visible: computed(() => prereqs.isVisible(def)),
      unlocked: computed(() => prereqs.isUnlocked(def)),
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

  function visibleRowsByZone(zoneId: string): ComputedRef<ActionRow[]> {
    return computed(() =>
      mod
        .getAll()
        .filter((def) => def.zoneId === zoneId && prereqs.isVisible(def))
        .map((def) => buildRow(def, mod)),
    );
  }

  function getRow(id: string): ActionRow | undefined {
    const def = mod.getDef(id);
    return def ? buildRow(def, mod) : undefined;
  }

  return { rows, rowsByZone, visibleRowsByZone, getRow };
}
