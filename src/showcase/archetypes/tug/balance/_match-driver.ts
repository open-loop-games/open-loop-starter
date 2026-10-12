import { persistent, type EngineModule } from '@open-loop/engine';
import { MatchKey } from '../modules';

/**
 * Headless-only multi-match orchestration. Subscribes to `match.on('matchEnded')`
 * and re-starts the next match on the following tick. Enables cumulative-arc
 * beats (beats 5 + 7) to fire across multiple matches inside a single
 * `runUntil` / `runMatrixUntil` driver — without
 * this module a headless engine ends after match 1 and cumulative probes
 * never fire.
 *
 * **Why deferred-by-one-tick:** `match.end()` runs `emit('matchEnded')`
 * BEFORE its synchronous `reset.reset()` (see `modules/match.ts`, `end`).
 * A synchronous `match.start()` inside the handler would be wiped by the
 * immediately-following reset. Deferring to the next tick lets the reset
 * settle before re-init.
 *
 * **Production never installs this module.** The production game stays
 * inside a single match per play session; the player drives match
 * transitions via the match-end summary modal. Only `_engine.ts`'s
 * `buildTugScratchEngine` adds this module.
 *
 * **Candidate primitive.** This pattern (a headless match driver) recurs in
 * any adversarial-state archetype with multi-match cumulative-arc beats.
 * See `candidate-primitives.md` § `createMatchDriverModule({ matchKey })`;
 * the policy installed atop it is the recipe half, `candidate-recipes.md`
 * § Bilateral sim-bot. TODO(expansion): graduate
 * `createMatchDriverModule({ matchKey })` once a second match-shaped
 * adversarial-state archetype lands and the match-key shape converges.
 *
 * **Persona-switch seam.** The between-match window inside the deferred-
 * tick block is the natural insertion point for opponent-persona rotation
 * across matches. Today persona is bound at module install
 * (`createOpponentBotModule(data, side, { persona })`) — static for the
 * engine's lifetime; headless engines vary it by constructing a fresh engine per
 * persona pair. When auto-rotation lands (player-facing "rotate opponents
 * per match" toggle, or tuner sweeping persona pairs Cartesian within one
 * engine), the canonical composition per
 * `parameterized-personality-extraction-sketch.md` §3.2 is
 * `createSequencer` with `canStart: () => matchEnded.value ? 'now' : 'notNow'`
 * plus `createRoundRobinStrategy` as the `FillStrategy`. That is a
 * follow-up; the opponent-bot module would expose a runtime persona setter
 * for the apply step to mutate before `match.start()`.
 */
export function createMatchDriverModule(): EngineModule {
  return {
    id: 'tug/balance/match-driver',
    dependencies: ['tug/match'],
    install(ctx) {
      const match = ctx.inject(MatchKey);
      const pendingRestart = persistent<boolean>(false, { id: 'pending-restart' });

      match.on('matchEnded', () => {
        pendingRestart.value = true;
      });

      ctx.onTick(() => {
        if (!pendingRestart.value) return;
        pendingRestart.value = false;
        match.start();
      });
    },
  };
}
