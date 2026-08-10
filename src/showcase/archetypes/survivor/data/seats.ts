// ─── Skeleton ───
// The seats — simultaneously the character-select roster, the AI policy bundles
// that drive them, and the balance sweep axis (`../IDENTITY.md` § What this
// archetype is). Every seat here is driven by shipping automation, which is what
// makes the arc balanceable headless; `PLAYER_SEAT` below is the same seat with
// the policy swapped for input, and it changes no mechanic on the way.
//
// A seat is a POLICY BUNDLE, not a stat block. `engage`/`eta` bias the movement
// policy, `defenseShare` biases the draft policy, and the multipliers seed the
// rest. Pure config, read at construction by `../modules/arena.ts` (movement)
// and `../modules/draft.ts` (offers) — the two modules that own the policies
// these dials bias.

/**
 * Who answers for this seat. `policy` runs the shipping movement and draft
 * policies off the dials below; `player` swaps both for input and leaves the
 * dials inert — the two are the same seam the arena and the draft already
 * document, named once so the modules can branch on it instead of on an id.
 *
 * **Deliberate divergence from the conformance canon**, which asks for a
 * `modules/automation.ts` gated by `AutomationTiers` with tier ids as a typed
 * union (`.claude/rules/archetype-authoring.md` § Conformance). This archetype
 * has no player-facing automation to gate. A run is played rather than
 * automated, and the only thing a player accrues between runs is a purchase, not
 * a policy — so a declared ladder would withhold nothing, which the same rules
 * name as a divergence in its own right rather than an adoption.
 *
 * What this is instead is the case those rules already carve out: a policy that
 * answers for a seat is an AI driver, not automation the player unlocks, so it
 * is gated by INSTALL PRESENCE rather than by a tier — the analogue of
 * skirmish's opponent seats. The gate is literal: `../modules/arena.ts` installs
 * a control reader only when `driver === 'player'`, and the reader's absence is
 * what selects the movement policy in `../modules/sim/step.ts`. A policy seat
 * cannot be steered by a stale key, because there is no key to hold.
 *
 * The convention this DOES meet is the load-bearing half — "automation is game
 * code, not a harness bot". Every probe under `../balance/` drives these same
 * policies through the real assembled module, so the sim exercises shipping code
 * and the two cannot drift. `../modules/seat-driver.test.ts` is the spec that
 * pins it: same mechanics either way, only the answerer changes.
 */
export type SeatDriver = 'policy' | 'player';

export interface SeatDef {
  id: string;
  name: string;
  /** One line of character-select copy — the seat's theory of survival. */
  blurb: string;
  driver: SeatDriver;
  /**
   * Share of spawned specimens brought inside `r_kill` — what the movement
   * policy is asked to PREFER, not what it achieves. See `measured`.
   */
  engage: number;
  /**
   * `η` — weight on income in the movement policy's score. A preference, not an
   * outcome: it scales the mote and collector terms in
   * `../modules/sim/steering.ts`, and what share actually gets banked is
   * `measured.eta`.
   */
  eta: number;
  /** Movement multiplier. Widens the effective density ceiling. */
  speed: number;
  /** DPS multiplier. Divides time-to-kill, so it also thins local density. */
  dps: number;
  /** Starting effective-HP multiplier — armour and pool folded together. */
  toughness: number;
  /** `σ` — share of draft picks spent on survivability. Draft policy. */
  defenseShare: number;
  /** What the policy achieves, measured. See {@link SeatOutcome}. */
  measured: SeatOutcome;
}

/**
 * What a seat's policy ACHIEVES, as against the dials above, which are what it
 * is asked to prefer. These are the numbers the income model projects from.
 *
 * They are separate fields because they are separate quantities, and collapsing
 * them cost this archetype a 20% error in the XP ladder. `income.ts` read
 * `engage` and `eta` as if a preference were a prediction; measured, the two
 * diverge in OPPOSITE directions — the policy kills a smaller share of spawns
 * than its dial asks for and banks a larger share of the drops than its dial
 * asks for. On the baseline seat those errors nearly cancel in continuous
 * income, which is what hid the defect: what did not cancel is the collector,
 * whose modelled yield is a cut of the uncollected pool and therefore INFLATES
 * as `eta` is understated. The ladder is derived from income including that
 * yield, so it came out ~20% steep and every seat landed 4–5 beats behind while
 * banking almost everything it dropped.
 *
 * **These cannot be derived, and that is the declared shape of this spine**
 * (`../IDENTITY.md` § Rate-function spine: "η is a policy output... the closed
 * form takes an η; it cannot derive one"). The same is true of engagement —
 * `../BALANCING.md` § Couplings has always said realized engagement is a product
 * only half of which the policy controls. So a NEWLY AUTHORED SEAT CANNOT BE
 * PROJECTED UNTIL IT HAS BEEN RUN: author the dials, run
 * `../balance/spread-probe.ts`, and copy its `engage` and `η continuous` columns
 * back here. That is the honest price of a policy output, not a workaround.
 *
 * Design targets keep taking the DIALS, deliberately. The projection's
 * `requiredDps0` solves the opening device against `engage` because it is
 * authoring a device to the engagement the seat is *meant* to hold; a prediction
 * takes a measurement, a target takes an intent.
 */
