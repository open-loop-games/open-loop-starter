// ─── Skeleton ───
// The run's time axis — the draft cadence and the two escalation curves it races
// against (`../IDENTITY.md` § Rate-function spine). Everything here is either an
// authored design parameter or something SOLVED from one; nothing is a free
// number chosen to feel right. Pure config plus the derivations over it;
// `../modules/` and `../balance/survivor-projection.ts` both read this file, so
// the shipping ladder and the projected ladder cannot disagree.

export interface ScheduleBalance {
  /** Target run length in game-seconds. One session ≈ one run. */
  runSeconds: number;
  /** `t₀` — the first draft interval. */
  beatFirstSeconds: number;
  /** `ρ_b` — geometric growth of the interval between beats. SOLVED; see § Balance. */
  beatRatio: number;
  /** `N` — draft beats in a run. A CONSEQUENCE of the band; see § Balance. */
  beatCount: number;
  /** `m_hp` — specimen HP growth per minute mark. */
  hpGrowthPerMinute: number;
  /** `m_dmg` — per-contact damage growth per minute mark. Far slower; see § Balance. */
  contactDamageGrowthPerMinute: number;
  /** What one defensive draft pick multiplies the effective-HP pool by. */
  hpPickGain: number;
}

export const SCHEDULE_BALANCE: ScheduleBalance = {
  runSeconds: 1800,
  beatFirstSeconds: 30,
  beatRatio: 1.03465,
  beatCount: 33,
  hpGrowthPerMinute: 1.15,
  contactDamageGrowthPerMinute: 1.04,
  hpPickGain: 1.09,
};

/** Cumulative game-time at which draft beat `n` (1-indexed) is scheduled to fire. */
export function beatTime(n: number): number {
  const { beatFirstSeconds: t0, beatRatio: r } = SCHEDULE_BALANCE;
  return (t0 * (Math.pow(r, n) - 1)) / (r - 1);
}

/** How many beats the authored schedule expects to have fired by `t`. */
export function scheduledBeatsBy(t: number): number {
  let n = 0;
  while (n < SCHEDULE_BALANCE.beatCount && beatTime(n + 1) <= t) n++;
  return n;
}

/** Specimen HP multiplier at `t`. */
export function hpMul(t: number): number {
  return Math.pow(SCHEDULE_BALANCE.hpGrowthPerMinute, t / 60);
}

/** Per-contact damage multiplier at `t`. Its own curve, deliberately slower. */
export function contactDamageMul(t: number): number {
  return Math.pow(SCHEDULE_BALANCE.contactDamageGrowthPerMinute, t / 60);
}

/**
 * Per-OFFENSIVE-pick DPS gain that holds time-to-kill flat for a seat spending
 * `defenseShare` of its picks on survivability. Derived, never authored.
 *
 * Flat TTK is a PER-SPECIMEN property while DPS is shared across everything
 * inside the kill radius, so the required curve covers specimen HP *and* the
 * density it is divided among — `m_hp · m_d` per minute mark, not `m_hp` alone.
 * The offensive picks a seat actually takes must cover all of it between them,
 * so a more defensive seat needs each remaining pick to do more.
 *
 * `mixHpGrowth` is the third term: the roster's mean HP factor rises as heavier
 * tiers enter (`./specimens.ts` `meanHpFactor`), which is a one-off multiplier on
 * required DPS across the run rather than a per-minute rate.
 *
 * Both are passed in rather than imported, to keep this file free of the arena
 * and roster layers.
 */
export function offensivePickGain(
  defenseShare: number,
  densityGrowthPerMinute: number,
  mixHpGrowth = 1,
): number {
  const { hpGrowthPerMinute, runSeconds, beatCount } = SCHEDULE_BALANCE;
  const offensivePicks = beatCount * (1 - defenseShare);
  const perMinute = hpGrowthPerMinute * densityGrowthPerMinute;
  const total = Math.pow(perMinute, runSeconds / 60) * mixHpGrowth;
  return Math.pow(total, 1 / offensivePicks);
}

/**
 * The XP ladder — DERIVED so beat `n` lands at `beatTime(n)` under the income
 * curve it is handed. `cumulativeIncomeAt` must be `cumulativeIncomeAmortized`:
 * collector yield has to be in the model (a smooth-derived ladder never re-syncs)
 * but spread rather than impulsive (an impulse-derived ladder over-fits to the
 * nominal drop times). See § Balance and `./income.ts` § Balance.
 *
 * Passing income in rather than importing it keeps this file free of the arena
 * and seat layers, and lets the projection and the shipping module derive the
 * same ladder from the same function.
 */
export function deriveXpLadder(cumulativeIncomeAt: (t: number) => number): number[] {
  const ladder: number[] = [];
  let prev = 0;
  for (let n = 1; n <= SCHEDULE_BALANCE.beatCount; n++) {
    const cum = cumulativeIncomeAt(beatTime(n));
    ladder.push(cum - prev);
    prev = cum;
  }
  return ladder;
}

