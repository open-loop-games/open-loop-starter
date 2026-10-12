/**
 * Parameterized-persona roster for the AI opponent. Plain engine
 * composition: a study of extracting it found no engine primitive to add.
 *
 * Each persona is a parameter vector over the shared decision-architecture
 * in `modules/opponent-bot.ts`. Same code path runs for every persona;
 * only the parameter values differ.
 *
 * **Orthogonal parameters.** `unitPicker` selects an action algorithm;
 * `minSpendCost` filters that algorithm's input pool (abstain to save funds
 * when no eligible unit is affordable); `upgradeSurplusFactor` controls
 * income-upgrade investment greed; `cadenceMultiplier` scales the spend
 * cadence. The four canonical lane-push playstyles (mass / greed / counter /
 * tech) cover the corpus's named cluster — see the sketch §1.4 dimension
 * catalog and §3.2 Tug guidance.
 *
 * **Why this set breaks parity stalemate.** `counter` vs `greed`
 * produces a smooth response surface (greed scales late, counter is
 * steady) for the methodology-#3 sensitivity sweep, AND greed's
 * `highest-cost` picker concentrates composition so the counter persona's
 * matrix-aware picker fires non-zero counter-pivots (unblocks the
 * `meanCp = 0` diagnostic).
 *
 * Future auto-rotation across matches lands as `createSequencer` +
 * `createRoundRobinStrategy` per sketch §3.2; the match-driver seam in
 * `balance/_match-driver.ts` is shaped to accept that drop-in.
 */
export type PersonaKey = 'mass' | 'greed' | 'counter' | 'tech';

export type UnitPicker = 'cheapest' | 'highest-cost' | 'counter';

export interface Persona {
  /** Action-selection algorithm over the (eligible) affordable pool. */
  unitPicker: UnitPicker;
  /** Abstain (save funds) if no affordable unit at this cost or above.
   *  Default 0 = no floor. `tech` uses this to skip cheap units and
   *  save for a capital unit. */
  minSpendCost: number;
  /** First N upgrade tiers are purchased save-first: as soon as affordable
   *  (amount ≥ cost), AND the AI opponent abstains from unit purchases while
   *  amount < cost (forcing a genuine economy-first phase). After N tiers are
   *  purchased, subsequent unpurchased tiers use `upgradeSurplusFactor`.
   *  0 disables save-first entirely. */
  saveForUpgradeTiers: number;
  /** Surplus multiplier for unpurchased tiers beyond `saveForUpgradeTiers`:
   *  purchase when `amount ≥ K × cost`. `Infinity` means "never purchase via
   *  opportunistic path" — combined with `saveForUpgradeTiers === 0` this
   *  disables the upgrade branch entirely. */
  upgradeSurplusFactor: number;
  /** Scales the baseline send-cadence (4s, inlined in
   *  `modules/opponent-bot.ts`) for this persona's spend rhythm.
   *  <1 = faster spends (mass spam); >1 = slower. */
  cadenceMultiplier: number;
}

/**
 * Calibration note. The Direct-Strike-shape baseline (5 mineral/sec base
 * income; a first-tier refinery costing ~20s of saving) makes save-first for
 * the first tier acceptable: ~20s of silence is bearable. Saving for the
 * second tier compounds that silence past a minute, which the opponent's
 * flood will exploit — the ladder climbs ×3 per rung while the payoff tapers,
 * so each further rung is a longer save for less. So `greed` saves only for
 * tier 1 and accepts opportunistic-or-never for tiers 2/3; the tier-1 income
 * multiplier alone is the persona's economic identity.
 *
 * `counter` and `mass` are tempo-first; they don't sacrifice early units
 * for economy. With `saveForUpgradeTiers: 0` and `upgradeSurplusFactor:
 * Infinity`, neither persona ever purchases an upgrade — they stay on the
 * base income rate for the whole match. This gives `greed` an asymmetric
 * late-game advantage (the post-refinery-1 income gap) which the
 * methodology-#3 signature probe rides for the counter-strong response
 * surface.
 */
export const PERSONAS: Record<PersonaKey, Persona> = {
  // Spam cost-rank-1 units, no eco, fast cadence. Floods the lane with cheap units.
  // Wins early; loses to greed once economy compounds. Concentrates
  // composition (cheapest is one archetype) so counter-aware opponents
  // fire counters reliably.
  mass: {
    unitPicker: 'cheapest',
    minSpendCost: 0,
    saveForUpgradeTiers: 0,
    upgradeSurplusFactor: Infinity,
    cadenceMultiplier: 0.5,
  },
  // Eco-first: silent ~20s while saving for refinery-1, then highest-cost
  // units on a +50% income engine. Vulnerable to early floods; dominant
  // late. The only persona that purchases upgrades.
  greed: {
    unitPicker: 'highest-cost',
    minSpendCost: 0,
    saveForUpgradeTiers: 1,
    upgradeSurplusFactor: Infinity, // tiers 2/3 never purchased via opportunistic
    cadenceMultiplier: 1.0,
  },
  // Reactive composition-picker — the production AI default. Reads
  // opponent's dominant archetype and picks its strong-counter; falls back
  // to random-affordable when no dominance is detected. Tempo-first, no
  // economy investment — relies on the matrix to outvalue per-unit.
  counter: {
    unitPicker: 'counter',
    minSpendCost: 0,
    saveForUpgradeTiers: 0,
    upgradeSurplusFactor: Infinity,
    cadenceMultiplier: 1.0,
  },
  // Save funds, skip cost ranks 1 and 2, commit on a capital unit (cost ≥ 200:
  // ghost or battlecruiser). No upgrade investment — a pure highest-cost rush.
  // Long quiet phase; sudden commit when capital is affordable.
  // Vulnerable to early mass.
  tech: {
    unitPicker: 'highest-cost',
    minSpendCost: 200,
    saveForUpgradeTiers: 0,
    upgradeSurplusFactor: Infinity,
    cadenceMultiplier: 1.0,
  },
};
