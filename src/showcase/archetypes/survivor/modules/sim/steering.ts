import type { GridCoord, SpatialGrid } from '@open-loop/engine';
import { ARENA_BALANCE, THREAT_BALANCE } from '../../data/arena';
import { deviceReach, isHeadingBound, selectTargets } from './dispatch';
import type { ArenaParams, ArenaState, Specimen, Vec2 } from './types';

// TODO(expansion): weighted utility over composed influence readers is a parked
// engine primitive (`candidate-primitives.md` § Spatial utility steering, N=1
// primordial) whose convergence signal names "a bot layer" — this is it. The
// divergence to carry into the dive: primordial scores GRID CELLS, this scores a
// continuous position sampled onto a nav grid, and the threat term is peaked at
// an orbit distance rather than monotone.

/** Nav-grid cell size in sim units. Coarse: steering, not collision. */
export const NAV_CELL = 100;

export interface NavGrid {
  grid: SpatialGrid<number>;
  cols: number;
  rows: number;
}

/** Map a continuous position onto its nav cell. */
export function toCell(pos: Vec2, nav: NavGrid): GridCoord {
  return {
    x: Math.min(nav.cols - 1, Math.max(0, Math.floor(pos.x / NAV_CELL))),
    y: Math.min(nav.rows - 1, Math.max(0, Math.floor(pos.y / NAV_CELL))),
  };
}

/**
 * Distance-from-threat and distance-to-motes fields, recomputed on a slow
 * cadence and reused between refreshes. Two `distanceField` calls, not one per
 * tick: at 20 Hz the field barely changes between steps, and the engine's own
 * docs warn the cost function must not re-enter `distanceField` on the same grid.
 */
export interface Fields {
  threat: Float64Array;
  motes: Float64Array;
  /** Specimens per nav cell. Traversal is about crowding, not presence. */
  crowd: Uint16Array;
  computedAt: number;
}

/**
 * Specimens in one nav cell at which it stops being walkable. A cell is 100×100
 * units and the operator is a point, so ONE body in it blocks nothing — the
 * first version of this treated any occupied cell as impassable and reported
 * traversal collapse the moment the horde got close, which is the normal state
 * of this game rather than a loss condition.
 */
export const BLOCKING_CROWD = 4;

/** Reachable cells below which the operator genuinely has nowhere to go. */
export const ESCAPE_FLOOR = 12;

const UNIT_COST = () => 1;

export function computeFields(state: ArenaState, nav: NavGrid, now: number): Fields {
  const threatSources: GridCoord[] = state.specimens.map((s) => toCell(s, nav));
  const moteSources: GridCoord[] = state.motes.map((m) => toCell(m, nav));
  const crowd = new Uint16Array(nav.cols * nav.rows);
  for (const c of threatSources) crowd[c.y * nav.cols + c.x] += 1;
  return {
    threat: nav.grid.distanceField(threatSources, UNIT_COST),
    motes: nav.grid.distanceField(moteSources, UNIT_COST),
    crowd,
    computedAt: now,
  };
}

const at = (field: Float64Array, nav: NavGrid, c: GridCoord): number => field[c.y * nav.cols + c.x];

/**
 * The orbit the seat wants to hold, in sim units: the distance from the nearest
 * specimen at which it is "dancing on the edge". A high-`engage` seat holds a
 * tight orbit and eats more contact; a low-`engage` seat hangs back and banks
 * less. This single number is how a seat's movement policy differs.
 *
 * **Every orbit sits inside `killRadius`, and that is the point of the
 * coefficients.** They used to run `1.35 − 0.75 · engage`, which crosses the kill
 * radius at `engage` = 0.467 — so `kinetic`, at 0.40, wanted to hold station at
 * 189 units against a reach of 180. It was steering to a distance at which its
 * own devices could not fire, by construction, and it did it well: measured
 * realized engagement of **0.01 against a declared dial of 0.40**, against
 * `reactive` at 0.67 of 0.72. Chronically the worst seat in the roster, and this
 * is why.
 *
 * A dial that hangs back is a real personality; a dial that hangs back out of
 * range is a broken one. Re-mapped rather than clamped, because a clamp would
 * make the whole low half of the dial inert — the same defect the aperture bound
 * avoids in `../../data/arena.ts` § collectRadiusFor.
 */
export function orbitRadius(params: ArenaParams): number {
  return ARENA_BALANCE.killRadius * (0.95 - 0.45 * params.engage);
}