export interface SeatOutcome {
  /**
   * Kills per spawn — `reach × lethal`, the two halves `../BALANCING.md`
   * § Couplings splits. This is what drops motes, so it is what income rides.
   *
   * **The unstable half, and it does not have a fixed point.** These values
   * derive the ladder, the ladder changes how long a run lasts, and how long a
   * run lasts decides how much of it is spent in the late density band where
   * kills-per-spawn collapses — so re-measuring after a re-derivation moves it
   * again. Measured over three passes on identical seeds, `shielded` ran
   * 0.52 / 0.43 / 0.51: real feedback with a gain near 1, not seed noise.
   *
   * So this is DAMPED rather than iterated to convergence — the value here is
   * the mean across those passes. Chasing the last pass would be tracking a
   * quantity that has no single correct value, because a run-average of
   * something that varies across the density arc is a summary, not a constant.
   * If this ever needs to be better, the repair is to make it a function of `t`
   * rather than to iterate harder.
   */
  killsPerSpawn: number;
  /**
   * `η` realized — share of dropped motes banked without a collector.
   *
   * The stable half: 0.962–0.972, 0.979–0.983, 0.867–0.870, 0.988–0.989 across
   * the same three passes. It barely moves because it is a property of the
   * movement policy against motes that never expire, and the ladder does not
   * reach it. Take the measurement directly; no damping needed.
   */
  eta: number;
  /**
   * The probe run these came from. A bare number here is unfalsifiable; the
   * receipt is what lets the next reader tell a measurement from a guess.
   */
  receipt: string;
}

/**
 * `baseline` is what the XP ladder is derived against; the specialists are
 * perturbations of it. Four seats rather than three so the projection has a
 * reference curve to be *about* — the three specialists then read as one term
 * moved each.
 */
export const SEATS: SeatDef[] = [
  {
    id: 'generalist',
    name: 'The Generalist',
    blurb: 'No theory. Reads the floor and takes what it offers.',
    driver: 'policy',
    engage: 0.55,
    eta: 0.65,
    speed: 1.0,
    dps: 1.0,
    toughness: 1.0,
    defenseShare: 0.35,
    measured: {
      killsPerSpawn: 0.48,
      eta: 0.992,
      receipt: '16 seeds x3 passes, `balance/spread-probe.ts`; killsPerSpawn is the 3-pass mean',
    },
  },
  {
    id: 'kinetic',
    name: 'The Kineticist',
    blurb: 'Never be where it is. Wide orbits, late sweeps, nothing touches you.',
    driver: 'policy',
    engage: 0.4,
    eta: 0.78,
    speed: 1.35,
    dps: 0.9,
    toughness: 0.85,
    defenseShare: 0.28,
    measured: {
      killsPerSpawn: 0.33,
      eta: 0.994,
      receipt: '16 seeds x3 passes, `balance/spread-probe.ts`; killsPerSpawn is the 3-pass mean',
    },
  },
  {
    id: 'reactive',
    name: 'The Reactionist',
    blurb: 'Nothing that is dead can hurt you. Thin the floor, dive the ash.',
    driver: 'policy',
    engage: 0.72,
    eta: 0.6,
    speed: 0.95,
    dps: 1.35,
    toughness: 0.85,
    defenseShare: 0.2,
    measured: {
      killsPerSpawn: 0.87,
      eta: 0.89,
      receipt: '16 seeds x3 passes, `balance/spread-probe.ts`; killsPerSpawn is the 3-pass mean',
    },
  },
  {
    id: 'shielded',
    name: 'The Shielded',
    blurb: 'Let it hit you. Walk through the mass and take the motes anyway.',
    driver: 'policy',
    engage: 0.62,
    eta: 0.68,
    speed: 0.85,
    dps: 0.9,
    toughness: 1.75,
    defenseShare: 0.5,
    measured: {
      killsPerSpawn: 0.51,
      eta: 0.997,
      receipt: '16 seeds x3 passes, `balance/spread-probe.ts`; killsPerSpawn is the 3-pass mean',
    },
  },
];

