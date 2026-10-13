/**
 * The reference gardener: the player the probes drive. Balance-harness
 * tooling, not a mechanic. The Walled Garden has no player-facing automation,
 * so nothing here re-implements one.
 *
 * Its shape is td-arcade's forward-build maze planner, cut down to one board
 * and one purse (`bevy-games/td-arcade/src/balance/planner/maze/`). Each build
 * phase makes four decisions in order.
 *
 * **Which forms.** It reads the next three nights and sets a target split of
 * hunting compost across forms: each night asks for its best learned form,
 * ties shared. That is the split `formShares` assumes, read off the preview.
 *
 * **Answer the coming night.** td-arcade's walls are its cheapest towers, so
 * its opening walls carry the opening wave (`arbiter.rs`: no bundled board has
 * a non-shooting brick). A hedge deals nothing. So the gardener first arms,
 * with the forms that hurt tonight's kind, until the share of its stream
 * capacity a board lands (`land`, and the kind's toll) covers tonight's pool.
 * The pool is sized `pressure · land · toll · C · answer`, so that is the
 * spine's reference capacity against tonight, scaled by the night's pressure,
 * and the floor cannot move what `land` and the tolls are measured from. Each hit counts only up to
 * tonight's pest HP (td-arcade 819a9d5, per-shot saturation): a thrush cannot
 * clear a swarm faster than it shoots. This is td-arcade's demand clamp turned
 * round: the clamp stops walls once capacity meets the schedule's peak feed,
 * and here walls wait until capacity meets the next night's.
 *
 * **Then route, priced against the arms** (`weave/walls_new.rs`, the purse
 * rule; `weave/arbiter.rs`, its pricing). Hedges come as runs from walk-greedy
 * maze-max (`walk.rs`): each hedge on the route cell that most raises the
 * route's score, length plus the coverage it passes, chained until the run's
 * joint gain clears `MIN_GAIN`. That chain is how a pair that blocks two
 * parallel corridors is found where either hedge alone flips the route
 * sideways for nothing (`walk.rs` `best_run`). Each run is priced whole:
 *
 *   score(R)   = Δ Σ_route seconds × (C(cell) + λ)
 *   C(cell)    = what the standing hunters reaching the cell deal per second
 *   λ          = compost the rest of the plot will pay × damage per compost
 *                of the best hunter ÷ seconds of route now
 *   density(R) = score(R) / cost(R)
 *
 * λ is the flat prior: the hunters later income will stand along the route,
 * spread over it, so a hedge laid on the first day is credited with the
 * hunters that will line it. A run is bought when it is the build's first and
 * scores above zero, or when its density clears the exchange price. That
 * price comes from a dry run of the arm pass over the whole purse. Compost it
 * cannot convert into any hunter is free for hedges (price 0); past it, the
 * price is the dry run's last marginal density. The read is retaken after
 * every run bought, because hedges are where hunters stand: each run raises
 * the next read, and the split settles per build and per map where
 * lengthening stops beating hunting. No share of the purse is fixed.
 *
 * **Then arm** (`weave.rs` arms, `dwell.rs`). Purchase by purchase it serves
 * the form furthest below its target, in the same currency: seconds of pest
 * presence in reach × damage, per compost. Each hunter counts at how much the
 * coming nights want its form, and half again where a marigold touches it. A
 * trap's worth is the presence its slow adds under the hunters standing.
 * Arms stand on hedges, re-typed in place, or off the route, never on it, so
 * they cannot move the maze they are priced against. If the form has nothing
 * affordable and nothing standing to feed, it saves.
 *
 * Cut from td-arcade, each for a problem one small board does not have: the
 * payer auction across seats, the door-prefix program, and the demand clamp
 * itself, whose waste stop the purse's exchange price covers on a board this
 * size.
 *
 * Calls it a day the moment the build is spent, when `callEarly` is set; the
 * first wave is always called, because it waits for the gardener. Between
 * plots, spends almanac notes evenly across the lessons.
 */