/**
 * The candidate set the arg-max runs over. Sixteen rather than eight: at 45°
 * quantisation the operator cannot aim at a mote, only near one, and a 70-unit
 * collect radius is narrower than the error that introduces at the 100-unit
 * lookahead. Sixteen is 22.5°, which is inside the aperture.
 */
const HEADINGS: Vec2[] = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

/**
 * Score penalty for a full 180° reversal, ramping linearly with turn angle.
 *
 * An arg-max has no memory: two candidates whose scores cross swap the heading
 * every step for as long as the crossing lasts, at no cost, and the operator
 * vibrates in place instead of moving. Measured before this term existed
 * (`../../balance/steering-probe.ts`): 775°/s of mean turn and 4 reversals a
 * second on the baseline seat — more than two full rotations per second of
 * heading change, none of it a decision.
 *
 * Sized against the score terms it competes with rather than picked: a
 * one-candidate turn (22.5°) costs 2.25, about what a single nav cell of mote
 * distance buys, so the policy still chases income; a reversal costs 18, which
 * only a real threat gradient or a near-field income pull can pay.
 */
export const TURN_COST = 18;

/**
 * How fast the operator can swing its heading, in radians per second.
 *
 * The turn cost stops the policy *choosing* to flail; this stops the body
 * following even a legitimate reversal instantly. 420°/s puts a full about-face
 * at ~0.43s — long enough to read as a turn, short enough that a specimen
 * closing from behind is still escapable. It is also what makes the render-side
 * heading pip mean something: a pip that teleports is decoration, one that
 * sweeps is a tell.
 */
export const MAX_TURN_RATE = (420 * Math.PI) / 180;

/**
 * Weight on holding bodies inside `r_kill`, per body, before the seat's `engage`
 * scales it.
 *
 * `engage` is DEFINED as the share of spawns brought inside `r_kill`
 * (`../../data/arena.ts` § Density), and until this term it reached the movement
 * policy only by moving the orbit DISTANCE — a proxy for the quantity, never the
 * quantity itself. The proxy held only because the un-damped arg-max thrashed the
 * operator back and forth through the mass; with the heading steady it collapses,
 * because the operator moves at 120 units/s against specimens at 38–70 and a
 * clean path is a permanent escape. Measured: removing the jitter alone dropped
 * the baseline seat from 1.12 kills/s to 0.56 against a closed form asking 2.59.
 *
 * So this is the channel `engage` was always supposed to have, and what keeps it
 * from becoming "stand in the crowd" is the priced contact term — see
 * `CONTACT_WEIGHT`, which this now genuinely trades against rather than losing to.
 *
 * Swept at 4 / 6 / 9 against the arc probe. Schedule delta across the four seats
 * runs (−5, −16, +2, −8) at 4, (−5, −10, +1, −7) at 6, and (−2, −7, +2, −5) at 9,
 * where the binding causes also stop being one cause in four costumes. Nothing in
 * `../../data/` moved to get there: the ladder is the target and the pilot is what
 * was corrected toward it.
 */
export const ENGAGE_WEIGHT = 9;

/**
 * Bodies inside `r_kill` past which more stop being worth anything. The widest
 * device takes 24 targets but the rest cap at 1–6 (`../../data/devices.ts`), so
 * past this the operator is buying contact risk without buying DPS.
 */
export const ENGAGE_SATURATION = 8;

/**
 * The peaked threat term's two sides. Being further from the fight than the
 * orbit is priced at `FAR_WEIGHT`; being nearer at `NEAR_WEIGHT`, which is
 * deliberately much smaller because closeness is priced properly by
 * `CONTACT_WEIGHT` in the currency it is paid in. They were one number, and that
 * is what made the contact price inert — see the comment at the call site.
 */
export const FAR_WEIGHT = 40;
export const NEAR_WEIGHT = 25;

/**
 * How far ahead the contact price looks, in sim seconds.
 *
 * Without a horizon the price is an indicator on `contactRadius` — 22 units —
 * so every candidate outside it scores exactly zero. Measured: with an
 * instantaneous price, `CONTACT_WEIGHT` was INERT across 900 → 3500, because the
 * arg-max is decided in the 22–180 unit band where the term does not exist. A
 * price that only speaks once you are already being hit is not a price.
 *
 * Specimens close at 38–70 units/s, so ~1.5s widens the term to ~130 units — the
 * band the decision is actually made in — and makes it continuous in distance
 * rather than a step. It is also what the quantity means: what standing here
 * will cost, not whether something is touching at this instant.
 */
