/**
 * Cross-module canonical Synergism constants. Single source of truth for
 * values read from more than one scaler module; citations co-located here
 * rather than duplicated across reader sites.
 *
 * Single-module-private canonical values inline at their owning module's
 * reader site with the citation comment alongside. Per
 * `archetypes/BALANCING.md` § Canonical numbers are not tunable, these
 * stay as plain `const` — perturbing them is fudging, not balancing. The
 * declared-invention surface (first-arc deviations from canonical) lives
 * at `tunable()` reader sites against `ScalerTuningRegistryKey`.
 */

/**
 * Canonical Accelerator power coefficient
 * (`open-loop-research/reference-code/SynergismOfficial/src/Variables.ts:50`,
 * `G.acceleratorPower = 1.10`). Each owned Accelerator contributes
 * `acceleratorPower ^ (totalAccelerator + freeAccelerator)` to the coin
 * rate boost via `acceleratorEffect`. Read by coin (Accelerator bind),
 * transcend (Accelerator Boost bind), challenges (Ch1/Ch2/Ch3 restrict
 * closures), and the UI's boost-multiplier readout.
 */
export const CANONICAL_ACCELERATOR_POWER = 1.1;

/**
 * Canonical Multiplier power coefficient
 * (`open-loop-research/reference-code/SynergismOfficial/src/Variables.ts:57`,
 * `G.multiplierPower = 2`). Each owned Multiplier contributes
 * `multiplierPower ^ (totalMultiplier + freeMultiplier)` to the global coin
 * multiplier via `multiplierEffect`. Read by coin (Multiplier bind) and
 * challenges (Ch1/Ch2 restrict closures).
 */
export const CANONICAL_MULTIPLIER_POWER = 2;

/**
 * Free Accelerator levels granted per Accelerator Boost
 * (`open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts:2467-2472`,
 * `totalAcceleratorBoost × (5 + research-band)`). First-arc port lifts
 * the constant 5 — the research-band coefficient defaults 0 and the cube
 * blessing ports inert. Read by transcend (Accelerator Boost rateChain
 * bind) and the UI's boost-multiplier readout.
 */
export const CANONICAL_ACCELERATOR_BOOST_FREE_ACCEL_PER_BUY = 5;