// ─── Balance ────────────────────────────────────────────────────────────────
// Rate-function bucket: GEOMETRIC DISCRETE ON MINUTE MARKS over a
// modifier-product chain (`../IDENTITY.md` § Rate-function spine;
// `open-loop-research/methodology/techniques/closed-form-progression/
// per-archetype/survivor.md` for the per-subsystem inventory and its receipts).
//
//   beatTime(n) = t₀ · (ρ_bⁿ − 1)/(ρ_b − 1)      draft schedule
//   HP(t)       = HP₀ · m_hp^(t/60)               specimen toughness
//   dmg(t)      = dmg₀ · m_dmg^(t/60)             per-contact damage
//   DPS(L)      = DPS₀ · g^(L·(1−σ))              L beats, σ defensive share
//   pool(L)     = pool₀ · hpPickGain^(L·σ)        survivability from the draft
//
// ─── Why these numbers ───
//
// Only `beatFirstSeconds` and `runSeconds` are authored here. The identity line
// puts a draft every 30–90s, so fixing the band and the run length determines the
// rest: `beatRatio` is SOLVED so that beat `beatCount` lands at or just inside
// the horn, and `beatCount` is then the largest count whose final interval still
// sits inside the band. At 33 beats that gives ρ_b = 1.03465, a final interval of
// 89.2s, and a span of 1798.6s.
//
// Measured receipt: the first pass authored ρ_b = 1.035 by eye, which put beat 33
// at 30:10 — ten seconds PAST the end of the run, so the last draft could never
// fire and the seat spread silently topped out at 32. The projection caught it as
// a non-finite drift on the last beat. A schedule whose last beat falls outside
// the run is not a rounding issue; it is a beat that does not exist. Re-solving
// to 1.0347 still overshot by 0.3s, which is the same bug wearing a smaller
// number — the horn is a hard edge, so the solve has to land under it.
//
// The count is robust to the cadence, which is why it is worth trusting: a much
// more aggressive schedule (10s first interval, ratio 1.10) also lands at 31.
// ~32 picks is the run's structural budget, and it sizes the content — at ~8
// levels to max a device and ~4 to stack a reagent, an evolution costs ~12 picks,
// so a run completes 2–3. The evolution roster is sized from that, not chosen.
//
// `g = offensivePickGain(σ, m_d)` is solved from flat time-to-kill. Holding TTK
// flat is the corpus shape: escalation is meant to be felt as DENSITY, not as
// specimens turning into bullet sponges. At the baseline σ = 0.35 it comes out
// near 1.354× per offensive pick, for ~665× total DPS growth across a run.
//
// Measured correction, twice, in the same direction. This was first solved
// against `m_hp` alone. TTK is a PER-SPECIMEN quantity and the operator's DPS is
// divided among everything in the kill radius, so holding it flat also has to
// cover `m_d`. Then the roster landed and added a third term: mean HP factor
// rises 1.0 → 2.07 as the heavy tiers enter (`./specimens.ts`), which is another
// 2× on required DPS that the draft was not delivering.
//
// Both misses have the same consequence, and it is not "the game gets harder".
// `localDensity` (`./arena.ts`) treats TTK as a constant, so an under-solved gain
// leaves the density model assuming a DPS curve the draft never delivers: TTK
// drifts up, residency with it, and density climbs super-linearly for reasons
// nothing in the model admits to. The lesson worth carrying is that every term
// which multiplies required DPS has to be inside this solve — the failure is
// silent in both directions, and it always looks like a difficulty problem.
//
// `m_dmg ≪ m_hp` is load-bearing and was a measured correction, not a taste
// call. The first pass reused `m_hp` for per-contact damage; the projection
// reported all four seats dead by ~15 minutes regardless of draft, because a
// 67× per-hit curve outruns any survivability the draft can buy. HP and density
// carry escalation; per-hit damage barely moves. Coupling: raising `m_dmg`
// toward `m_hp` collapses the run length for every seat at once, which reads as
// "the game got hard" when it is actually "the model stopped having a decision
// in it".
//
// `deriveXpLadder` must be handed income including collectors, AMORTIZED. Two
// measured receipts, in `../balance/survivor-projection.ts`'s derivation check:
// omit collectors entirely and a smooth-derived ladder puts beat 33 ~90s early,
// worst beat ~114s, monotone after the first burst because the ladder has no
// restoring term; include them as point impulses and the ladder goes
// non-monotone, since the beat straddling a drop absorbs the whole burst. The
// first fails every run, the second fails every run whose collectors do not land
// at the nominal times — and the drop is a roll. See `./income.ts` § Balance.
//
// The ladder itself is deliberately NOT perturbable. It is solved from the
// income model against this schedule; overriding it directly decouples it from
// what it was derived to satisfy, and a ladder that no longer means anything
// still looks like a ladder. Perturb the inputs and re-derive.
