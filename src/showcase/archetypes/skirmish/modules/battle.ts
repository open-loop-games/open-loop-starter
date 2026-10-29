/**
 * The battlefield step: district fights, district control and sieges. Real-time
 * unit combat is consumer-side by the engine's design, so this is game code:
 * one pure-ish step over both seats that the match tick calls every tick.
 *
 * A fight is aimed fire under Lanchester's square law: each side's casualties
 * per second are the other side's damage, shaped by the pairing relation,
 * divided by hit points. Counts are continuous; a squad below `GHOST` is gone.
 */
import { Decimal, toNumber, type Persistent, type Resource } from '@open-loop/engine';
import { DISTRICTS } from '../data/contracts';
import { adjacent } from '../data/map';
import { SENTRY_NEST } from '../data/buildings';
import { UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';
import type { Focus, Side } from './side';
import type { Tunables } from './tunables';

/**
 * A side needs more than this many units in a district to count as present,
 * and a squad left smaller is wiped: one threshold, so no remnant sits in a
 * district that neither fights nor holds.
 */
export const PRESENCE = 0.25;
export const GHOST = PRESENCE;

export type Counts = Record<UnitKind, number>;

export type BattleEvent =
  | { kind: 'captured'; district: number; by: 'p' | 'e' }
  | { kind: 'siege'; district: number; by: 'p' | 'e' }
  | { kind: 'clash'; district: number };

export function countsOf(squad: Record<UnitKind, Resource>): Counts {
  return Object.fromEntries(UNIT_KINDS.map((k) => [k, toNumber(squad[k].value)])) as Counts;
}

/** Whole, trained units of a pool; the fraction still on a training floor does not count. */
export const wholeUnits = (n: number): number => Math.floor(n + 1e-9);

export const total = (c: Counts): number => UNIT_KINDS.reduce((s, k) => s + c[k], 0);

/** No units of any kind. */
export const noCounts = (): Counts => Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;

/** Where a side's fire goes: all on the focused kind if it stands here, else spread by count. */
export function fireWeights(targets: Counts, focus: Focus): Counts {
  const sum = total(targets);
  const w = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;
  if (focus !== 'spread' && targets[focus] > GHOST) {
    w[focus] = 1;
    return w;
  }
  if (sum <= 0) return w;
  for (const k of UNIT_KINDS) w[k] = targets[k] / sum;
  return w;
}

/** Casualties per second `att` inflicts on `def`'s squad, by kind. */
export function casualtyRates(att: Side, a: Counts, def: Side, d: Counts, focus: Focus): Counts {
  const w = fireWeights(d, focus);
  const out = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;
  for (const ak of UNIT_KINDS) {
    if (a[ak] <= 0) continue;
    const dps = a[ak] * att.unitDps(ak);
    for (const bk of UNIT_KINDS) {
      if (w[bk] > 0) out[bk] += (dps * w[bk] * effectiveness(ak, bk)) / def.unitHp(bk);
    }
  }
  return out;
}

/**
 * What one side's fire does in a district where the defender may have a sentry nest: unit
 * casualties per second, and nest hit points per second. Fire focused on a kind standing
 * there skips the nest; spread fire treats the nest as `SENTRY_NEST.bulk` units.
 */
export function fireOnDistrict(
  att: Side,
  a: Counts,
  def: Side,
  d: Counts,
  nestUp: boolean,
  focus: Focus,
): { units: Counts; nest: number } {
  const units = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;
  const sum = total(d);
  const focused = focus !== 'spread' && d[focus] > GHOST;
  const nestShare = nestUp && !focused ? SENTRY_NEST.bulk / (sum + SENTRY_NEST.bulk) : 0;
  const onUnits = focused ? fireWeights(d, focus) : fireWeights(d, 'spread');
  let nest = 0;
  for (const ak of UNIT_KINDS) {
    if (a[ak] <= 0) continue;
    const dps = a[ak] * att.unitDps(ak);
    nest += dps * nestShare * effectiveness(ak, 'structure');
    for (const bk of UNIT_KINDS)
      if (onUnits[bk] > 0)
        units[bk] += (dps * (1 - nestShare) * onUnits[bk] * effectiveness(ak, bk)) / def.unitHp(bk);
  }
  return { units, nest };
}

/** Casualties per second `att`'s sentry nest inflicts, its fire spread over the squad by count. */
export function nestFire(att: Side, def: Side, d: Counts): Counts {
  const out = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;
  const sum = total(d);
  if (sum <= 0) return out;
  for (const k of UNIT_KINDS) out[k] = (att.nestDps() * (d[k] / sum)) / def.unitHp(k);
  return out;
}

/**
 * Square-law fighting value of a squad against a target mix: `(Σ n·√(dps·hp·eff))²`.
 * Policies compare these to decide retreats and reinforcements.
 */
export function fightingValue(side: Side, own: Counts, against: Counts): number {
  const enemyTotal = total(against);
  let root = 0;
  for (const ak of UNIT_KINDS) {
    if (own[ak] <= 0) continue;
    let eff = 1;
    if (enemyTotal > 0) {
      eff = 0;
      for (const bk of UNIT_KINDS) eff += (against[bk] / enemyTotal) * effectiveness(ak, bk);
    }
    root += own[ak] * Math.sqrt(side.unitDps(ak) * side.unitHp(ak) * eff);
  }
  return root * root;
}

/**
 * The seat in full control of a district: the one whose squad there may siege. A dented
 * district keeps its owner and the owner's hustlers, but no siege leaves it until the
 * owner stands there long enough to take it back.
 */
export function heldBy(control: number): 'p' | 'e' | undefined {
  return control >= 1 ? 'p' : control <= -1 ? 'e' : undefined;
}

/** Write counts back; a district squad below `floor` is wiped, a safehouse's training fraction is kept (floor 0). */
function writeCounts(squad: Record<UnitKind, Resource>, c: Counts, floor = GHOST): void {
  for (const k of UNIT_KINDS) squad[k].value = new Decimal(c[k] < floor ? 0 : c[k]);
}

/**
 * One tick of the battlefield. `control[i]` runs −1..1: +1 is held by the
 * player, −1 by the rival. Returns what happened, for the feed.
 */
export function stepBattle(
  p: Side,
  e: Side,
  control: Persistent<number>[],
  tune: Tunables,
  dt: number,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  const sieges: { att: Side; def: Side; district: number; counts: Counts }[] = [];
  for (let i = 0; i < DISTRICTS.length; i++) {
    const pc = countsOf(p.squads[i]);
    const ec = countsOf(e.squads[i]);
    const pt = total(pc);
    const et = total(ec);
    const pNest = toNumber(p.nests[i]!.hp.value);
    const eNest = toNumber(e.nests[i]!.hp.value);
    // A nest is presence: it fights for its seat, and while it stands nobody takes the district.
    if ((pt > PRESENCE || pNest > 0) && (et > PRESENCE || eNest > 0)) {
      const onE = fireOnDistrict(p, pc, e, ec, eNest > 0, p.focus[i].value);
      const onP = fireOnDistrict(e, ec, p, pc, pNest > 0, e.focus[i].value);
      const fromPNest = pNest > 0 ? nestFire(p, e, ec) : undefined;
      const fromENest = eNest > 0 ? nestFire(e, p, pc) : undefined;
      for (const k of UNIT_KINDS) {
        pc[k] = Math.max(0, pc[k] - (onP.units[k] + (fromENest?.[k] ?? 0)) * dt);
        ec[k] = Math.max(0, ec[k] - (onE.units[k] + (fromPNest?.[k] ?? 0)) * dt);
      }
      writeCounts(p.squads[i], pc);
      writeCounts(e.squads[i], ec);
      if (pNest > 0) p.nests[i]!.hp.value = new Decimal(Math.max(0, pNest - onP.nest * dt));
      if (eNest > 0) e.nests[i]!.hp.value = new Decimal(Math.max(0, eNest - onE.nest * dt));
      events.push({ kind: 'clash', district: i });
      continue;
    }
    // Uncontested presence moves control toward the side standing there.
    const before = control[i].value;
    const rate = tune.captureRate.value;
    if (pt > PRESENCE && et <= PRESENCE) {
      control[i].value = Math.min(1, before + rate * Math.min(1, pt / tune.refPresence.value) * dt);
    } else if (et > PRESENCE && pt <= PRESENCE) {
      control[i].value = Math.max(
        -1,
        before - rate * Math.min(1, et / tune.refPresence.value) * dt,
      );
    }
    if (before < 1 && control[i].value >= 1)
      events.push({ kind: 'captured', district: i, by: 'p' });
    if (before > -1 && control[i].value <= -1)
      events.push({ kind: 'captured', district: i, by: 'e' });
    // A held, uncontested district with a road to the other safehouse sieges it under an assault order.
    const holder = heldBy(control[i].value);
    if (holder === 'p' && pt > PRESENCE && p.stance[i].value === 'assault' && adjacent(i, 'e'))
      sieges.push({ att: p, def: e, district: i, counts: pc });
    if (holder === 'e' && et > PRESENCE && e.stance[i].value === 'assault' && adjacent(i, 'p'))
      sieges.push({ att: e, def: p, district: i, counts: ec });
  }
  for (const def of [e, p]) {
    const against = sieges.filter((s) => s.def === def);
    if (against.length === 0) continue;
    // Only whole, trained units hold the gates; a unit still on the training floor is inside.
    const held = countsOf(def.reserve);
    const home = Object.fromEntries(UNIT_KINDS.map((k) => [k, wholeUnits(held[k])])) as Counts;
    if (total(home) > PRESENCE) {
      // Units waiting at the safehouse meet the besiegers at the gates; the walls hold while they stand.
      for (const s of against) {
        const onHome = casualtyRates(s.att, s.counts, def, home, s.att.focus[s.district].value);
        const onAtt = casualtyRates(def, home, s.att, s.counts, 'spread');
        for (const k of UNIT_KINDS) {
          home[k] = Math.max(0, home[k] - onHome[k] * dt);
          s.counts[k] = Math.max(0, s.counts[k] - onAtt[k] * dt);
        }
        writeCounts(s.att.squads[s.district], s.counts);
        events.push({ kind: 'clash', district: s.district });
      }
      for (const k of UNIT_KINDS) held[k] = home[k] + (held[k] - wholeUnits(held[k]));
      writeCounts(def.reserve, held, 0);
      continue;
    }
    // The siege damages the safehouse; the turret shoots back, spread over every besieging unit.
    let hit = 0;
    let besiegers = 0;
    for (const s of against) {
      for (const k of UNIT_KINDS)
        hit += s.counts[k] * s.att.unitDps(k) * effectiveness(k, 'structure');
      besiegers += total(s.counts);
    }
    def.hq.value = Decimal.max(0, Decimal.sub(def.hq.value, hit * dt));
    const turret = def.turretDps() * dt;
    for (const s of against) {
      const share = total(s.counts) / besiegers;
      const c = { ...s.counts };
      const sum = total(c);
      for (const k of UNIT_KINDS)
        c[k] = Math.max(0, c[k] - (turret * share * (c[k] / sum)) / s.att.unitHp(k));
      writeCounts(s.att.squads[s.district], c);
      events.push({ kind: 'siege', district: s.district, by: s.att.id });
    }
  }
  return events;
}
