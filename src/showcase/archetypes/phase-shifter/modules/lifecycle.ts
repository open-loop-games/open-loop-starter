import {
  computed,
  createGateRequirement,
  createConditionalEffectSystem,
  createPredicateResolver,
  createPurchasableCategory,
  type ComputedRef,
  type Gate,
  type ModifierChain,
  type PurchasableCategory,
} from '@open-loop/engine';
import {
  IDS,
  MECHANISMS,
  type DoorDef,
  type DoorId,
  type MechanismDef,
  type MechanismId,
} from '../data';

/**
 * The one-way mechanic lifecycle — the story's defining component.
 *
 * Progress is a short ladder of doors. Every mechanism declares the door that
 * installs it and the door that retires it, and is live strictly between the
 * two. Doors are purchasables with `limit: 1` that no reset names, so a
 * mechanism's liveness flips on once and off once, and never back. The phase
 * is derived as "doors opened", never stored beside them.
 *
 * Two engine surfaces enforce it:
 * - a mechanism that owns a modifier chain hands it to `scope()`, which
 *   registers ×0 on a `ConditionalEffectSystem` outside the lifespan. Nothing
 *   is saved; it is re-derived on load.
 * - a mechanism with no chain (a verb, a purchase button) reads `isLive()`, or
 *   `liveGate()` as a purchasable's `visible`, which also gates `canPurchase`.
 */
export interface Lifecycle {
  readonly doors: PurchasableCategory<DoorDef>;
  /** Doors opened so far: the phase index, monotone by construction. */
  readonly doorsOpened: ComputedRef<number>;
  isOpen(door: DoorId): ComputedRef<boolean>;
  /** The Gate that holds while `id` is between its install and retire doors. */
  liveGate(id: MechanismId): Gate;
  isLive(id: MechanismId): ComputedRef<boolean>;
  /** Zero `chains` whenever mechanism `id` is outside its lifespan. */
  scope(id: MechanismId, chains: ModifierChain[]): void;
  /** Open a door by hand. False when its record is not yet met, or it is already open. */
  open(door: DoorId): boolean;
  /** Register a handler for a door opened by play, not by a load restoring it. */
  onOpened(fn: (door: DoorDef) => void): void;
  readonly mechanisms: readonly MechanismDef[];
}

const doorGate = (door: DoorId): Gate => ({ kind: 'active', category: IDS.doors, entry: door });

// TODO(expansion): one-way mechanism lifespans — [installedBy, retiredBy) over a door ladder,
// lowered to active Gates and a ConditionalEffectSystem ×0 dormancy per chain. Re-wires engine
// primitives only; no engine surface names "a mechanism's lifespan" or "replaces".
export function createLifecycle(doorDefs: DoorDef[]): Lifecycle {
  const predicates = createPredicateResolver();

  const doors = createPurchasableCategory<DoorDef>({
    id: IDS.doors,
    mapPurchasable: (def) => ({
      display: { title: def.title, description: def.description },
      requirements: createGateRequirement({ gate: def.opensWhen }),
      limit: 1,
    }),
  });
  doors.register(doorDefs);

  const doorsOpened = computed(
    () => doors.getAll().filter((e) => e.purchasable.active.value).length,
  );

  const byId = new Map(MECHANISMS.map((m) => [m.id, m]));

  function liveGate(id: MechanismId): Gate {
    const m = byId.get(id);
    if (!m) throw new Error(`lifecycle: unknown mechanism '${id}'`);
    const of: Gate[] = [];
    if (m.installedBy) of.push(doorGate(m.installedBy));
    if (m.retiredBy) of.push({ kind: 'not', of: doorGate(m.retiredBy) });
    return { kind: 'all', of };
  }

  const liveCache = new Map<MechanismId, ComputedRef<boolean>>();
  function isLive(id: MechanismId): ComputedRef<boolean> {
    let c = liveCache.get(id);
    if (!c) {
      c = predicates.adopt(liveGate(id), true, `mechanism '${id}' live`).holds;
      liveCache.set(id, c);
    }
    return c;
  }

  const dormancy = createConditionalEffectSystem({ id: 'mechanism-dormancy' });
  function scope(id: MechanismId, chains: ModifierChain[]): void {
    const m = byId.get(id)!;
    dormancy.register({
      id: `${id}:dormant`,
      active: { kind: 'not', of: liveGate(id) },
      tags: [m.installedBy ?? 'start', m.retiredBy ?? 'end'],
      grants: chains.map((chain) => ({ chain, multiplier: 0, description: `${id} dormant` })),
    });
  }

  const handlers: ((door: DoorDef) => void)[] = [];
  for (const entry of doors.getAll()) {
    entry.purchasable.on('purchased', () => {
      for (const fn of handlers) fn(entry.def);
    });
  }

  const openCache = new Map<DoorId, ComputedRef<boolean>>();
  return {
    doors,
    doorsOpened,
    isOpen(door) {
      let c = openCache.get(door);
      if (!c) {
        c = computed(() => doors.getPurchasable(door)?.active.value ?? false);
        openCache.set(door, c);
      }
      return c;
    },
    liveGate,
    isLive,
    scope,
    open(door) {
      const p = doors.getPurchasable(door);
      if (!p || !p.canPurchase.value) return false;
      p.purchase(1);
      return true;
    },
    onOpened: (fn) => void handlers.push(fn),
    mechanisms: MECHANISMS,
  };
}