export const CONTACT_HORIZON = 1.5;

/**
 * Score per specimen a heading-bound device would land, and how far ahead of its
 * activation the policy starts caring.
 *
 * `cone` fires along the movement heading (`./dispatch.ts` `isHeadingBound`) and
 * nothing in this score knew that, which is the § Couplings corollary in its
 * second costume: a thing that does not appear in the score does not reach the
 * policy. Measured consequence — the Culture Sprayer connected on 27–56% of
 * shots and returned **0.2–0.7% of kills on every seat**, while two seats spent
 * six and seven draft levels on it. Not a weak device: a trap.
 *
 * The term is weighted by IMMINENCE rather than applied flat, and that is what
 * makes the manoeuvre a manoeuvre. A device three seconds from firing is worth
 * nothing to face; one about to fire is worth turning for. So the policy kites,
 * swings to put the mass in the wedge as the cooldown comes up, fires, and the
 * term collapses again — a cone dance that EMERGES from the score rather than a
 * scripted state machine bolted beside it. That matters because the operator has
 * no other memory: a scripted manoeuvre would have to be interrupted by the
 * contact price and the wall term by hand, where a score term is simply outvoted.
 *
 * Counted in targets rather than damage on purpose. Device damage scales ~10x
 * across a run and every other term here is flat, so pricing the connect in
 * damage would make it swamp the score late for reasons that have nothing to do
 * with whether the wedge points at anything.
 */
export const CONNECT_WEIGHT = 25;
export const CONNECT_HORIZON = 1.2;

/**
 * Score per unit of "share of remaining HP per second" a candidate position
 * would cost in contact damage.
 *
 * This replaced a flat −400 cliff below `contactRadius · 2.5`, and the swap is
 * the difference between forbidding contact and pricing it. Measured, that cliff
 * was the entire policy: its spread across the candidate set ran ~390–435
 * against `engage` at 17–31, mote at 3–5 and turn at 18, at EVERY density band,
 * and it split the candidate set on 89–100% of decisions. Nothing else could
 * reach past it, so the operator was a flee-bot with preferences — and because
 * the 55-unit margin it demanded is unaffordable on a floor with a body every
 * ~30 units, the back half of a run had no candidate pointing at the fight.
 * A density-blind safety margin and "flee" are the same instruction once density
 * arrives.
 *
 * The cost is priced in the sim's own damage formula (`./step.ts` § contact:
 * mean per-specimen damage, saturating at `contactSaturation` bodies, divided by
 * toughness), then normalised by REMAINING hp. That normalisation is the whole
 * design: the same crowd is a cheap trade at full health and a lethal one at a
 * fifth of it, so caution emerges from the run's state instead of being a
 * constant, and a seat's `toughness` finally reaches the movement policy — which
 * is what makes guns-versus-butter a decision the policy actually takes.
 *
 * Swept at 900 / 2500 against the arc probe, with `CONTACT_HORIZON` in place —
 * without it the sweep is meaningless, because the term is inert. At 900 three
 * seats reach the full arc and η lands at 0.45–0.81; at 2500 the operator backs
 * off enough to lose kill rate outright (kinetic 0.68 → 0.48 kills/s) and the
 * schedule deficit widens to −21. 900 is the shallower side of that trade on
 * purpose: this term competes with `engage` for the same decisions, so pushing it
 * buys survival by not playing.
 *
 * The resulting landscape is the point of the whole exercise. Term spreads now
 * read threat 34–133, engage 14–33, mote 12–15, turn 18 — one order of magnitude,
 * where the cliff sat at 20x everything else. Threat still leads, because it is
 * the risk term and should; it no longer decides alone.
 */
export const CONTACT_WEIGHT = 900;

/**
 * Score per sim unit of distance closed on a collector pickup.
 *
 * A collector is worth a detour a single mote is not: one pull banks the whole
 * worked field (`./step.ts` § collector pickup), so routing to it THROUGH the
 * uncollected field is the decision `../../IDENTITY.md` says it exists to
 * create — and a decision needs a term, or it is not one.
 *
 * Sized against the terms it competes with rather than picked. The mote field is
 * scored in nav CELLS at 2.5 per cell, so a cell of mote distance buys 2.5; at
 * 0.125 per unit a collector buys 12.5 over the same 100 units, five mote-cells.
 * Across the 100-unit lookahead that is a spread of up to ~25 between opposed
 * headings — enough to outvote the turn cost (18) and a mild mote pull, and
 * nowhere near the contact cliff (−400). The operator detours for it; it does
 * not walk into the mass for it.
 */
