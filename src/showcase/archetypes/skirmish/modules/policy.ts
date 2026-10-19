/**
 * The one brain both seats share. Every decision is a function of the seat's
 * situation and a persona; the rival runs it every second with its contract's
 * persona, and the player's automation runs it with `PLAYER_PERSONA`, scoped
 * to the automation tiers the player has unlocked. The probe plays the same
 * functions, so the balance harness measures shipping code.
 *
 * What the spine assumes, and this plays (`walkArmy`): hustlers while they pay
 * back inside the persona's horizon; floors sized so their scrip draw is the
 * persona's army share of income (the spine's `1 − ECON_SHARE` for the player)
 * until the hustlers stop paying back, then all of it; tech floors toward the
 * kinds the mix wants; every floor's time split by that mix; research saved for
 * only after that; one army, concentrated on one objective at a time.
 */
import { toNumber, type Producer, type Purchasable } from '@open-loop/engine';
import { BARRACKS, RESEARCH } from '../data/buildings';
import type { Persona } from '../data/contracts';
import { DISTRICTS } from '../data/contracts';
import { UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';
import { AETHER_PRICE, LATE_FLOOR_SHARE, PAUSE_HORIZON_S, SAVE_HORIZON_S } from '../data/spine';
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
/** A floor's aether draw is fed if the taps plus the bank spread over this many seconds cover it. */
const FEED_HORIZON_S = 120;

const zero = (): Counts => Object.fromEntries(UNIT_KINDS.map((k) => [k, 0])) as Counts;

function hustler(side: Side): Producer {
  return side.econ.getProducer('hustler')!;
}

/** The tech floor that opens a kind; its producer trains that kind. */
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

type Input = 'scrip' | 'aether';

/** What one floor's whole time on this kind draws per second of an input while switched on. */
function drainOf(side: Side, kind: UnitKind, input: Input = 'scrip'): number {
  return side.trainRate() * toNumber(barracksFor(side, kind).inputs![input].per.value);
}

/** What every floor would draw per second of an input with every switch on. */
export function trainingDrain(side: Side, input: Input = 'scrip'): number {
  let d = 0;
  for (const k of UNIT_KINDS) d += drainOf(side, k, input) * side.floorShare(k);
  return d;
}

/** What one more floor would draw per second of an input, its time split by `share`. */
function floorDrain(side: Side, share: Counts, input: Input): number {
  let d = 0;
  for (const k of UNIT_KINDS) d += share[k] * drainOf(side, k, input);
  return d;
}

/** Aether per second the taps feed, with the bank spread over `FEED_HORIZON_S`. */
function aetherFed(side: Side): number {
  return side.aetherRate() + toNumber(side.aether.value) / FEED_HORIZON_S;
}

/** The mix over the kinds the seat has opened, normalized; razors when it has opened none of them. */
function openMix(side: Side, mix: Counts): Counts {
  const out = zero();
  for (const k of UNIT_KINDS) if (mix[k] > 0.02 && side.opened(k)) out[k] = mix[k];
  const sum = total(out);
  if (sum <= 0) {
    if (side.opened('razor')) out.razor = 1;
    return out;
  }
  for (const k of UNIT_KINDS) out[k] /= sum;
  return out;
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

/** A kind the mix wants this much of is worth its tech floor. */
const TECH_SHARE = 0.1;

/**
 * The next floor the seat wants, if the persona's army share of income has room for its
 * draw: the tech floor of the kind the mix wants most and has not opened, else a plain
 * floor. A missing prerequisite's next purchase stands in for a tech floor; a ley tap
 * stands in for a floor the taps cannot feed.
 */
function nextFloor(
  side: Side,
  persona: Persona,
  mix: Counts,
): { kind: UnitKind; buy: Purchasable } | undefined {
  const share = hustlersPay(side, persona) ? persona.armyShare : LATE_FLOOR_SHARE;
  const open = openMix(side, mix);
  // Before any kind is open the next floor draws nothing yet, so the first tech floor always fits.
  if (trainingDrain(side) + floorDrain(side, open, 'scrip') > share * side.scripRate())
    return undefined;
  const wanted = UNIT_KINDS.filter((k) => mix[k] > TECH_SHARE && !side.opened(k)).sort(
    (a, b) => mix[b] - mix[a],
  );
  for (const k of wanted) {
    const tech = barracksFor(side, k).repeatable!;
    if (tech.visible.value) return { kind: k, buy: tech };
    const prereq = prerequisiteFor(side, k);
    if (prereq && !prereq.maxed.value) return { kind: k, buy: prereq };
  }
  if (side.floorCount() === 0)
    return { kind: 'razor', buy: barracksFor(side, 'razor').repeatable! };
  const tap = side.econ.getProducer('ley-tap')!.repeatable!;
  const aether = floorDrain(side, open, 'aether');
  if (aether > 0 && trainingDrain(side, 'aether') + aether > aetherFed(side) && !tap.maxed.value)
    return { kind: 'hexer', buy: tap };
  return { kind: 'razor', buy: side.floors };
}

/**
 * Split every floor's time by the mix over the opened kinds, then hand aether kinds' time
 * to razors until the taps can feed what is left.
 */
export function setQueue(side: Side, mix: Counts): void {
  const weights = openMix(side, mix);
  const need = UNIT_KINDS.reduce(
    (d, k) => d + weights[k] * side.floorCount() * drainOf(side, k, 'aether'),
    0,
  );
  const fed = aetherFed(side);
  if (need > fed && side.opened('razor')) {
    const keep = fed / need;
    for (const k of UNIT_KINDS) {
      if (drainOf(side, k, 'aether') <= 0) continue;
      weights.razor += weights[k] * (1 - keep);
      weights[k] *= keep;
    }
  }
  for (const k of UNIT_KINDS) side.queue[k].value = weights[k];
}

/**
 * One economy step: buy hustlers, taps and squats (`econ`); floors and research,
 * and set the queue and the training switches (`build`). A floor the seat can
 * afford within `SAVE_HORIZON_S` of income is saved for: hustlers wait for it,
 * and so does research. Returns what it bought.
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
  let saving = false;
  let savingForFloor = false;

  if (scopes.has('build')) {
    const want = nextFloor(side, persona, mix);
    if (want) {
      if (want.buy.canPurchase.value) {
        if (want.buy.purchase(1)) bought.push(`floor toward ${want.kind}`);
      } else if (toNumber(want.buy.getCost(1)) < SAVE_HORIZON_S * Math.max(income, 1)) {
        savingForFloor = true;
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
      !savingForFloor &&
      h.canPurchase.value &&
      toNumber(side.scrip.value) >= toNumber(h.getCost(1)) + keep
    ) {
      if (h.purchase(1)) bought.push('hustler');
    }
    const tap = side.econ.getProducer('ley-tap')!;
    const tapCost = toNumber(tap.repeatable!.getCost(1));
    if (
      !savingForFloor &&
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
      if (!savingForFloor && r.canPurchase.value) {
        if (r.purchase()) bought.push(id);
      } else if (
        !savingForFloor &&
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
    setQueue(side, mix);
    for (const k of UNIT_KINDS) side.training[k].value = !saving;
  }
  return bought;
}

/** The price of the cheapest floor the seat could stand up now, tech or plain. */
function cheapestFloor(side: Side): number {
  let best = side.floors.visible.value ? toNumber(side.floors.getCost(1)) : Infinity;
  for (const k of UNIT_KINDS) {
    const tech = barracksFor(side, k).repeatable!;
    if (tech.visible.value && !tech.maxed.value) best = Math.min(best, toNumber(tech.getCost(1)));
  }
  return Number.isFinite(best) ? best : 0;
}

/** The next purchase on the way to a tech floor whose prerequisite is missing. */
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
  // 3. Press an assault the army can already make rather than chase a raid elsewhere:
  // a squad that will not fight escapes any district the army moves to.
  if (objective < 0) {
    for (let i = 0; i < n; i++)
      if (
        sit.control[i] >= 1 &&
        total(known(i)) <= PRESENCE &&
        total(ownCounts[i]) >= persona.assaultAt
      )
        objective = i;
  }
  // 4. Finish the capture closest to done; where the army already stands breaks ties.
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
  // 5. Everything held: stage the assault where most of the army already stands.
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
