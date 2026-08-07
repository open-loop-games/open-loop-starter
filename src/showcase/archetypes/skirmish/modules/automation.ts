import { createSeededRNG, getSeed, persistent, type EngineModule } from '@open-loop/engine';
import { MatchKey } from './match';
import { TacticalKey } from './tactical-sim';
import { AutomationTiersKey, type SkirmishAutomationTier } from './automation-tiers';
import { type Side } from './tuning';

/** Baseline seconds between spawn decisions, before per-persona scaling. */
const BASE_CADENCE_SEC = 3;

export interface AutomationOptions {
  /** Seconds between spawn decisions (before jitter). Tempo dial. */
  cadenceSec?: number;
  /**
   * Max units spawned per burst. `Infinity` = commit all affordable (all-in);
   * a finite cap drip-feeds and holds the throughput below income (cautious).
   * This is the dial that actually differentiates army throughput — spend-
   * fraction policies all converge to the income limit in steady state.
   */
  maxSpawnPerBurst?: number;
  /**
   * Multiplicative cadence jitter [0..1], seeded per side. 0 = deterministic
   * (production / mirror play). Sim seed-sweeps pass a calibrated value to
   * break parameterized-vs-parameterized stalemates — the believability knob.
   */
  cadenceJitter?: number;
  /**
   * `AutomationTiers` gate — the player seat's progression lock. A seat given
   * a tier acts only once that tier is reached; a seat given none is gated by
   * install-presence instead, which is what the two opponent seats use. Omit
   * for bot-vs-bot.
   */
  tier?: SkirmishAutomationTier;
}

/**
 * Per-side AI policy — bone #2. "Production AI plays itself": the SAME factory
 * installs on both sides (bilateral), so the archetype is fully exercisable —
 * and balanceable — headless before a human touches it. On a per-side cadence,
 * while in-match, it spawns as many units as the burst allows (which is what
 * eventually fires `match.end` by defeat when an army breaks through).
 *
 * RECIPE INSTANCE — bilateral sim-bot (see
 * `candidate-recipes.md`). The runner skeleton is
 * invariant: in-match guard → cadence accumulator (+ seeded believability
 * jitter) → decide → act. Only `decide` (here: spawn while affordable, up to a
 * cap) is domain. tug's `opponent-bot.ts` is the coupled source instance; this
 * is N=2. The decision is deliberately INLINE, not a shared callback — the
 * recipe surface keeps copies in place so their divergence is the evaluation
 * signal; a callback-based runner is a graduation outcome, not the staging shape.
 *
 * Bot-vs-bot installs both sides, neither carrying a tier. A player seat swaps
 * its side's policy for input and passes `tier`, which holds the policy behind
 * the ladder in `automation-tiers.ts`.
 */
export function createAutomationModule(side: Side, options: AutomationOptions): EngineModule {
  const cadenceSec = options.cadenceSec ?? BASE_CADENCE_SEC;
  const maxSpawnPerBurst = options.maxSpawnPerBurst ?? Infinity;
  const jitterScale = options.cadenceJitter ?? 0;
  const sideOffset = side === 'a' ? 1 : 2;
  const tier = options.tier;

  return {
    id: `skirmish/match/${side}/automation`,
    dependencies: ['skirmish/automation-tiers', 'skirmish/match', 'skirmish/match/tactical'],
    install(ctx) {
      const match = ctx.inject(MatchKey);
      const tactical = ctx.inject(TacticalKey);
      const tiers = ctx.inject(AutomationTiersKey);

      // Cadence accumulator — persistent so save/load mid-match resumes pacing
      // without dumping a burst on the first post-load tick.
      const sinceActSec = persistent<number>(0, { name: 'sinceActSec' });

      // Lazy per-side seeded RNG for believability jitter — lazy because sim
      // runners seed AFTER install but before the tick loop; the side offset
      // keeps the two sides' streams distinct. Untouched (no RNG draw) when
      // jitter is off, so default play stays deterministic.
      let rng: (() => number) | null = null;
      function jitter(): number {
        if (jitterScale <= 0) return 0;
        if (!rng) rng = createSeededRNG(getSeed() + sideOffset);
        return (rng() * 2 - 1) * jitterScale; // ±jitterScale
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;
        // Tiered seats stay inert until the ladder reaches them; the cadence
        // accumulator does not advance either, so unlocking mid-match starts a
        // fresh interval rather than dumping a banked burst.
        if (tier !== undefined && !tiers.hasReached(tier)) return;
        sinceActSec.value += dt;
        if (sinceActSec.value < cadenceSec * (1 + jitter())) return;
        sinceActSec.value = 0;

        // DECIDE (domain): spawn up to `maxSpawnPerBurst` units while affordable.
        let spawned = 0;
        while (spawned < maxSpawnPerBurst && tactical.spawn(side)) {
          spawned += 1;
        }
      });
    },
  };
}