import { Decimal } from '@open-loop/engine';
import {
  ARMOUR,
  FORMS,
  FORM_VS_ARMOUR,
  KIND_TOLL,
  LESSONS,
  SPEED_MULT,
  MAX_LEVEL,
  REFUND_RATE,
  levelMultiplier,
  upgradeCost,
  waveIncome,
  type Form,
  type PlantId,
} from '../data';
import type { GardenApi, PlotApi, PlotRun } from '../modules';

const num = (v: unknown) => new Decimal(v as never).toNumber();

/** Nights the gardener reads ahead: the preview the plot screen shows. */
const PREVIEW = 3;
/** Route score a hedge run must add, jointly, to count as lengthening: a noise floor, as td-arcade's `walk.rs` `MIN_GAIN`. */
const MIN_GAIN = 0.01;
/**
 * Hedges a run may chain while searching for that gain. Measured, not assumed
 * (`maze-probe.ts`): 10 is the smallest depth no plot improves past. Pests
 * walk four-connected, so on open beds every single hedge leaves an
 * equal-length route, and only a barrier across the bed forces a detour. The
 * plateau is wider than td-arcade's, whose eight-connected walk settles at 3.
 */
const LOOKAHEAD = 10;

type Point = { x: number; y: number };
const key = (c: Point) => `${c.x},${c.y}`;

/** The share of the coming nights each learned form answers best. */
export function formDemand(
  garden: GardenApi,
  run: PlotRun,
  grows: (id: PlantId) => boolean,
): Record<Form, number> {
  const specs = Object.values(garden.specs.value);
  const learned = FORMS.filter((f) => specs.some((s) => s.form === f && grows(s.id)));
  const want: Record<Form, number> = { peck: 0, release: 0, hawk: 0 };
  const nights = run.preview(PREVIEW);
  for (const n of nights) {
    const armour = ARMOUR[n.kind];
    const best = Math.max(0, ...learned.map((f) => FORM_VS_ARMOUR[f][armour]));
    if (best === 0) continue;
    const answers = learned.filter((f) => FORM_VS_ARMOUR[f][armour] === best);
    for (const f of answers) want[f] += 1 / answers.length / nights.length;
  }
  return want;
}

export interface GardenerOptions {
  /** Call it a day once the build is spent. Off, only the first wave is called. */
  callEarly: boolean;
  /** Told the label of every purchase. */
  onBuy?: (what: string) => void;
  /** Plants the gardener never grows, to ask whether a turn of the wheel, or the maze, needs them. */
  refuse?: PlantId[];
}

// ─── Route ─────────────────────────────────────────────────────────────────

/** Routing field with `walls` blocked on top of the board; the gap's entry is the route length. */
function fieldWith(run: PlotRun, walls: Set<string>): Float64Array {
  return run.grid.distanceField([run.seedbed], (cell, x, y) =>
    cell.terrain === 'stone' || cell.plantId !== null || walls.has(`${x},${y}`) ? Infinity : 1,
  );
}

/** The route a pest walks from the gap down a routing field, as `PlotRun.route` walks it. */
function routeDown(run: PlotRun, field: Float64Array): Point[] {
  const w = run.grid.width;
  const cells: Point[] = [];
  let c = { ...run.gap };
  for (let guard = 0; guard < w * run.grid.height; guard++) {
    cells.push(c);
    if (c.x === run.seedbed.x && c.y === run.seedbed.y) break;
    let next: Point | null = null;
    let bestD = field[c.y * w + c.x];
    for (const n of run.grid.neighbors(c.x, c.y)) {
      const d = field[n.y * w + n.x];
      if (d < bestD) {
        bestD = d;
        next = n;
      }
    }
    if (!next) break;
    c = next;
  }
  return cells;
}

