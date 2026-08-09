// ─── Skeleton ───
// The floor's geometry and the threat that fills it (`../IDENTITY.md` § What
// this archetype is). The map scrolls, is walled, and spawns only inside an
// annulus around the operator — so threat is always local and always escapable,
// which is what makes engagement a CHOICE and therefore an economic term rather
// than a survival tactic. Pure config; `../modules/` read it at construction and
// `../balance/survivor-projection.ts` projects from it.
//
// Sim units throughout. The renderer shows a screenful of them sized by area
// (`../ui/ArenaField.vue` § VIEW_WIDTH), wide enough to hold the live population
// rather than just the rings.

export interface ArenaBalance {
  /** `r_kill` — device reach. Specimens inside this are being killed. */
  killRadius: number;
  /** `r_collect` — mote pickup reach at zero aperture. Smaller than `r_kill`. */
  collectRadius: number;
  /**
   * Ceiling on `r_collect / r_kill` that the aperture chain APPROACHES and never
   * reaches. The ratio is this archetype's top coupling, so it is a structural
   * bound rather than a clamp bolted on afterwards; see § Balance.
   */
  apertureCapRatio: number;
  /** `r_contact` — where a specimen damages the operator. */
  contactRadius: number;
  /**
   * Inner edge of the spawn annulus. Bounds live density by annulus area rather
   * than letting it accumulate; the renderer fades new bodies in rather than
   * relying on this sitting outside the view, which it no longer does.
   */
  spawnInnerRadius: number;
  /** Outer edge of the spawn annulus. */
  spawnOuterRadius: number;
  /** Walled map extent. Large enough that crossing it is a decision. */
  mapWidth: number;
  mapHeight: number;
}

export const ARENA_BALANCE: ArenaBalance = {
  killRadius: 180,
  collectRadius: 70,
  apertureCapRatio: 0.65,
  contactRadius: 22,
  spawnInnerRadius: 560,
  spawnOuterRadius: 760,
  mapWidth: 8000,
  mapHeight: 5200,
};

export interface ThreatBalance {
  /** `d₀` — specimens spawned per game-second at t = 0. */
  spawnRate0: number;
  /** `m_d` — spawn-rate growth per minute mark. */
  spawnGrowthPerMinute: number;
  /** Mean seconds an UNENGAGED specimen lingers before the view leaves it. */
  dwellSeconds: number;
  /** Time-to-kill at baseline DPS. Flat across the run by construction. */
  timeToKillSeconds: number;
  /** Live specimens at which gaps close. Contact is the squared approach to it. */
  densityCap: number;
  /** Damage per second at full contact, before armour and escalation. */
  contactDps: number;
  /** Operator effective-HP pool before seat toughness and defensive picks. */
  baseHp: number;
  /**
   * Hard ceiling on live entities — the arena sim's budget at 20 Hz. Also the
   * ceiling `localDensity` clamps to, since past this point the sim's own
   * population stops tracking the uncapped formula; see that function.
   */
  entityBudget: number;
}

export const THREAT_BALANCE: ThreatBalance = {
  spawnRate0: 1.2,
  spawnGrowthPerMinute: 1.08,
  dwellSeconds: 12,
  timeToKillSeconds: 2.4,
  densityCap: 190,
  contactDps: 9,
  baseHp: 260,
  entityBudget: 400,
};

export interface CollectorBalance {
  /** Collector drops expected per run. */
  perRun: number;
  /**
   * Share of motes banked since the last collector that one pull actually takes.
   * The projection's ASSUMPTION, not the sim's rule — the sim pulls everything
   * inside `pullRadius` and the probe measures what share that came to.
   */
  onscreenShare: number;
  /** Nominal drop times, used by the projection where the game rolls them. */
  nominalTimes: number[];
  /**
   * How far one pull reaches — "every mote on screen at once"
   * (`../IDENTITY.md`). Sized just inside `spawnInnerRadius` so a pull takes the
   * field the operator has been working and not the un-spawned floor beyond it.
   */
  pullRadius: number;
  /**
   * Fractional jitter around each nominal time. The drop is a ROLL; the
   * projection's fixed times are the expected-value idealisation of this, which
   * is the one place the two are allowed to differ by construction.
   */
  timeJitter: number;
}