export const COLLECTOR_WEIGHT = 0.125;

/**
 * Score per sim unit of distance closed on the nearest mote, and the radius
 * within which that exact term applies at all.
 *
 * The nav-grid mote field routes across the floor and is good at it; what it
 * cannot do is decide a dive. `lookahead` is exactly `NAV_CELL`, so all sixteen
 * candidates land within about one cell of each other on a cell-quantised
 * field — measured spread 3–5, against a turn cost of 18. The dive was therefore
 * not outvoted, it was UNAFFORDABLE, and no weight on the grid term fixes that
 * because the ceiling is geometric rather than scalar.
 *
 * So this is the same division of labour the threat term already runs: the grid
 * keeps routing and reachability, an exact near-field term resolves the approach.
 * Scoped to a radius because it is a local decision — beyond it the grid field is
 * both cheaper and better, and summing them everywhere would double-count the
 * same pull.
 *
 * Sized so a dive is affordable without being compulsory: across two opposed
 * candidates 200 units apart it spreads ~30 before `eta`, which clears the turn
 * cost. It sits below `COLLECTOR_WEIGHT` on purpose — one pull banks the whole
 * worked field, a single mote does not.
 */
export const MOTE_NEAR_WEIGHT = 0.15;
export const MOTE_NEAR_RADIUS = NAV_CELL * 3;

/**
 * Rotate `current` toward `desired` by at most the step's turn budget.
 *
 * Separating the DECISION (a global arg-max over all sixteen headings) from its
 * EXECUTION (a rate-limited swing) is what keeps the policy able to see the best
 * direction anywhere on the compass while still moving like something with mass.
 * A slew-limited candidate cone would have coupled the two and left the operator
 * unable to turn around at all.
 */
export function slewHeading(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const cross = current.x * desired.y - current.y * desired.x;
  const dot = current.x * desired.x + current.y * desired.y;
  const delta = Math.atan2(cross, dot);
  const budget = MAX_TURN_RATE * dt;
  if (Math.abs(delta) <= budget) return desired;
  const step = delta > 0 ? budget : -budget;
  const cos = Math.cos(step);
  const sin = Math.sin(step);
  return {
    x: current.x * cos - current.y * sin,
    y: current.x * sin + current.y * cos,
  };
}

/**
 * One candidate heading's score, broken into the terms that produced it.
 *
 * The breakdown is not decoration: an arg-max is decided by the SPREAD of a term
 * across candidates, never by its level. A term that reads the same on all
 * sixteen headings — a contact cliff that fires everywhere, an engage term
 * saturated everywhere — subtracts a constant and drops out of the decision
 * entirely, however large it is. `../../balance/steering-probe.ts` reads these
 * spreads, which is the only way to see a term stop steering.
 */
export interface HeadingScore {
  heading: Vec2;
  /** Peaked orbit term, priced contact included. */
  threat: number;
  /** Whether this candidate would be in contact at all — the priced branch. */
  cliff: boolean;
  engage: number;
  /** Expected targets a heading-bound device would land, times imminence. */
  connect: number;
  /** Grid-routed mote pull. Unweighted; `total` applies `eta` and its 2.5. */
  mote: number;
  /** Exact near-field mote pull. Unweighted; `total` applies `eta`. */
  moteNear: number;
  /** Unweighted; `total` applies `eta`. */
  collector: number;
  wall: number;
  turn: number;
  total: number;
}

/**
 * Score every in-bounds candidate heading by weighted utility over the composed
 * fields — the kernel the parked primitive describes, with a continuous
 * candidate set.
 *
 * The first term is why this is not simply "flee":
 *
 *  - **threat**, peaked at `orbitRadius` rather than monotone. Running away is as
 *    wrong as standing still, because distance is zero damage and zero income.
 *  - **motes**, pulling toward uncollected income. The dive back through cleared
 *    space is this term winning over the threat term.
 *  - **collector**, a much steeper pull toward the rare pickup. See
 *    `COLLECTOR_WEIGHT`.
 *  - **walls**, a hard penalty. Corners are where a monotone flee-policy kills
 *    itself, which is why the threat term is peaked and the wall term is separate.
 *  - **turn cost**, the memory an arg-max otherwise has none of. See `TURN_COST`.
 *
 * Candidates that leave the map are omitted rather than scored, so the returned
 * set is what the arg-max actually chose between.
 */