/**
 * The next hedges worth laying, and the route they leave: greedy picks on a
 * scratch board, each the route cell whose wall leaves the best-scoring
 * still-open route (ties to the lower cell index), until their joint gain
 * clears `MIN_GAIN`. Null when no run within `LOOKAHEAD` raises the score:
 * the maze is done growing here, as far as this search can see.
 */
export function bestRun(
  run: PlotRun,
  score: (route: Point[]) => number,
  lookahead = LOOKAHEAD,
): { picks: Point[]; route: Point[] } | null {
  const w = run.grid.width;
  const walls = new Set<string>();
  let route = run.route();
  const from = score(route);
  const picks: Point[] = [];
  for (let k = 0; k < lookahead; k++) {
    let best: { c: Point; score: number; route: Point[] } | null = null;
    for (const c of route.slice(1, -1)) {
      const cell = run.grid.at(c.x, c.y);
      if (cell.terrain !== 'open' || cell.plantId !== null || walls.has(key(c))) continue;
      walls.add(key(c));
      const f = fieldWith(run, walls);
      walls.delete(key(c));
      if (!Number.isFinite(f[run.gap.y * w + run.gap.x])) continue;
      const after = routeDown(run, f);
      const sc = score(after);
      const better =
        !best || sc > best.score || (sc === best.score && c.y * w + c.x < best.c.y * w + best.c.x);
      if (better) best = { c, score: sc, route: after };
    }
    if (!best) return null;
    picks.push(best.c);
    walls.add(key(best.c));
    route = best.route;
    if (best.score - from >= MIN_GAIN) return { picks, route };
  }
  return null;
}

// ─── Arm ───────────────────────────────────────────────────────────────────

/** A plant as the gardener weighs it, standing or imagined. */
type Spot = Point & { def: PlantId; level: number; spent: number };

/**
 * What a dry arm pass read off the purse: its last marginal density, what it
 * could not convert, and the density of the purchase it saves toward, if any.
 * A saving is a claim on the compost it holds back, priced at that density,
 * never free (`weave/walls_new.rs`: the aim's claim is priced, never held).
 */
interface ArmRead {
  last: number;
  free: number;
  aim: number;
}

