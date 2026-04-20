import type { RoundEscalation } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Round bracket + HP-damage schedule. 15 rounds covers a standard DAC /
// TFT / Underlords match — typical 35–45 minutes at 30s prep + ~30–90s
// combat per round. HP-damage-per-round scales with round number so late
// losses hit harder, compressing the elimination tail. The
// `hp-damage-per-round-curve` probe in auto-battler.md § 6 perturbs this.

export const DEFAULT_STARTING_HP = 100;
export const DEFAULT_STARTING_GOLD = 0;
export const DEFAULT_PREP_DURATION_SEC = 30;
export const DEFAULT_COMBAT_SOFT_CAP_SEC = 60;

const HP_DAMAGE_PER_ROUND_15: number[] = [
  2,
  3,
  4,
  5, // rounds 1–4 (early PvE + first PvP)
  6,
  7,
  8,
  10, // rounds 5–8 (mid match)
  12,
  14,
  16,
  18, // rounds 9–12 (elimination accelerating)
  20,
  22,
  25, // rounds 13–15 (final bracket)
];

// Per-round base gold (pre-interest). Canonical DAC: 1–2 gold at rounds 1–2,
// then 5 gold/round for rest of the match. SAP uses 10 gold base. This
// skeleton picks the 5-gold DAC baseline with early-round ramp.
const GOLD_PER_ROUND_15: number[] = [
  2,
  3,
  4,
  5, // rounds 1–4
  5,
  5,
  5,
  5, // rounds 5–8
  5,
  5,
  5,
  5, // rounds 9–12
  5,
  5,
  5, // rounds 13–15
];

// Round-type schedule — DAC canonical: rounds 1–3 PvE creep, round 4 first
// PvP, then PvP with creep interrupts every ~5 rounds, boss at round 10 and
// final-PvP at round 15. Forks adjust for different bracket shapes.
const ROUND_TYPE_SCHEDULE: Array<{
  round: number;
  type: 'pve' | 'pvp' | 'boss';
}> = [
  { round: 1, type: 'pve' },
  { round: 2, type: 'pve' },
  { round: 3, type: 'pve' },
  { round: 4, type: 'pvp' },
  { round: 5, type: 'pvp' },
  { round: 6, type: 'pve' }, // creep interrupt
  { round: 7, type: 'pvp' },
  { round: 8, type: 'pvp' },
  { round: 9, type: 'pvp' },
  { round: 10, type: 'boss' }, // mid-match boss
  { round: 11, type: 'pvp' },
  { round: 12, type: 'pvp' },
  { round: 13, type: 'pvp' },
  { round: 14, type: 'pvp' },
  { round: 15, type: 'boss' }, // final (or elimination-tail PvP)
];

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Single RoundEscalation — the skeleton ships one match shape. Forks
// override round-count (shorter matches for mobile / casual variants,
// longer for extended formats), HP-damage curve, and round-type schedule
// in place to retune match pacing.

export const DEFAULT_ROUNDS: RoundEscalation = {
  hpDamagePerRound: HP_DAMAGE_PER_ROUND_15,
  goldPerRound: GOLD_PER_ROUND_15,
  startingHp: DEFAULT_STARTING_HP,
  startingGold: DEFAULT_STARTING_GOLD,
  roundTypeSchedule: ROUND_TYPE_SCHEDULE,
  prepDurationSec: DEFAULT_PREP_DURATION_SEC,
  combatSoftCapSec: DEFAULT_COMBAT_SOFT_CAP_SEC,
};