export function scoreHeadings(
  state: ArenaState,
  nav: NavGrid,
  fields: Fields,
  params: ArenaParams,
): HeadingScore[] {
  const lookahead = NAV_CELL;
  const { mapWidth, mapHeight, killRadius } = ARENA_BALANCE;
  const killRadius2 = killRadius * killRadius;
  const orbit = orbitRadius(params);
  const current = state.operator.heading;
  const { contactRadius } = ARENA_BALANCE;
  const moteNear2 = MOTE_NEAR_RADIUS * MOTE_NEAR_RADIUS;
  const scored: HeadingScore[] = [];

  // Only specimens this far out can change the near-field term: past it every
  // candidate reads the same saturated `offset > 1`, which is the branch a floor
  // with no specimens on it already takes. Filtering once is one pass over the
  // census instead of one per candidate heading.
  const relevant: Specimen[] = [];
  const reach = lookahead + orbit * 3;
  const reach2 = reach * reach;
  for (const s of state.specimens) {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    if (dx * dx + dy * dy <= reach2) relevant.push(s);
  }

  for (const h of HEADINGS) {
    const px = state.operator.x + h.x * lookahead;
    const py = state.operator.y + h.y * lookahead;

    // Wall term: a hard reject outside, a ramp near the edge.
    const margin = Math.min(px, py, mapWidth - px, mapHeight - py);
    if (margin < 0) continue;
    const wallPenalty = margin < NAV_CELL * 2 ? (NAV_CELL * 2 - margin) / NAV_CELL : 0;

    const cell = toCell({ x: px, y: py }, nav);
    const moteDist = at(fields.motes, nav, cell);

    // NEAR field, exact and continuous. The nav grid is 100 units to a cell and
    // contact happens at 22, so a grid-sampled threat distance cannot see the
    // thing that kills you — steering on it alone let specimens walk into contact
    // while the field still read "correct orbit". This is the term that actually
    // holds the edge; the grid keeps the jobs it is good at (routing to motes,
    // reachability), which is the division of labour, not a workaround.
    let nearest = Number.POSITIVE_INFINITY;
    let inKill = 0;
    // Expected contact over `CONTACT_HORIZON`, not contact at this instant.
    // `share` is the fraction of the horizon a closing specimen would spend
    // inside `contactRadius`: 1 if it is already touching, tapering to 0 at the
    // distance it cannot cross in time. Summing the shares gives the expected
    // touching COUNT, which is what the sim's saturation curve takes.
    let expectedTouching = 0;
    let damageSum = 0;
    for (const s of relevant) {
      const d2 = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
      if (d2 < nearest) nearest = d2;
      if (d2 <= killRadius2) inKill++;
      const closeBand = s.speed * CONTACT_HORIZON;
      if (d2 <= (contactRadius + closeBand) * (contactRadius + closeBand)) {
        const share =
          closeBand > 0
            ? Math.min(1, Math.max(0, (contactRadius + closeBand - Math.sqrt(d2)) / closeBand))
            : 1;
        expectedTouching += share;
        damageSum += s.contactDamage * share;
      }
    }
    nearest = Math.sqrt(nearest);

    // Peaked at the orbit, and ASYMMETRIC about it. The far side keeps the full
    // weight — disengaging is the failure this term exists to price, and distance
    // is zero damage and zero income. The near side is deliberately gentle,
    // because the risk of being close is priced once, below, in the currency it
    // is actually paid in. Charging it here as well made the cheap charge decide:
    // the near side alone reached −40 against an `engage` spread that measures
    // 17–31, so a candidate in contact lost before `CONTACT_WEIGHT` was read and
    // the price was inert at any value.
    const offset = Number.isFinite(nearest) ? (nearest - orbit) / orbit : 1;
    let threatTerm = -(offset * offset) * (offset > 0 ? FAR_WEIGHT : NEAR_WEIGHT);

    // Contact is PRICED, not forbidden — see `CONTACT_WEIGHT`. This is the sim's
    // own damage rate (`./step.ts` § contact) over remaining hp, so the policy
    // scores exactly what it will be charged.
    const cliff = expectedTouching > 0;
    if (cliff) {
      const hpPerSecond =
        ((damageSum / expectedTouching) *
          Math.min(1, expectedTouching / THREAT_BALANCE.contactSaturation)) /
        (params.toughnessMul * params.metaSurvival);
      threatTerm -= CONTACT_WEIGHT * (hpPerSecond / Math.max(1, state.operator.hp));
    }

    const moteTerm = Number.isFinite(moteDist) ? -moteDist : -nav.cols;

    // Exact near field for motes, for the reason the collector term is exact: a
    // 100-unit cell cannot resolve an approach that has to end inside a ~70-unit
    // aperture. Zero outside the radius, so it adds a decision rather than a bias.
    let moteNearTerm = 0;
    let nearestMote = Number.POSITIVE_INFINITY;
    for (const m of state.motes) {
      const d2 = (m.x - px) * (m.x - px) + (m.y - py) * (m.y - py);
      if (d2 < nearestMote) nearestMote = d2;
    }
    if (nearestMote <= moteNear2) {
      moteNearTerm = (Math.sqrt(nearestMote) - MOTE_NEAR_RADIUS) * MOTE_NEAR_WEIGHT;
    }

    // Collectors are scored in exact sim units rather than off the nav grid: one
    // drops inside `r_kill` and a 100-unit cell cannot resolve an approach that
    // has to end inside a ~70-unit aperture. Same division of labour as the near
    // field above.
    let collectorTerm = 0;
    if (state.collectors.length > 0) {
      let nearestCollector = Number.POSITIVE_INFINITY;
      for (const c of state.collectors) {
        const d2 = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py);
        if (d2 < nearestCollector) nearestCollector = d2;
      }
      collectorTerm = -Math.sqrt(nearestCollector) * COLLECTOR_WEIGHT;
    }

    // What the heading-bound devices would actually hit if the operator faced
    // this way, discounted by how soon they fire. Scored through the dispatcher's
    // own `selectTargets` rather than a wedge test written beside it, so the
    // policy cannot come to believe in coverage the sim does not grant.
    let connectTerm = 0;
    for (const rt of state.devices) {
      if (!isHeadingBound(rt.defId)) continue;
      const imminence = 1 - Math.min(1, Math.max(0, rt.timer) / CONNECT_HORIZON);
      if (imminence <= 0) continue;
      const reach = deviceReach(rt, state.reagentStacks);
      const { targets } = selectTargets(rt, state.operator, h, reach, relevant);
      connectTerm += CONNECT_WEIGHT * targets.length * imminence;
    }

    // Turning is not free. `dot` with the current heading is 1 straight ahead and
    // −1 behind, so this is a linear ramp from nothing to a full `TURN_COST`.
    const turnCost = TURN_COST * 0.5 * (1 - (h.x * current.x + h.y * current.y));

    // The seat's appetite for the fight — see `ENGAGE_WEIGHT`.
    const engageTerm = params.engage * ENGAGE_WEIGHT * Math.min(inKill, ENGAGE_SATURATION);

    // η is the seat's appetite for the dive; it is exactly the weight on income,
    // and a collector is income — so it rides the same dial rather than a new one.
    const score =
      threatTerm +
      engageTerm +
      connectTerm +
      params.eta * (2.5 * moteTerm + moteNearTerm + collectorTerm) -
      wallPenalty * 8 -
      turnCost;

    scored.push({
      heading: h,
      threat: threatTerm,
      cliff,
      engage: engageTerm,
      connect: connectTerm,
      mote: moteTerm,
      moteNear: moteNearTerm,
      collector: collectorTerm,
      wall: -wallPenalty * 8,
      turn: -turnCost,
      total: score,
    });
  }
  return scored;
}

/**
 * The arg-max over `scoreHeadings`. The heading this returns is what the operator
 * WANTS; `slewHeading` decides how much of it the step can deliver.
 */
export function chooseHeading(
  state: ArenaState,
  nav: NavGrid,
  fields: Fields,
  params: ArenaParams,
): Vec2 {
  let best = state.operator.heading;
  let bestScore = -Infinity;
  for (const s of scoreHeadings(state, nav, fields, params)) {
    if (s.total > bestScore) {
      bestScore = s.total;
      best = s.heading;
    }
  }
  return best;
}

/**
 * Whether the operator has a way out of its local threat mass. Reachability, not
 * distance — this is the traversal-collapse detector, and it is the reason the
 * `bfs` surface earns its place rather than being defensive code.
 */
export function hasEscape(state: ArenaState, nav: NavGrid, fields: Fields): boolean {
  if (state.specimens.length === 0) return true;
  const here = toCell(state.operator, nav);
  const reachable = nav.grid.bfs(
    here,
    (_, x, y) => fields.crowd[y * nav.cols + x] < BLOCKING_CROWD,
  );
  return reachable.size >= ESCAPE_FLOOR;
}
