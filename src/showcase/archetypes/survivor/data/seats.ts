// ─── Skeleton ───
// The seats — simultaneously the character-select roster, the AI policy bundles
// that drive them, and the balance sweep axis (`../IDENTITY.md` § What this
// archetype is). Every seat here is driven by shipping automation, which is what
// makes the arc balanceable headless; `PLAYER_SEAT` below is the same seat with
// the policy swapped for input, and it changes no mechanic on the way.
//
// A seat is a POLICY BUNDLE, not a stat block. `engage`/`eta` bias the movement
// policy, `defenseShare` biases the draft policy, and the multipliers seed the
// rest. Pure config; `../modules/automation.ts` reads it at construction.

/**
 * Who answers for this seat. `policy` runs the shipping movement and draft
 * policies off the dials below; `player` swaps both for input and leaves the
 * dials inert — the two are the same seam the arena and the draft already
 * document, named once so the modules can branch on it instead of on an id.
 */
export type SeatDriver = 'policy' | 'player';

export interface SeatDef {
  id: string;
  name: string;
  /** One line of character-select copy — the seat's theory of survival. */
  blurb: string;
  driver: SeatDriver;
  /** Share of spawned specimens brought inside `r_kill`. Movement policy. */
  engage: number;
  /** `η` — share of dropped motes banked without a collector. Movement policy. */
  eta: number;
  /** Movement multiplier. Widens the effective density ceiling. */
  speed: number;
  /** DPS multiplier. Divides time-to-kill, so it also thins local density. */
  dps: number;
  /** Starting effective-HP multiplier — armour and pool folded together. */
  toughness: number;
  /** `σ` — share of draft picks spent on survivability. Draft policy. */
  defenseShare: number;
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
