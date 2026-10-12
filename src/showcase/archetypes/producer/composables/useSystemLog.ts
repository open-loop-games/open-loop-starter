import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import { DispatchKey, getClasses, getRefinements, getRevisions } from '../modules';
import { useModule } from '@/composables/useModule';

/**
 * The dispatch log — the left rail's second half, and the reason the rail
 * stays worth looking at after the hand-launch stops mattering.
 *
 * Entries are **indexed by fleet size, not by time**. The archetype has no
 * play clock (nothing in `modules/` tracks elapsed seconds, and inventing one
 * for a log would put a second time base next to the probes'), while fleet
 * size is the axis the whole economy is already keyed to — reveals, revisions
 * and both dispatch rungs all trigger on it. So the index doubles as the
 * progress reading the entry belongs to.
 *
 * **Ephemeral by design.** The log is not saved: it records what
 * happened while you were watching. A reload opens with a resume line rather
 * than a reconstructed history, because a history rebuilt from current state
 * would be fiction — the order and the fleet size at each past event are not
 * recoverable from a save that only stores totals.
 */
export interface SystemLogEntry {
  /** Monotonic id — entries are never removed, only trimmed from the front. */
  id: number;
  /** Fleet size when the entry was recorded. The log's index column. */
  at: DecimalSource;
  message: string;
}

export interface SystemLogView {
  entries: Ref<SystemLogEntry[]>;
}

/** Ring cap. Long enough to cover a play session's beats, short enough to render. */
const MAX_ENTRIES = 60;

export function useSystemLog(fleetSize: Ref<DecimalSource>): SystemLogView {
  const entries = ref<SystemLogEntry[]>([]);
  const classes = getClasses();
  const refinements = getRefinements();
  const revisions = getRevisions();
  const dispatch = useModule(DispatchKey);

  let nextId = 0;
  function push(message: string): void {
    entries.value = [
      ...entries.value.slice(Math.max(0, entries.value.length - (MAX_ENTRIES - 1))),
      { id: nextId++, at: fleetSize.value, message },
    ];
  }

  push(
    Decimal.gte(fleetSize.value, 1)
      ? 'log resumed — swarm already deployed'
      : 'system dead. one probe to seed it.',
  );

  const stops = [
    // A class coming online is the beat the player most wants recorded: it is
    // the moment the ladder gets a new rung, and it scrolls off the top of the
    // visible list otherwise.
    ...classes.getAll().map((entry) =>
      watch(
        () => Decimal.gte(entry.producer.ownedCount.value, 1),
        (online, was) => {
          if (online && !was) push(`${entry.def.displayName.toLowerCase()} class online`);
        },
      ),
    ),
    watch(
      () => revisions.getAll().filter((entry) => entry.achievement.earned.value).length,
      (now, before) => {
        if (now > before) push(`revision ${now} pushed — swarm-wide`);
      },
    ),
    watch(
      () => refinements.getAll().filter((entry) => entry.purchasable.active.value).length,
      (now, before) => {
        if (now > before) push(`refinement installed — ${now} in service`);
      },
    ),
    watch(
      () => dispatch.tiers.currentTierId.value,
      (tier, before) => {
        if (tier !== before) push(`dispatch authority granted — ${tier}`);
      },
    ),
    watch(
      () => dispatch.isActive.value,
      (active) => {
        push(active ? 'allocation handed to the swarm' : 'allocation returned to you');
      },
    ),
  ];

  onScopeDispose(() => stops.forEach((stop) => stop()));

  return { entries };
}