/**
 * The player seat. Deliberately NOT a member of `SEATS`, which is the balance
 * sweep axis: a seat with no policy behind it has no arc to measure, and a probe
 * that included it would report a stationary operator as a balance reading.
 *
 * Its dials are all 1.0 and its policy dials are inert. That is the honest
 * statement of what it is — the baseline body with the policy removed — and it
 * keeps the roster's rule intact, that a seat earns its place by being good at
 * something the income product does not express. This one is good at whatever
 * you are.
 */
export const PLAYER_SEAT: SeatDef = {
  id: 'manual',
  name: 'Yourself',
  blurb: 'No policy. WASD or the arrows, and you answer the draft.',
  driver: 'player',
  engage: 0.55,
  eta: 0.65,
  speed: 1.0,
  dps: 1.0,
  toughness: 1.0,
  defenseShare: 0.35,

  // A hand is not a policy; these are the baseline's, carried so the
  // projection can run a player seat at all. Never measured — a probe cannot
  // drive input.
  measured: {
    killsPerSpawn: 0.48,
    eta: 0.992,
    receipt: '16 seeds x3 passes, `balance/spread-probe.ts`; killsPerSpawn is the 3-pass mean',
  },
};

/** Everything assignable to the floor. `SEATS` is the measurable roster; this is
 *  the pickable one, and only the UI and `seatById` want it. */
export const ALL_SEATS: readonly SeatDef[] = [PLAYER_SEAT, ...SEATS];

/** The seat the ladder is derived against. */
export const BASELINE_SEAT: SeatDef = SEATS[0];

/** Look a seat up by id. Throws rather than returning undefined — ids are data. */
export function seatById(id: string): SeatDef {
  const seat = ALL_SEATS.find((s) => s.id === id);
  if (!seat) throw new Error(`survivor/seats: no seat with id "${id}"`);
  return seat;
}

// ─── Balance ────────────────────────────────────────────────────────────────
// ─── The dials must not collapse onto one term ───
//
// Continuous income is `engage · η`, so two seats sharing that product are the
// same seat wearing different labels. Measured receipt: the first draft of this
// roster had the reactive and shielded seats both at 0.42 and the projection
// reported them as identical runs. A specialist earns its place by being good at
// something the income product does not express — `speed` widens the density
// ceiling, `dps` thins the field, `toughness` and `defenseShare` divide damage.
//
// Current products: 0.358 / 0.312 / 0.432 / 0.422. The last two are close and
// that is fine — they diverge on where the damage goes, not on income.
//
// ─── Guns versus butter is the seat axis ───
//
// `defenseShare` is this archetype's φ: picks spent on survivability are picks
// not spent on DPS, and `offensivePickGain(σ)` (`./schedule.ts`) raises what each
// remaining offensive pick must deliver to keep time-to-kill flat. So a seat's
// draft policy feeds back into its own DPS curve. This is the term that makes a
// seat a policy bundle rather than a multiplier set, and it is the sweep axis the
// probe walks.
//
// Known thin: the axis is not balanced yet. Butter currently beats guns because
// defensive picks divide damage directly while offensive ones reach survival only
// through the squared density term, so the shielded seat outlasts the arc while
// the other three bind on the HP floor. Three specialists each binding on a
// DIFFERENT cause, with the baseline mostly reaching the timer, is the target
// distribution — a single shared cause is a wall in costume. Recorded in
// `../BALANCING.md` § Known thin; the fix waits on a probe, because the
// conversion rate between the two is a measurement, not a preference.
//
// ─── Why these are policy params and not just stats ───
//
// Per `/work/studio/CLAUDE.md` § Automation is game code: each seat's dials are
// the parameters of the shipping movement and draft policies, so the balance
// harness drives real gameplay code rather than a re-implementation, and the same
// numbers become the player-facing character-select surface. A stat-block roster
// would make the sweep a scalar perturbation over three near-identical curves;
// a policy roster makes each seed explore a different region of build space,
// which is what the binding-cause distribution needs in order to say anything.
