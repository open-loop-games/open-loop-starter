import {
  createSeededRNG,
  getSeed,
  persistent,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { MatchKey } from './match';
import { EconomyKey } from './economy';
import { TacticalKey } from './tactical-sim';
import { AutomationTiersKey, type SkirmishAutomationTier } from './automation-tiers';
import { type Side } from './tuning';
import { type UnitTypeId, PERSONAS, getPersonaDef, type PersonaKey } from '../data/tactical';

/** Baseline seconds between spawn decisions, before per-persona scaling. */
const BASE_CADENCE_SEC = 3;

export interface AutomationOptions {
  /**
   * `φ` — the guns-versus-butter split, in [0, 1): the share of income this
   * seat directs into workers rather than army. **The archetype's primary
   * strategy axis** (`../IDENTITY.md` § Rate-function spine); a persona is
   * mostly this number.
   *
   * Steered against realized spend rather than applied per-purchase, so it is a
   * share of income over the match and not a coin flip per decision. `φ = 0` is
   * all-army — the degenerate case, and what every seat did before an economy
   * existed. `φ → 1` never commits and loses to anything that does.
   */
  economyShare?: number;
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
  /**
   * Relative draft weights across unit types. Defaults to `{ trooper: 1 }`.
   * Example: `{ trooper: 2, archer: 1, cavalry: 1 }` produces 50% troopers,
   * 25% archers, and 25% cavalry in a deterministic round-robin burst.
   */
  composition?: Partial<Record<UnitTypeId, number>>;
}

export interface AutomationApi {
  side: Side;
  currentPersona: Persistent<PersonaKey | 'custom'>;
  economyShare: Persistent<number>;
  cadenceSec: Persistent<number>;
  maxSpawnPerBurst: Persistent<number>;
  cadenceJitter: Persistent<number>;
  composition: Persistent<Partial<Record<UnitTypeId, number>>>;
  setPersona: (key: PersonaKey) => void;
}

export const AutomationKey: Record<Side, InjectionKey<AutomationApi>> = {
  a: Symbol('skirmish/automation/a') as InjectionKey<AutomationApi>,
  b: Symbol('skirmish/automation/b') as InjectionKey<AutomationApi>,
};

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
  const initialEconomyShare = options.economyShare ?? 0;
  const initialCadenceSec = options.cadenceSec ?? BASE_CADENCE_SEC;
  const initialBurst = options.maxSpawnPerBurst ?? Infinity;
  const initialJitter = options.cadenceJitter ?? 0;
  const initialComp = options.composition ?? { trooper: 1 };
  const sideOffset = side === 'a' ? 1 : 2;
  const tier = options.tier;

  // Determine initial persona key if one matches exactly
  let initialPersona: PersonaKey | 'custom' = 'custom';
  for (const [key, def] of Object.entries(PERSONAS) as Array<
    [PersonaKey, (typeof PERSONAS)[PersonaKey]]
  >) {
    if (
      def.economyShare === initialEconomyShare &&
      def.cadenceSec === initialCadenceSec &&
      def.maxSpawnPerBurst === initialBurst
    ) {
      initialPersona = key;
      break;
    }
  }
  return {
    id: `skirmish/match/${side}/automation`,
    dependencies: [
      'skirmish/automation-tiers',
      'skirmish/match',
      'skirmish/match/economy',
      'skirmish/match/tactical',
    ],
    install(ctx) {
      const match = ctx.inject(MatchKey);
      const tactical = ctx.inject(TacticalKey);
      const economy = ctx.inject(EconomyKey);
      const tiers = ctx.inject(AutomationTiersKey);
      // Cadence accumulator — persistent so save/load mid-match resumes pacing
      // without dumping a burst on the first post-load tick.
      const sinceActSec = persistent<number>(0, { name: `sinceActSec-${side}` });
      const draftIndex = persistent<number>(0, { name: `draftIndex-${side}` });

      const currentPersona = persistent<PersonaKey | 'custom'>(initialPersona, {
        name: `persona-${side}`,
      });
      const economyShare = persistent<number>(initialEconomyShare, {
        name: `econShare-${side}`,
      });
      const cadenceSec = persistent<number>(initialCadenceSec, {
        name: `cadence-${side}`,
      });
      const maxSpawnPerBurst = persistent<number>(initialBurst, {
        name: `maxBurst-${side}`,
      });
      const jitterScale = persistent<number>(initialJitter, {
        name: `jitter-${side}`,
      });
      const composition = persistent<Partial<Record<UnitTypeId, number>>>(initialComp, {
        name: `composition-${side}`,
      });

      let draftSequence: UnitTypeId[] = [];
      function rebuildDraftSequence() {
        draftSequence = [];
        for (const [typeId, weight] of Object.entries(composition.value)) {
          const count = Math.max(0, Math.floor(weight ?? 0));
          for (let i = 0; i < count; i++) {
            draftSequence.push(typeId as UnitTypeId);
          }
        }
        if (draftSequence.length === 0) draftSequence.push('trooper');
      }
      rebuildDraftSequence();

      function setPersona(key: PersonaKey): void {
        const def = getPersonaDef(key);
        currentPersona.value = key;
        economyShare.value = def.economyShare;
        cadenceSec.value = def.cadenceSec;
        maxSpawnPerBurst.value = def.maxSpawnPerBurst;
        jitterScale.value = def.cadenceJitter ?? 0;
        composition.value = { ...def.composition };
        rebuildDraftSequence();
      }

      const api: AutomationApi = {
        side,
        currentPersona,
        economyShare,
        cadenceSec,
        maxSpawnPerBurst,
        cadenceJitter: jitterScale,
        composition,
        setPersona,
      };
      ctx.provide(AutomationKey[side], api);

      // Lazy per-side seeded RNG for believability jitter
      let rng: (() => number) | null = null;
      function jitter(): number {
        if (jitterScale.value <= 0) return 0;
        if (!rng) rng = createSeededRNG(getSeed() + sideOffset);
        return (rng() * 2 - 1) * jitterScale.value; // ±jitterScale
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;
        if (tier !== undefined && !tiers.hasReached(tier)) return;
        sinceActSec.value += dt;
        if (sinceActSec.value < cadenceSec.value * (1 + jitter())) return;
        sinceActSec.value = 0;

        // DECIDE (domain), in two steps.
        // 1. Allocation
        while (economy.realizedShare(side) < economyShare.value && economy.buyWorker(side)) {
          /* keep investing */
        }

        // 2. Commitment
        const reserve = economy.realizedShare(side) < economyShare.value ? economy.workerCost() : 0;
        let spawned = 0;
        while (spawned < maxSpawnPerBurst.value) {
          const nextType = draftSequence[draftIndex.value % draftSequence.length];
          const unitCost = tactical.unitCost(nextType);
          if (economy.available(side) < unitCost + reserve) break;
          if (!tactical.spawn(side, nextType)) break;
          spawned += 1;
          draftIndex.value += 1;
        }
      });
    },
  };
}
