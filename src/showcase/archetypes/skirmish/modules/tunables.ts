/**
 * The perturbable balance constants, declared once against the tuning registry
 * and shared by both seats. Defaults are the spine's values; a probe or the
 * balance workbench overrides them by key.
 */
import { tunable, type ComputedRef, type TuningRegistry } from '@open-loop/engine';
import {
  CHARTER,
  ECON,
  FLOORS,
  GATE_GUNS,
  SENTRY_NEST,
  RESEARCH,
  SQUATS,
  TRAIN_RATE,
} from '../data/buildings';
import { UNITS, UNIT_KINDS, type UnitKind } from '../data/units';
import { HOP_S, captureRate, hqIntegrity, turretDps, REF_PRESENCE } from '../data/spine';

export interface Tunables {
  econ: Record<
    string,
    {
      rate: ComputedRef<number>;
      baseCost: ComputedRef<number>;
      ratio: ComputedRef<number>;
      limit: ComputedRef<number>;
    }
  >;
  floorBaseCost: ComputedRef<number>;
  floorRatio: ComputedRef<number>;
  trainRate: ComputedRef<number>;
  unit: Record<
    UnitKind,
    {
      dps: ComputedRef<number>;
      hp: ComputedRef<number>;
      scrip: ComputedRef<number>;
      aether: ComputedRef<number>;
    }
  >;
  squatBaseCost: ComputedRef<number>;
  squatRatio: ComputedRef<number>;
  supplyBase: ComputedRef<number>;
  supplyPer: ComputedRef<number>;
  hqIntegrity: ComputedRef<number>;
  turretDps: ComputedRef<number>;
  captureRate: ComputedRef<number>;
  refPresence: ComputedRef<number>;
  hopS: ComputedRef<number>;
  research: Record<string, { scrip: ComputedRef<number>; aether: ComputedRef<number> }>;
  charterCost: ComputedRef<number>;
  turretLevels: ComputedRef<number>;
  nestCost: ComputedRef<number>;
  nestDps: ComputedRef<number>;
  nestHp: ComputedRef<number>;
}

export function createTunables(t: TuningRegistry): Tunables {
  const num = (key: string, value: number) => tunable(t, key, () => value) as ComputedRef<number>;
  return {
    econ: Object.fromEntries(
      ECON.map((d) => [
        d.id,
        {
          rate: num(`econ/${d.id}/rate`, d.rate),
          baseCost: num(`econ/${d.id}/baseCost`, d.purchase.baseCost),
          ratio: num(`econ/${d.id}/ratio`, d.purchase.ratio),
          limit: num(`econ/${d.id}/limit`, d.purchase.limit),
        },
      ]),
    ),
    floorBaseCost: num('floors/baseCost', FLOORS.baseCost),
    floorRatio: num('floors/ratio', FLOORS.ratio),
    trainRate: num('floors/trainRate', TRAIN_RATE),
    unit: Object.fromEntries(
      UNIT_KINDS.map((k) => [
        k,
        {
          dps: num(`units/${k}/dps`, UNITS[k].dps),
          hp: num(`units/${k}/hp`, UNITS[k].hp),
          scrip: num(`units/${k}/scrip`, UNITS[k].cost.scrip),
          aether: num(`units/${k}/aether`, UNITS[k].cost.aether),
        },
      ]),
    ) as Tunables['unit'],
    squatBaseCost: num('squats/baseCost', SQUATS.baseCost),
    squatRatio: num('squats/ratio', SQUATS.ratio),
    supplyBase: num('squats/supplyBase', SQUATS.supplyBase),
    supplyPer: num('squats/supplyPer', SQUATS.supplyPer),
    hqIntegrity: num('hq/integrity', hqIntegrity),
    turretDps: num('hq/turretDps', turretDps),
    captureRate: num('districts/captureRate', captureRate),
    refPresence: num('districts/refPresence', REF_PRESENCE),
    hopS: num('map/hopS', HOP_S),
    research: Object.fromEntries(
      RESEARCH.map((d) => [
        d.id,
        {
          scrip: num(`research/${d.id}/scrip`, d.cost.scrip),
          aether: num(`research/${d.id}/aether`, d.cost.aether),
        },
      ]),
    ),
    charterCost: num('charter/cost', CHARTER.cost),
    turretLevels: num('hq/turretLevels', GATE_GUNS.levels),
    nestCost: num('districts/nestCost', SENTRY_NEST.cost),
    nestDps: num('districts/nestDps', SENTRY_NEST.dps),
    nestHp: num('districts/nestHp', SENTRY_NEST.hp),
  };
}
