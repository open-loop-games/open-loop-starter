/**
 * The one brain both seats share. Every decision is a function of the seat's
 * situation and a persona; the rival runs it every second with its contract's
 * persona, and the player's automation runs it with `PLAYER_PERSONA`, scoped
 * to the automation tiers the player has unlocked. The probe plays the same
 * functions, so the balance harness measures shipping code.
 *
 * What the spine assumes, and this plays: hustlers while they pay back inside
 * the persona's horizon; training buildings sized so their scrip draw is the
 * persona's army share of income (the spine's `1 − ECON_SHARE` for the player)
 * until the hustlers stop paying back, then all of it; research saved for only
 * after that; one army, concentrated on one objective at a time.
 */
import { toNumber, type Producer, type Purchasable } from '@open-loop/engine';
import { BARRACKS, RESEARCH } from '../data/buildings';
import type { Persona } from '../data/contracts';
import { DISTRICTS } from '../data/contracts';
import { UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';
import { AETHER_PRICE } from '../data/spine';
import { PRESENCE, countsOf, fightingValue, total, type Counts } from './battle';
import { deploy, readyUnits, redeploy, retreat, setFocus, setStance } from './orders';
import type { Focus, Side } from './side';

/** What a seat knows when it decides. */
export interface Situation {
  own: Side;
  other: Side;
  /** District control from this seat's side: +1 is held by this seat. */
  control: number[];
  /** Enemy squads per district as this seat sees them; `undefined` is fogged. */
  enemySquads: (Counts | undefined)[];
  /** The enemy's whole-army composition as this seat last knew it, or none. */
  enemyMix: Counts | undefined;
  /** This seat's safehouse is under siege from these districts. */
  besiegedFrom: number[];
}

import { LIEUTENANTS, type LieutenantDef, type PolicyScope } from '../data/crew';
export type { PolicyScope };

// TODO(expansion): a converter input has no reserve (auto-purchase has one), so a seat
// saving for a purchase must switch its training floors off; see `playEconomy`.
/** A building this many seconds of income away is saved for: hustlers and research wait. */
const SAVE_HORIZON_S = 40;
/** Training pauses only for the last stretch of a save, this many seconds of income. */
const PAUSE_HORIZON_S = 12;
/** A floor's aether draw is fed if the taps plus the bank spread over this many seconds cover it. */
const FEED_HORIZON_S = 120;

const zero = (): Counts => Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;

function hustler(side: Side): Producer {
  return side.econ.getProducer('hustler')!;
}

function barracksFor(side: Side, kind: UnitKind): Producer {
  return side.barracks.getProducer(BARRACKS.find((b) => b.trains === kind)!.id)!;
}

/** True while the next hustler still pays back inside the persona's horizon. */
export function hustlersPay(side: Side, persona: Persona): boolean {
  const h = hustler(side);
  const cost = toNumber(h.repeatable!.getCost(1));
  return cost / toNumber(h.computedRate.value) < persona.hustlerPayback;
}

/** The lieutenant a seat hires next, in order, once its price is in the purse; none when all are hired. */
export function hireNext(side: Side): LieutenantDef | undefined {
  const next = LIEUTENANTS.find((l) => !side.crew.getPurchasable(l.id)!.active.value);
  if (!next) return undefined;
  const hire = side.crew.getPurchasable(next.id)!;
  if (!hire.canPurchase.value) return undefined;
  hire.purchase();
  return hire.active.value ? next : undefined;
}

/** The policy scopes a seat's hired lieutenants run. */
export function hiredScopes(side: Side): Set<PolicyScope> {
  return new Set(
    LIEUTENANTS.filter((l) => side.crew.getPurchasable(l.id)!.active.value).map((l) => l.scope),
  );
}

/** The kind that does the most damage to `target` per scrip of unit value. */
export function counterTo(target: UnitKind): UnitKind {
  let best: UnitKind = 'razor';
  let bestEff = -1;
  for (const k of UNIT_KINDS) {
    const eff = effectiveness(k, target) / (k === 'enforcer' ? 1.6 : 1);
    if (eff > bestEff) {
      bestEff = eff;
      best = k;
    }
  }
  return best;
}

/** Production shares: the persona's mix bent toward counters of what the seat knows the enemy fields. */
export function productionMix(persona: Persona, enemyMix: Counts | undefined): Counts {
  const base = zero();
  for (const k of UNIT_KINDS) base[k] = persona.mix[k] ?? 0;
  const baseSum = total(base) || 1;
  for (const k of UNIT_KINDS) base[k] /= baseSum;
  if (!enemyMix || persona.counter <= 0 || total(enemyMix) <= 0) return base;
  const counter = zero();
  const enemySum = total(enemyMix);
  for (const k of UNIT_KINDS) counter[counterTo(k)] += enemyMix[k] / enemySum;
  const out = zero();
  for (const k of UNIT_KINDS)
    out[k] = (1 - persona.counter) * base[k] + persona.counter * counter[k];
  return out;
}

/**
 * A building keeps training unless what it makes is countered by what the
 * enemy fields: idling a floor costs throughput, so only a losing trade does.
 */
export function worthTraining(kind: UnitKind, mix: Counts, enemyMix: Counts | undefined): boolean {
  if (mix[kind] > 0.02 || !enemyMix || total(enemyMix) <= 0) return true;
  const sum = total(enemyMix);
  let trade = 0;
  for (const b of UNIT_KINDS)
    trade += (enemyMix[b] / sum) * (effectiveness(kind, b) / effectiveness(b, kind));
  return trade >= 0.75;
}

type Input = 'scrip' | 'aether';

/** What one training building of this kind draws per second of an input while switched on. */
function drainOf(side: Side, kind: UnitKind, input: Input = 'scrip'): number {
  return side.trainRate() * toNumber(barracksFor(side, kind).inputs![input].per.value);
}

/** What every training building would draw per second of an input with its switch on. */
export function trainingDrain(side: Side, input: Input = 'scrip'): number {
  let d = 0;
  for (const k of UNIT_KINDS)
    d += drainOf(side, k, input) * toNumber(barracksFor(side, k).count.value);
  return d;
}

/** Whether the seat's army is in a fight it is losing, so it must not stop training to save. */
function underPressure(sit: Situation): boolean {
  if (sit.besiegedFrom.length > 0) return true;
  const held = sit.control.filter((c) => c >= 1).length;
  const lost = sit.control.filter((c) => c <= -1).length;
  if (lost > held) return true;
  for (let i = 0; i < DISTRICTS.length; i++) {
    const enemy = sit.enemySquads[i];
    if (!enemy || total(enemy) <= PRESENCE) continue;
    const own = countsOf(sit.own.squads[i]);
    if (
      total(own) > PRESENCE &&
      fightingValue(sit.own, own, enemy) < fightingValue(sit.other, enemy, own)
    )
      return true;
  }
  return false;
}

function fieldArmy(side: Side): number {
  let n = 0;
  for (const k of UNIT_KINDS) {
    n += readyUnits(side, k);
    for (const sq of side.squads) n += toNumber(sq[k].value);
  }
  return n;
}

// ─── Economy and building ──────────────────────────────────────────────────

/**
 * The training building the seat wants next, if the persona's army share has room for it.
 * A floor whose aether draw the taps cannot feed waits on a tap; once the taps are at
 * their limit, the next kind in line stands in.
 */
function nextBuilding(
  side: Side,
  persona: Persona,
  mix: Counts,
): { kind: UnitKind; buy: Purchasable } | undefined {
  const share = hustlersPay(side, persona) ? persona.armyShare : 1.15;
  const income = side.scripRate();
  const owned = (k: UnitKind) => toNumber(barracksFor(side, k).count.value);
  const buildings = UNIT_KINDS.reduce((s, k) => s + owned(k), 0);
  // The kind whose share of buildings lags its production share most.
  const lag = (k: UnitKind) => mix[k] * (buildings + 1) - owned(k);
  const order = [...UNIT_KINDS].filter((k) => mix[k] > 0.02).sort((a, b) => lag(b) - lag(a));
  const tap = side.econ.getProducer('ley-tap')!.repeatable!;
  const fed = side.aetherRate() + toNumber(side.aether.value) / FEED_HORIZON_S;
  for (const k of order) {
    if (trainingDrain(side) + drainOf(side, k) > share * income) return undefined;
    const b = barracksFor(side, k).repeatable!;
    const aether = drainOf(side, k, 'aether');
    if (b.visible.value && aether > 0 && trainingDrain(side, 'aether') + aether > fed) {
      if (tap.maxed.value) continue;
      return { kind: k, buy: tap };
    }
    if (b.visible.value) return { kind: k, buy: b };
    // Missing prerequisite: the next purchase on the way to it stands in.
    const prereq = prerequisiteFor(side, k);
    if (prereq && !prereq.maxed.value) return { kind: k, buy: prereq };
  }
  return undefined;
}

/**
 * One economy step: buy hustlers, taps and squats (`econ`), training
 * buildings and research (`build`), and set the training switches (`build`).
 * A building the seat can afford within `SAVE_HORIZON_S` of income is saved
 * for: hustlers wait for it, and so does research. Returns what it bought.
 */
export function playEconomy(
  sit: Situation,
  persona: Persona,
  scopes: ReadonlySet<PolicyScope>,
): string[] {
  const side = sit.own;
  const bought: string[] = [];
  const income = side.scripRate();
  const mix = productionMix(persona, sit.enemyMix);
  const econWanted = hustlersPay(side, persona);
  const owned = (k: UnitKind) => toNumber(barracksFor(side, k).count.value);
  let saving = false;
  let savingForBuilding = false;

  if (scopes.has('build')) {
    const want = nextBuilding(side, persona, mix);
    if (want) {
      if (want.buy.canPurchase.value) {
        if (want.buy.purchase(1)) bought.push(`building toward ${want.kind}`);
      } else if (toNumber(want.buy.getCost(1)) < SAVE_HORIZON_S * Math.max(income, 1)) {
        savingForBuilding = true;
        const short = toNumber(want.buy.getCost(1)) - toNumber(side.scrip.value);
        saving = short < PAUSE_HORIZON_S * income && !underPressure(sit);
      }
    }
  }

  if (scopes.has('econ')) {
    if (
      side.supplyUsed() >= side.supplyCap.value - 1.5 &&
      side.squats.canPurchase.value &&
      side.squats.purchase(1)
    ) {
      bought.push('squat');
    }
    const h = hustler(side).repeatable!;
    // Without a quartermaster the player builds; the fixer never spends what the next training floor needs.
    const keep = scopes.has('build') ? 0 : cheapestFloor(side);
    if (
      econWanted &&
      !savingForBuilding &&
      h.canPurchase.value &&
      toNumber(side.scrip.value) >= toNumber(h.getCost(1)) + keep
    ) {
      if (h.purchase(1)) bought.push('hustler');
    }
    const tap = side.econ.getProducer('ley-tap')!;
    const tapCost = toNumber(tap.repeatable!.getCost(1));
    if (
      !savingForBuilding &&
      toNumber(tap.count.value) < persona.taps &&
      tap.repeatable!.canPurchase.value &&
      toNumber(side.scrip.value) >= tapCost + keep &&
      tap.repeatable!.purchase(1)
    ) {
      bought.push('ley tap');
    }
  }

  if (scopes.has('build')) {
    for (const id of persona.research) {
      const r = side.research.getPurchasable(id);
      if (!r || r.active.value) continue;
      if (!savingForBuilding && r.canPurchase.value) {
        if (r.purchase()) bought.push(id);
      } else if (
        !savingForBuilding &&
        !econWanted &&
        r.visible.value &&
        fieldArmy(side) >= persona.assaultAt &&
        researchCost(id) - toNumber(side.scrip.value) < PAUSE_HORIZON_S * income
      ) {
        // Research is saved for only once the economy is built and an army stands.
        saving ||= !underPressure(sit);
      }
      break;
    }
    for (const k of UNIT_KINDS)
      side.training[k].value = !saving && owned(k) > 0 && worthTraining(k, mix, sit.enemyMix);
  }
  return bought;
}

/** The price of the cheapest training floor the seat could build now. */
function cheapestFloor(side: Side): number {
  let best = Infinity;
  for (const k of UNIT_KINDS) {
    const b = barracksFor(side, k).repeatable!;
    if (b.visible.value) best = Math.min(best, toNumber(b.getCost(1)));
  }
  return Number.isFinite(best) ? best : 0;
}

/** The next purchase on the way to a training building whose prerequisite is missing. */
function prerequisiteFor(side: Side, kind: UnitKind): Purchasable | undefined {
  const tap = side.econ.getProducer('ley-tap')!.repeatable!;
  const chop = barracksFor(side, 'razor').repeatable!;
  if (kind === 'hexer') return tap;
  if (kind === 'rigger') return chop;
  if (kind === 'enforcer') {
    const garage = barracksFor(side, 'rigger').repeatable!;
    const parlor = barracksFor(side, 'hexer').repeatable!;
    if (!garage.active.value) return garage.visible.value ? garage : chop;
    if (!parlor.active.value) return parlor.visible.value ? parlor : tap;
  }
  return undefined;
}

function researchCost(id: string): number {
  const def = RESEARCH.find((d) => d.id === id)!;
  return def.cost.scrip + def.cost.aether * AETHER_PRICE;
}

// ─── Command ───────────────────────────────────────────────────────────────

/** What the seat's whole army is worth against a target mix: squads plus ready reserve. */
function armyAvailable(side: Side): Counts {
  const c = zero();
  for (const k of UNIT_KINDS) {
    c[k] = readyUnits(side, k);
    for (let i = 0; i < DISTRICTS.length; i++) c[k] += toNumber(side.squads[i][k].value);
  }
  return c;
}

/** The enemy kind this squad kills fastest, weighted by how hard that kind hits back. */
export function chooseFocus(side: Side, other: Side, own: Counts, enemy: Counts): Focus {
  let best: Focus = 'spread';
  let bestScore = 0;
  for (const bk of UNIT_KINDS) {
    if (enemy[bk] <= PRESENCE) continue;
    let kill = 0;
    for (const ak of UNIT_KINDS)
      kill += (own[ak] * side.unitDps(ak) * effectiveness(ak, bk)) / other.unitHp(bk);
    let threat = 0;
    for (const ak of UNIT_KINDS) threat += own[ak] * effectiveness(bk, ak);
    const score = kill * (1 + threat / Math.max(1, total(own)));
    if (score > bestScore) {
      bestScore = score;
      best = bk;
    }
  }
  return best;
}

/**
 * One command step: retreat squads that are losing badly, focus fire, pick
 * one objective and send every ready unit and idle squad to it, and order an
 * assault from a held district once enough units stand there.
 */
export function playCommand(sit: Situation, persona: Persona): void {
  const { own, other } = sit;
  const n = DISTRICTS.length;
  const ownCounts = Array.from({ length: n }, (_, i) => countsOf(own.squads[i]));
  const known = (i: number) => sit.enemySquads[i] ?? zero();

  // Retreat and focus inside every fight.
  for (let i = 0; i < n; i++) {
    const enemy = known(i);
    if (total(enemy) <= PRESENCE || total(ownCounts[i]) <= PRESENCE) {
      setFocus(own, i, 'spread');
      continue;
    }
    const mine = fightingValue(own, ownCounts[i], enemy);
    const theirs = fightingValue(other, enemy, ownCounts[i]);
    if (mine < persona.retreatBelow * theirs) {
      retreat(own, i);
      ownCounts[i] = zero();
      continue;
    }
    setFocus(own, i, chooseFocus(own, other, ownCounts[i], enemy));
  }

  // Choose one objective for the whole army.
  const army = armyAvailable(own);
  // A seat commits when its whole army is worth `retreatBelow + 0.5` of what stands there:
  // a cautious persona (high retreatBelow) waits for an edge, a reckless one does not.
  const canTake = (i: number) => {
    const enemy = known(i);
    if (total(enemy) <= PRESENCE) return true;
    return (
      fightingValue(own, army, enemy) >=
      (persona.retreatBelow + 0.5) * fightingValue(other, enemy, army)
    );
  };
  let objective = -1;
  // 1. Break a siege on our safehouse.
  for (const i of sit.besiegedFrom) if (objective < 0 && canTake(i)) objective = i;
  // 2. Win a fight already under way.
  if (objective < 0) {
    for (let i = 0; i < n; i++)
      if (total(known(i)) > PRESENCE && total(ownCounts[i]) > PRESENCE && canTake(i)) objective = i;
  }
  // 3. Finish the capture closest to done; where the army already stands breaks ties.
  if (objective < 0) {
    let best = -Infinity;
    for (let i = 0; i < n; i++) {
      if (sit.control[i] >= 1 || !canTake(i)) continue;
      const score = sit.control[i] + (total(ownCounts[i]) > PRESENCE ? 0.5 : 0);
      if (score > best) {
        best = score;
        objective = i;
      }
    }
  }
  // 4. Everything held: stage the assault where most of the army already stands.
  if (objective < 0) {
    let most = -1;
    for (let i = 0; i < n; i++) {
      const t = total(ownCounts[i]);
      if (sit.control[i] >= 1 && t > most) {
        most = t;
        objective = i;
      }
    }
  }
  if (objective < 0) return;

  for (const k of UNIT_KINDS) deploy(own, k, objective);
  // Idle squads elsewhere (no enemy in their district) join the objective.
  for (let i = 0; i < n; i++) {
    if (i === objective) continue;
    if (total(known(i)) <= PRESENCE && total(ownCounts[i]) > 0) redeploy(own, i, objective);
  }

  for (let i = 0; i < n; i++) {
    const here = total(countsOf(own.squads[i]));
    const held = sit.control[i] >= 1 && total(known(i)) <= PRESENCE;
    if (held && here >= persona.assaultAt) setStance(own, i, 'assault');
    else if (here < persona.assaultAt / 2 || !held) setStance(own, i, 'hold');
  }
}

/** Zero counts, for a seat that knows nothing about a district. */
export { zero as noCounts };
