/**
 * Looper balance bot — placeholder.
 *
 * TODO(leaf-3): Phase-conditioned sim-bot stack. Wires four engine systems
 * inside `createBalanceBotModule`, all scoped sim-bot only (production
 * module composition stays slim — forks promote deliberately):
 *
 *   - `createGoalPicker`             per-tick action selection over the
 *                                    visible plan, weights phase-aware
 *                                    keyed off `loop.count` / mana / talent
 *                                    / gold; full-visible-plan capacity at
 *                                    loop start (Cavernous II `loadBestRoute`
 *                                    shape, refilled on `afterRestart`).
 *   - `createRecommendationSystem` + per-loop plan arbitration on
 *     strategy factories             `afterRestart`. Registered:
 *                                    `farm-mana-pool` / `farm-gold-buffer` /
 *                                    `farm-talent` via `createGoalStrategy`,
 *                                    plus `createBestReplayStrategy('manaAdded')`.
 *   - `createLoopLog` + `createBestOf` data substrate; per-loop deltas
 *                                    (`manaAdded`, `goldAccumulated`,
 *                                    `loop.elapsed`, action-completion-counts)
 *                                    feed strategy arbitration.
 *
 * Bot's weights vector becomes a first-class solver perturbation surface:
 * `pushScope` keys like `bot/weights/manapot`, `bot/weights/gold`,
 * `bot/weights/talent` widen the tunable surface beyond the original
 * `actions/<id>/manaCost` set.
 *
 * Authoring blocked on umbrella comment-thread synthesis (characteristic-
 * vector schema, capacity, strategy roster). See OL-746 comment dated
 * 2026-04-29 for the open structural decisions.
 *
 * Worked example for the persistent-accumulator + importSave-safe shape:
 * `src/archetypes/ambient/balance/bot.ts`. Tier-A invariants are documented
 * in `src/archetypes/_template/balance/bot.ts`.
 */

export {};