export const COLLECTOR_BALANCE: CollectorBalance = {
  perRun: 2,
  onscreenShare: 0.35,
  nominalTimes: [600, 1500],
  pullRadius: 520,
  timeJitter: 0.35,
};

/**
 * Roll the drop times for one run's collectors — the nominal schedule, jittered.
 *
 * Sorted and clamped inside the run, because a collector that rolls past the
 * purge is one the run never sees and the income model already counted.
 */
export function rollCollectorTimes(random: () => number, runSeconds: number): number[] {
  const { nominalTimes, perRun, timeJitter } = COLLECTOR_BALANCE;
  return nominalTimes
    .slice(0, perRun)
    .map((t) => {
      const jittered = t * (1 + (random() * 2 - 1) * timeJitter);
      return Math.min(runSeconds * 0.97, Math.max(0, jittered));
    })
    .sort((a, b) => a - b);
}

/**
 * `r_collect` for a total aperture multiplier — the reagent chain (`reclaimant`)
 * times the cross-run upgrade (`wider-aperture`).
 *
 * The multiplier is applied to the HEADROOM between the base ratio and
 * `apertureCapRatio`, not to the radius, so the aperture approaches the cap
 * hyperbolically and never crosses it. That shape is chosen over a clamp for a
 * reason worth keeping: a clamp makes the last picks of a fully-stacked reagent
 * do nothing, which is the same defect as a dial that never reaches the policy —
 * the player invests and the game does not answer. Here every stack still moves
 * the radius, by less.
 *
 * Why it needs bounding at all: `reclaimant` compounds to 1.18⁴ = 1.94 and
 * `wider-aperture` to 1.1⁴ = 1.46, so the two together were 2.84× on a raw
 * product — `r_collect` 199 against a `r_kill` of 180, an aperture wider than the
 * radius that feeds it. § Balance below is explicit that the ratio approaching 1
 * turns this archetype into a DPS check; unbounded, it went past 1.
 */
export function collectRadiusFor(apertureMul: number): number {
  const { killRadius, collectRadius, apertureCapRatio } = ARENA_BALANCE;
  const baseRatio = collectRadius / killRadius;
  const mul = Math.max(1, apertureMul);
  return killRadius * (apertureCapRatio - (apertureCapRatio - baseRatio) / mul);
}

/** Specimens spawned per game-second at `t`. */
export function spawnRate(t: number): number {
  return THREAT_BALANCE.spawnRate0 * Math.pow(THREAT_BALANCE.spawnGrowthPerMinute, t / 60);
}

/**
 * Live specimens near the operator. Engaged ones leave by DYING (time-to-kill,
 * shortened by the seat's DPS), unengaged ones by scrolling away (dwell) — so
 * killing genuinely thins the field. Derived, never authored.
 *
 * Clamped at `entityBudget`: the sim's spawn loop
 * (`../modules/sim/step.ts` § spawn) stops adding bodies once
 * `specimens.length` reaches it, and despawn only removes specimens the
 * operator has outrun — the same near-operator population this formula
 * estimates by Little's-law residency. Past the clamp the two are the same
 * quantity by construction, not two models agreeing by luck.
 */
export function localDensity(t: number, engage: number, dps: number): number {
  const { timeToKillSeconds, dwellSeconds, entityBudget } = THREAT_BALANCE;
  const residency = engage * (timeToKillSeconds / dps) + (1 - engage) * dwellSeconds;
  return Math.min(spawnRate(t) * residency, entityBudget);
}

/**
 * Probability of being in contact — the squared approach to the density
 * ceiling, which a faster operator effectively widens. Quiet until gaps start
 * closing, then sharp: this is traversal collapse as a curve.
 */
export function contactChance(t: number, engage: number, dps: number, speed: number): number {
  const density = localDensity(t, engage, dps);
  return Math.min(1, Math.pow(density / (THREAT_BALANCE.densityCap * speed), 2));
}