/** Spend one build phase, then call the wave when the options say so. */
export function tendPlot(
  garden: GardenApi,
  plot: PlotApi,
  run: PlotRun,
  opts: GardenerOptions,
): void {
  const a = garden.anchors.value;
  const specs = garden.specs.value;
  const compost = () => num(plot.compost.value);
  const grows = (id: PlantId) => garden.isPlantUnlocked(id) && !opts.refuse?.includes(id);
  const want = formDemand(garden, run, grows);
  const flight = run.flightLine();
  const amp = specs.marigold.amp;
  const hunters = (Object.keys(specs) as PlantId[]).filter((id) => specs[id].form !== null);
  const refund = Math.floor(specs.hedge.cost * REFUND_RATE);
  const dpsOf = (id: PlantId, level: number) =>
    (specs[id].damage / specs[id].cooldown) *
    (specs[id].splash > 0 ? 2 : 1) *
    levelMultiplier(a, level);
  const rangeOf = (t: Spot) => specs[t.def].range + 0.25 * (t.level - 1);
  const touches = (p: Point, q: Point) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) === 1;
  const standing = (): Spot[] => [...run.plants.values()];

  /** Seconds a slug-speed pest spends in a cell, under the traps among `spots` and an imagined one. */
  const dwell = (c: Point, spots: Spot[], trap?: Point) => {
    for (const t of trap ? [...spots, { ...trap, def: 'trap' as PlantId }] : spots)
      if (specs[t.def].slow > 0 && Math.hypot(c.x - t.x, c.y - t.y) <= specs.trap.range)
        return 1 / (1 - specs.trap.slow) / a.pestSpeed;
    return 1 / a.pestSpeed;
  };
  /** Damage a hunter deals over one pass of its line, unboosted, weighted by how much the coming nights want its form. */
  const reach = (t: Spot, route: Point[], spots: Spot[], trap?: Point) => {
    const f = specs[t.def].form;
    if (f === null) return 0;
    let seconds = 0;
    for (const c of f === 'hawk' ? flight : route)
      if (Math.hypot(c.x - t.x, c.y - t.y) <= rangeOf(t)) seconds += dwell(c, spots, trap);
    return seconds * dpsOf(t.def, t.level) * want[f];
  };
  const boosted = (t: Point, spots: Spot[]) =>
    spots.some((m) => specs[m.def].amp > 0 && touches(m, t));

  // The coming night, as the preview shows it: its kind, its pool in slug-speed HP, and how long it streams.
  const tonight = run.preview(1)[0];
  const armour = ARMOUR[tonight.kind];
  const pool = tonight.pests.reduce((t, u) => t + u.hp * SPEED_MULT[u.kind], 0);
  const stream = Math.max(...tonight.pests.map((u) => u.at));
  /** Tonight's mean pest HP: no hit removes more than this (td-arcade 819a9d5, per-shot saturation). */
  const hp = tonight.pests.reduce((t, u) => t + u.hp, 0) / tonight.pests.length;
  /** What one shot of a hunter removes from tonight's pests: its hit, against their armour, capped at their HP. */
  const shot = (t: Spot, boost: number) => {
    const f = specs[t.def].form;
    const m = f === null ? 0 : FORM_VS_ARMOUR[f][armour];
    return Math.min(specs[t.def].damage * levelMultiplier(a, t.level) * m * boost, hp);
  };
  const answers = FORMS.filter((f) => FORM_VS_ARMOUR[f][armour] > 0 && want[f] > 0);
  /**
   * The board's stream capacity against tonight's kind: every plant that can
   * hurt it fires from the first arrival to the last departure from its reach,
   * one pest at a time (the spine's `C`, and td-arcade's capped capacity).
   */
  const capacity = (spots: Spot[], route: Point[]) => {
    let c = 0;
    for (const t of spots) {
      const removed = shot(t, boosted(t, spots) ? 1 + amp : 1);
      if (removed === 0) continue;
      let seconds = 0;
      for (const cell of armour === 'wing' ? flight : route)
        if (Math.hypot(cell.x - t.x, cell.y - t.y) <= rangeOf(t)) seconds += dwell(cell, spots);
      const hits = specs[t.def].splash > 0 ? 2 : 1;
      c += (removed * hits * (stream + seconds)) / specs[t.def].cooldown;
    }
    return c;
  };

  /**
   * One arm pass over `budget`. Committed, it plants; dry, it only imagines,
   * and reports the density of its last purchase and what it left. With
   * `floor`, it serves only the forms that hurt tonight's kind, and stops once
   * the board's capacity against it covers tonight's pool.
   */
  function armPass(commit: boolean, budget: number, floor = false): ArmRead {
    const route = run.route();
    const onRoute = new Set(route.map(key));
    let spots = standing();
    let last = 0;
    for (let guard = 0; guard < 400; guard++) {
      if (floor && capacity(spots, route) * a.land * KIND_TOLL[tonight.kind] >= pool) break;
      const live = spots.filter((t) => specs[t.def].form !== null);
      const have: Record<Form, number> = { peck: 0, release: 0, hawk: 0 };
      let hunting = 0;
      for (const t of live) {
        have[specs[t.def].form!] += t.spent;
        hunting += t.spent;
      }
      const lag = (f: Form) => want[f] - (hunting ? have[f] / hunting : 0);
      const form = (floor ? answers : FORMS.filter((f) => want[f] > 0)).sort(
        (x, y) => lag(y) - lag(x),
      )[0];
      if (!form) break;
      const choices = hunters.filter(
        (id) => specs[id].form === form && grows(id) && specs[id].cost <= budget + refund,
      );
      // A form with nothing affordable saves for it rather than buying the wrong answer.
      if (choices.length === 0 && !live.some((t) => specs[t.def].form === form)) {
        let aim = 0;
        for (const id of hunters) {
          if (specs[id].form !== form || !grows(id)) continue;
          for (let y = 0; y < run.grid.height; y++)
            for (let x = 0; x < run.grid.width; x++) {
              const cell = run.grid.at(x, y);
              if (cell.terrain !== 'open' || cell.plantId !== null || onRoute.has(`${x},${y}`))
                continue;
              const t = { x, y, def: id, level: 1, spent: specs[id].cost };
              const boost = boosted(t, spots) ? 1 + amp : 1;
              aim = Math.max(aim, (reach(t, route, spots) * boost) / specs[id].cost);
            }
        }
        return { last, free: 0, aim };
      }
      if (grows('marigold')) choices.push('marigold');
      if (grows('trap') && form !== 'hawk') choices.push('trap');

      type Act = { score: number; cost: number; label: string; apply: () => boolean };
      let best: Act | null = null;
      const consider = (act: Act) => {
        if (!best || act.score > best.score) best = act;
      };
      const taken = new Map(spots.map((t) => [key(t), t]));
      for (let y = 0; y < run.grid.height; y++)
        for (let x = 0; x < run.grid.width; x++) {
          if (run.grid.at(x, y).terrain !== 'open') continue;
          const here = taken.get(`${x},${y}`);
          // Arms stand on a hedge, re-typed in place, or off the route; never on it.
          if (here ? here.def !== 'hedge' : onRoute.has(`${x},${y}`)) continue;
          const site = { x, y };
          for (const id of choices) {
            const cost = specs[id].cost - (here ? refund : 0);
            if (cost > budget) continue;
            let gain = 0;
            if (specs[id].form !== null) {
              const t = { ...site, def: id, level: 1, spent: specs[id].cost };
              gain = reach(t, route, spots) * (boosted(site, spots) ? 1 + amp : 1);
            } else if (id === 'marigold') {
              // A boost on a hit that already kills is wasted: credit only what it adds below tonight's HP.
              for (const t of live) {
                if (!touches(site, t) || boosted(t, spots)) continue;
                const plain = shot(t, 1);
                const nominal = specs[t.def].damage * levelMultiplier(a, t.level) * amp;
                const eta = nominal > 0 ? Math.max(0, (shot(t, 1 + amp) - plain) / nominal) : 0;
                gain += reach(t, route, spots) * amp * Math.min(1, eta);
              }
            } else {
              for (const t of live)
                gain +=
                  (reach(t, route, spots, site) - reach(t, route, spots)) *
                  (boosted(t, spots) ? 1 + amp : 1);
            }
            if (gain <= 0) continue;
            consider({
              score: gain / cost,
              cost,
              label: id,
              apply: () => {
                if (!commit) {
                  spots = [
                    ...spots.filter((t) => t !== here),
                    { ...site, def: id, level: 1, spent: specs[id].cost },
                  ];
                  return true;
                }
                const hedge = here && run.grid.at(x, y).plantId;
                if (hedge && !run.digUp(hedge)) return false;
                if (run.plant(id, x, y)) return true;
                if (hedge) run.plant('hedge', x, y);
                return false;
              },
            });
          }
        }
      for (const t of live) {
        if (specs[t.def].form !== form) continue;
        if (t.level >= MAX_LEVEL) continue;
        const price = upgradeCost(a, specs[t.def].cost, t.level);
        const real = [...run.plants.values()].find((p) => p.x === t.x && p.y === t.y);
        if (price > budget) continue;
        const raised = { ...t, level: t.level + 1 };
        const gain =
          (reach(raised, route, spots) - reach(t, route, spots)) *
          (boosted(t, spots) ? 1 + amp : 1);
        consider({
          score: gain / price,
          cost: price,
          label: `${t.def} L${raised.level}`,
          apply: () => {
            if (commit) return real ? run.upgrade(real.id) : false;
            spots = spots.map((s) => (s === t ? { ...raised, spent: t.spent + price } : s));
            return true;
          },
        });
      }
      if (!best) break;
      const act: Act = best;
      if (!act.apply()) break;
      last = act.score;
      budget = commit ? compost() : budget - act.cost;
      if (commit) {
        spots = standing();
        opts.onBuy?.(act.label);
      }
    }
    return { last, free: budget, aim: 0 };
  }

  // Hedges deal nothing, so the board answers the coming night before it routes:
  // td-arcade's walls are its cheapest towers and carry the opening themselves.
  armPass(true, compost(), true);

  // Then route, priced against the arms.
  if (grows('hedge') && want.hawk < 1) {
    const plotWaves = run.totalWaves;
    let ahead = 0;
    for (let w = run.wave; w <= plotWaves; w++) ahead += waveIncome(a, w);
    // In the dark, one release past what is authored, never the tail: HP outgrows bounty, so
    // income comes only from a night already survived (td-arcade `arbiter.rs` `remaining_income_for`).
    if (run.tail) ahead += waveIncome(a, run.wave);
    const ground = hunters.filter((id) => specs[id].form !== 'hawk' && grows(id));
    const perCompost = Math.max(...ground.map((id) => dpsOf(id, 1) / specs[id].cost));
    let spent = 0;
    let first = true;
    for (let guard = 0; guard < 40; guard++) {
      const spots = standing();
      const live = spots.filter((t) => specs[t.def].form !== null && specs[t.def].form !== 'hawk');
      /** C(cell): what the standing ground hunters reaching it deal per second, boosts in. */
      const cover = (c: Point) => {
        let v = 0;
        for (const t of live)
          if (Math.hypot(c.x - t.x, c.y - t.y) <= rangeOf(t))
            v +=
              dpsOf(t.def, t.level) * want[specs[t.def].form!] * (boosted(t, spots) ? 1 + amp : 1);
        return v;
      };
      const route = run.route();
      const seconds = (r: Point[]) => r.reduce((s, c) => s + dwell(c, spots), 0);
      const lambda = (ahead * perCompost * (1 - want.hawk)) / seconds(route);
      const account = (r: Point[]) =>
        r.reduce((s, c) => s + dwell(c, spots) * (cover(c) + lambda), 0);
      const peak = Math.max(0, ...route.map(cover));
      // Selection: route length plus the coverage it passes, peak-normalised (`arbiter.rs` `as_zone`).
      const select = (r: Point[]) =>
        peak > 0
          ? r.length + r.reduce((s, c) => s + (cover(c) + lambda) / (peak + lambda), 0)
          : r.length;
      const found = bestRun(run, select);
      if (!found) break;
      const cost = found.picks.length * specs.hedge.cost;
      if (cost > compost()) break;
      const score = account(found.route) - account(route);
      const read = armPass(false, compost());
      const ref = spent + cost <= read.free ? 0 : Math.max(read.last, read.aim);
      if (!(score > 0 && (first || score / cost >= ref))) break;
      for (const c of found.picks) run.plant('hedge', c.x, c.y);
      spent += cost;
      first = false;
      opts.onBuy?.('hedge');
    }
  }

  armPass(true, compost());
  if (opts.callEarly || run.held) run.callEarly();
}

/** Spend every almanac note, one level at a time on the least-learned lesson. */
export function spendNotes(garden: GardenApi): void {
  for (let guard = 0; guard < 40 && num(garden.notes.value) >= 1; guard++) {
    const affordable = LESSONS.map((l) => garden.lessons.getPurchasable(l.id)!)
      .filter((p) => p.canPurchase.value)
      .sort((a, b) => num(a.count.value) - num(b.count.value));
    if (affordable.length === 0) break;
    affordable[0].purchase(1);
  }
}
