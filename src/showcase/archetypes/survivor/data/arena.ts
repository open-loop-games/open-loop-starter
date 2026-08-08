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
  /** `r_collect` — mote pickup reach. Smaller than `r_kill`; see § Balance. */
  collectRadius: number;
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
  /** Hard ceiling on live entities — the arena sim's budget at 20 Hz. */
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
  /** Share of motes banked since the last collector that one pull actually takes. */
  onscreenShare: number;
  /** Nominal drop times, used by the projection where the game rolls them. */
  nominalTimes: number[];
}

export const COLLECTOR_BALANCE: CollectorBalance = {
  perRun: 2,
  onscreenShare: 0.35,
  nominalTimes: [600, 1500],
};

/** Specimens spawned per game-second at `t`. */
export function spawnRate(t: number): number {
  return THREAT_BALANCE.spawnRate0 * Math.pow(THREAT_BALANCE.spawnGrowthPerMinute, t / 60);
}

/**
 * Live specimens near the operator. Engaged ones leave by DYING (time-to-kill,
 * shortened by the seat's DPS), unengaged ones by scrolling away (dwell) — so
 * killing genuinely thins the field. Derived, never authored.
 */
export function localDensity(t: number, engage: number, dps: number): number {
  const { timeToKillSeconds, dwellSeconds } = THREAT_BALANCE;
  const residency = engage * (timeToKillSeconds / dps) + (1 - engage) * dwellSeconds;
  return spawnRate(t) * residency;
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
//   density(t) = d₀ · m_d^(t/60) · [engage · TTK/dps + (1−engage) · dwell]
//   contact(t) = min(1, (density / (cap · speed))²)
//   taken(t)   = contact(t) · contactDps · m_dmg^(t/60) / toughness
//
// The residency term is the load-bearing one and easy to get wrong by modelling
// density as spawn rate alone. Because engaged specimens exit at TTK (2.4s) and
// unengaged ones at dwell (12s), a seat that engages more holds a THINNER field.
// That is what makes the damage seat's advantage structural rather than
// cosmetic, and it is the only channel by which DPS converts into survival.
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