// ─── Balance ────────────────────────────────────────────────────────────────
// ─── `r_collect` against `r_kill` is the top coupling in this game ───
//
// Kills land at the outer edge of `r_kill`; motes land where the specimen died;
// `r_collect` is smaller, so banking income means looping back through the space
// just cleared. Income is therefore a RISK TRANSACTION, and this ratio is its
// price. At 70/180 ≈ 0.39 a pickup costs a real re-approach. Move the two
// together and the genre moves with them: at `r_collect → r_kill` income is free
// and the archetype degenerates into a DPS check; very small, and every level-up
// is paid for with a dive. Nothing else changes the character of the game as
// much with one number, which is why it is the first entry in
// `../BALANCING.md` § Couplings.
//
// ─── Which is why the ratio is bounded by construction, not by care ───
//
// The base ratio is authored, but two multipliers move it at RUNTIME: the
// `reclaimant` reagent (1.18⁴ = 1.94 fully stacked) and the `wider-aperture`
// meta tile (1.1⁴ = 1.46). On a raw product those reach 2.84×, i.e. `r_collect`
// 199 against `r_kill` 180 — the degenerate case above, arrived at by ordinary
// play rather than by a retune, and reachable in one reagent line on its own.
//
// A coupling this load-bearing cannot be protected by remembering to check it
// whenever a new aperture source is added. `collectRadiusFor` applies any
// aperture multiplier to the HEADROOM below `apertureCapRatio`, so every present
// and future source composes into a ratio that rises toward 0.65 and stops.
// Fully stacked reagent plus fully bought tile now lands at 0.56 — a real reward
// for four picks and a purchase, and still a floor where a mote dropped at the
// kill edge has to be walked back to.
//
// The general form: when one ratio decides a genre, bound it where it is
// COMPUTED, not where each contributor is authored. Contributors get added by
// people who have not read this comment.
//
// ─── Why the annulus ───
//
// Spawning only in `[spawnInnerRadius, spawnOuterRadius]` bounds live density by
// annulus area × rate rather than letting it accumulate, which is what makes the
// arena tractable at 20 Hz and what makes escalation express as tier
// composition and density rather than as unbounded count. Constraint the
// geometry must satisfy: the inner radius has to be reachable-ahead, i.e. the
// operator must not be able to outrun the ring re-forming. Violate it and
// disengagement stops costing anything, which is the one degenerate line this
// design closes by structure.
//
// ─── Density, contact, and why killing is defensive ───
//
//   density(t) = min(d₀ · m_d^(t/60) · [engage · TTK/dps + (1−engage) · dwell], entityBudget)
//   contact(t) = min(1, (density / (cap · speed))²)
//   taken(t)   = contact(t) · contactDps · m_dmg^(t/60) / toughness
//
// The residency term is the load-bearing one and easy to get wrong by modelling
// density as spawn rate alone. Because engaged specimens exit at TTK (2.4s) and
// unengaged ones at dwell (12s), a seat that engages more holds a THINNER field.
// That is what makes the damage seat's advantage structural rather than
// cosmetic, and it is the only channel by which DPS converts into survival.
//
// The `entityBudget` clamp keeps this the honest formula once the sim's own
// population stops climbing — measured at seats pinned at exactly 400 for
// 7–19 of a run's 30 minutes (`../BALANCING.md` § Known thin). Before the
// clamp, contact chance, traversal-collapse classification and bind-cause
// reporting were all reading a curve the live sim had stopped following past
// that point — a cap that binds in the sim but not in its model is a silently
// substituted model. The clamp fixes the MODEL's honesty; it does not touch
// the sim, and it does not remove the difficulty inversion where the
// lowest-DPS seat fills the floor earliest and stays capped longest — that is
// a real fact about the game, not a modelling error, and stays open.
//
// Known thin, recorded rather than tuned away: that channel is currently too
// weak. `toughness` and defensive picks divide damage directly while DPS reaches
// survival only through the squared density term, so butter beats guns and three
// of four seats bind on the HP floor. The conversion rate between them is a
// MEASUREMENT — the probe against shipping code settles it, not an adjustment
// here. See `../BALANCING.md` § Known thin.
//
// ─── Map size is derived ───
//
// Walls plus scrolling means map extent has a failure mode at each end: too
// large is pure outrun, too small is the closed arena this design rejected. Size
// it by CROSSING TIME, targeting 60–120s so a 30-minute run is ~15–30 crossings
// and the operator must repeatedly turn back into contested space. At ~120
// units/s that puts the floor at 8000 × 5200 — 67s across, 80s on the diagonal.
// A first pass at 4000 × 2600 crossed in 33s, which is ~55 crossings and reads as
// churn rather than as a place. Corners are the reason the movement policy needs
// real wall-cost routing and a reachability check rather than defensive
// special-casing.
