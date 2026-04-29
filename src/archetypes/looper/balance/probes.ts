/**
 * Looper sim-driven balance probes — placeholder.
 *
 * TODO(leaf-5): Probe authoring + final lock-in. Probes from looper.md § 6:
 *
 *   - `cost-reduction-perceptibility` — talentAccrualRatio sweep across a
 *     multi-loop run. Verifies "Talent → faster Level → cheaper actions"
 *     is perceptible: loop N+1's first-N action ticks complete in fewer
 *     ticks than loop N. Multi-loop comparison drives the assertion.
 *   - `loop-reset-correctness` — 5-loop sweep checking per-loop reset scope
 *     (Level XP, mana, action progress, queue cursor + per-item loopsLeft
 *     all clear) AND retention scope (Talent XP, action timesCompleted,
 *     progressVar XP, regularVar `total`, queue plan structure all persist).
 *   - `manapot-perceptibility` — progressVar level → regularVar pool
 *     extension → manaAdded growth across a 30-min sim. Verifies the
 *     mid-pace cross-loop axis is felt.
 *   - `gold-mana-exchange-correctness` — gold accumulator + Trade burst
 *     within ~10min sim-time. Validates the exchange frame.
 *
 * Plus: extend `sim/balance.probe.test.ts` with solver-converged value
 * receipts (replacing the current placeholder math-only locks with
 * actual-window vs target-window assertions).
 *
 * Invocation: `pnpm balance:probes:looper` (vite-node). Prints multi-section
 * report. Worked example: `src/archetypes/ambient/balance/probes.ts`.
 *
 * BALANCING.md roster bumps Looper to ✓ once probes pass.
 */

export {};
