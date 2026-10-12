// ─── Skeleton ───
// The threat roster — what pours in, when it starts, and what it is worth
// (`../IDENTITY.md` § What this archetype is). Tiers enter on minute marks and
// never leave; escalation is the shifting MIX plus the `m_hp`/`m_d` curves from
// `./schedule.ts` and `./arena.ts`, never a per-tier stat rewrite.
//
// Pure config. A tier's `hpFactor` multiplies the run-wide HP curve rather than
// restating it, so retuning escalation never means editing the roster.

export interface SpecimenDef {
  id: string;
  displayName: string;
  /** Game-seconds after which this tier starts appearing. */
  entersAt: number;
  /** Multiplier on the run-wide HP curve. Tier 1 is the unit. */
  hpFactor: number;
  /** Multiplier on the run-wide per-contact damage curve. */
  damageFactor: number;
  /** Approach speed in sim units per second. */
  speed: number;
  /** Motes dropped on death. Feeds `meanMoteYield`; see § Balance. */
  moteYield: number;
  /** Relative spawn weight once this tier is live. */
  weight: number;
}

/**
 * Four tiers: a baseline, a tank, a density spike, and an elite. Each changes a
 * DIFFERENT term of the model — HP, damage, count, and yield respectively — so
 * the mix shifts what binds rather than just scaling everything up.
 */
export const SPECIMENS: SpecimenDef[] = [
  {
    id: 'mote-fly',
    displayName: 'Mote-fly',
    entersAt: 0,
    hpFactor: 1,
    damageFactor: 1,
    speed: 62,
    moteYield: 1,
    weight: 10,
  },
  {
    id: 'crawler',
    displayName: 'Vat Crawler',
    entersAt: 240,
    hpFactor: 2.6,
    damageFactor: 1.3,
    speed: 44,
    moteYield: 2,
    weight: 6,
  },
  {
    id: 'splitter',
    displayName: 'Splitter',
    entersAt: 600,
    hpFactor: 1.4,
    damageFactor: 0.9,
    speed: 70,
    moteYield: 1,
    weight: 5,
  },
  {
    id: 'warden',
    displayName: 'Containment Warden',
    entersAt: 1080,
    hpFactor: 7.5,
    damageFactor: 2.1,
    speed: 38,
    moteYield: 6,
    weight: 2,
  },
];

/** Base HP of a tier-1 specimen at t = 0, before the run-wide curve. */
export const BASE_SPECIMEN_HP = 12;

/** How many extra bodies a Splitter leaves behind. Feeds the density term. */
export const SPLITTER_FRAGMENTS = 2;

/** Tiers live at `t`. */
export function activeSpecimens(t: number): SpecimenDef[] {
  return SPECIMENS.filter((s) => t >= s.entersAt);
}

/** Spawn-weighted mean of a per-tier field over the live mix at `t`. */
function weightedMean(t: number, pick: (s: SpecimenDef) => number): number {
  const live = activeSpecimens(t);
  const total = live.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return 0;
  return live.reduce((sum, s) => sum + s.weight * pick(s), 0) / total;
}

/**
 * Mean motes per kill at `t`. Rises as heavier tiers enter, so it is a real
 * income term and not flavour — `./income.ts` multiplies by it.
 */
export function meanMoteYield(t: number): number {
  const base = weightedMean(t, (s) => s.moteYield);
  const splitterShare = activeSpecimens(t).some((s) => s.id === 'splitter')
    ? weightedMean(t, (s) => (s.id === 'splitter' ? SPLITTER_FRAGMENTS : 0))
    : 0;
  return base + splitterShare;
}

/** Mean HP factor over the live mix at `t`. Pins the required DPS curve. */
export function meanHpFactor(t: number): number {
  return weightedMean(t, (s) => s.hpFactor);
}

/** Mean per-contact damage factor over the live mix at `t`. */
export function meanDamageFactor(t: number): number {
  return weightedMean(t, (s) => s.damageFactor);
}

// ─── Balance ────────────────────────────────────────────────────────────────
// A tier is a MULTIPLIER on the run-wide curves, never its own curve:
//
//   HP(tier, t)   = BASE_SPECIMEN_HP · hpFactor · m_hp^(t/60)
//   dmg(tier, t)  = contactDps · damageFactor · m_dmg^(t/60)
//
// so retuning escalation is one number in `./schedule.ts` and never a pass over
// this roster. The mix is what the roster contributes.
//
// ─── Each tier moves a different term ───
//
// Mote-fly is the unit everything else is quoted against. Vat Crawler is HP —
// it lengthens time-to-kill and therefore residency, so it raises density
// without raising spawn rate. Splitter is COUNT: it dies cheaply and leaves
// `SPLITTER_FRAGMENTS` behind, which is a density spike the spawn curve does not
// express, and it is the tier that makes traversal collapse reachable before the
// arithmetic says it should be. Warden is yield and threat at once — slow, heavy,
// and worth six motes, so it is a decision about whether to stop and take it.
//
// Entry times are spread across the run (0:00 / 4:00 / 10:00 / 18:00) rather than
// bunched, because the mix shift IS the escalation the player reads. The curves
// are smooth; the roster is what makes minute marks feel like events.
//
// ─── `meanMoteYield` is an income term, and was nearly missed ───
//
// `./income.ts` normalises a mote to 1 XP and counts kills, which is only correct
// while mean yield is 1. It is not: yield rises from 1.0 at open toward ~2.4 once
// Wardens and Splitters are live, so a run banks materially more XP per kill late
// than early. Left unmodelled, that is an unaccounted ~2× on late income and
// every beat after 10:00 would land early for a reason nothing in the model
// admitted to — the same failure as the collector impulse, from a different
// direction. `income.ts` multiplies by this function.
//
// Coupling: `moteYield` and `weight` cannot be tuned independently of the ladder.
// Raising either raises income, which the ladder was derived against; change one
// and re-derive rather than compensating elsewhere.
//
// ─── Known thin ───
//
// `SPLITTER_FRAGMENTS` is folded into mean yield and mean density but the
// fragments are not modelled as their own spawn stream, so their arrival is
// instantaneous where the game will place them around a corpse. The magnitude is
// right; the spatial burst is not, and it is exactly the sort of thing the arena
// probe should contradict.
