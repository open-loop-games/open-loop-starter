import {
  createSeededRNG,
  getSeed,
  persistent,
  randomItem,
  type EngineModule,
} from '@open-loop/engine';
import { PERSONAS, type Persona, type PersonaKey } from '../data/personality';
import type { TugBelievability, TugData } from '../data/types';
import { getIncome } from './income';
import { getIncomeUpgrades } from './income-upgrades';
import { LaneKey } from './lane';
import { MatchKey } from './match';
import { type Side } from './tuning';
import { getUnits } from './units';

const OPPOSITE: Record<Side, Side> = { player: 'ai', ai: 'player' };

/** Baseline seconds between AI spend attempts. Per-persona
 *  `cadenceMultiplier` scales this at decision time. Direct-Strike-typical;
 *  an AI-quirk pacing constant, not a balance constant. */
const AI_SEND_CADENCE_SEC = 4;

/** Production-zero believability — deterministic AI, predictable for the
 *  human player. Headless engines pass a calibrated bundle to break parameterized-
 *  vs-parameterized mirror stalemates per composition-cookbook §
 *  Believability-calibration discipline. */
const PRODUCTION_BELIEVABILITY: TugBelievability = {
  suboptimalityRate: 0,
  cadenceJitterScale: 0,
};

export interface OpponentBotOptions {
  /** Persona key from `data/personality.ts`. Production AI uses
   *  `'counter'`; headless engines vary it per side. */
  persona: PersonaKey;
  /** Calibration constraint on AI decision execution. Defaults to
   *  production-zero (deterministic). Headless engines override it. */
  believability?: TugBelievability;
}

/**
 * Per-side opponent policy module. Hand-rolls cadence on top of `ctx.onTick`
 * rather than adopting `setupAutoPurchase`, which would purchase every affordable
 * archetype every tick and dump the side's economy. The accumulator
 * (`lastSendSec`) allows a single purchase call per cadence window; the
 * per-side sequencer paces actual sends against per-archetype cooldowns.
 *
 * Production installs one instance for `'ai'` with `persona: 'counter'`;
 * the player drives the other side via UI input. Headless engines
 * (`buildTugScratchEngine`) install a second instance for `'player'` as an
 * automated player, so balance-harness runs need no human.
 *
 * **Parameterized-personality decision code.** The decision-architecture
 * (cadence check → upgrade branch → unit picker) is invariant across
 * personas. The `persona` constructor arg drives:
 *
 * - cadence threshold (`cadenceMultiplier * AI_SEND_CADENCE_SEC`)
 * - upgrade greed (`inc >= upgradeSurplusFactor * cost`; `Infinity` skips)
 * - eligible-pool filtering (`minSpendCost`; abstain when nothing affordable
 *   meets the floor — saves funds for next cadence, the tech rush pattern)
 * - action selection (`unitPicker`: `cheapest` / `highest-cost` / `counter`)
 *
 * The canonical personas are in `data/personality.ts`.
 *
 * **Believability calibration applies independently** of persona choice.
 * Production has both fields at 0 (deterministic); headless engines pass a
 * calibrated bundle (suboptimality + cadence jitter) driven by an
 * independent per-side seeded RNG stream so toggling believability on one
 * side doesn't shift global RNG state used by the other side's
 * `randomItem(eligible)` fallback.
 *
 * **PvP / no AI.** PvP mode (or any "no AI on this side" config) is
 * expressed by not installing the module for that side. Production's
 * `createTugModules` installs `'ai'` only.
 *
 * **Candidate primitive.** This module, installed on both sides, is the
 * pattern `candidate-primitives.md` calls bilateral-symmetric sim-bot, a
 * candidate for engine graduation. See `candidate-primitives.md` §
 * bilateral-symmetric sim-bot pattern; graduation trigger is a second
 * adversarial-state consumer landing.
 */
export function createOpponentBotModule(
  data: TugData,
  side: Side,
  options: OpponentBotOptions,
): EngineModule {
  const opposite = OPPOSITE[side];
  const persona: Persona = PERSONAS[options.persona];
  const believability: TugBelievability = options.believability ?? PRODUCTION_BELIEVABILITY;
  return {
    id: `tug/match/${side}/opponent-bot`,
    dependencies: [
      'tug/match',
      'tug/match/lane',
      `tug/match/${side}/units`,
      `tug/match/${side}/income`,
      `tug/match/${side}/income-upgrades`,
    ],
    install(ctx) {
      const match = ctx.inject(MatchKey);
      const lane = ctx.inject(LaneKey);
      const shop = getUnits(side);
      const income = getIncome(side);
      const upgrades = getIncomeUpgrades(side);

      // archetypeId → matrix-index map. Same convention as lane.ts and
      // match.ts: data.units order is load-bearing.
      const idxOf = new Map<string, number>();
      const costOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) {
        idxOf.set(data.units[i].id, i);
        costOf.set(data.units[i].id, Number(data.units[i].cost));
      }

      // Cadence accumulator. Persistent so save/load mid-match resumes
      // pacing without dumping a purchase on the first post-load tick. Resets to
      // 0 on match-boundary reset (the match-scope reset enumerates this
      // module).
      const lastSendSec = persistent<number>(0, { id: 'lastSendSec' });

      // Lazy per-side seeded RNG for believability calibration. Lazy
      // because `runHeadless`/`runUntil` calls `seedRNG(config.seed)` after
      // module install but before the tick loop — initializing in `install`
      // would read the previous run's seed. Side-keyed offset so player and
      // ai streams are deterministic-but-distinct given the global seed.
      // Independent stream from the module-level `random()` used by
      // `randomItem(eligible)` below — toggling believability never shifts
      // the global RNG state.
      let botRng: (() => number) | null = null;
      const sideOffset = side === 'player' ? 1 : 2;
      function rng(): number {
        if (!botRng) botRng = createSeededRNG(getSeed() + sideOffset);
        return botRng();
      }

      function dominantOpponentArchetype(): string | null {
        const arr = lane.units[opposite].value;
        if (arr.length === 0) return null;
        const counts = new Map<string, number>();
        for (const u of arr) counts.set(u.archetypeId, (counts.get(u.archetypeId) ?? 0) + 1);
        let bestId: string | null = null;
        let bestCount = 0;
        for (const [id, c] of counts) {
          if (c > bestCount) {
            bestId = id;
            bestCount = c;
          }
        }
        return bestCount >= 2 ? bestId : null;
      }

      /** Rank eligible archetypes by counter-strength against the
       *  opponent's dominant. Returns up to two ids (best, second-best),
       *  filtered to strict counters (cell > 1.0). Empty list when no
       *  dominance is detected, no eligible counter exists, or only one
       *  candidate qualifies — caller falls back to `randomItem` semantics. */
      function pickCounterRanked(eligible: Array<{ id: string }>): string[] {
        const dominant = dominantOpponentArchetype();
        if (!dominant) return [];
        const dIdx = idxOf.get(dominant);
        if (dIdx === undefined) return [];
        const scored: Array<{ id: string; cell: number }> = [];
        for (const p of eligible) {
          const aIdx = idxOf.get(p.id);
          if (aIdx === undefined) continue;
          const cell = data.counterMatrix[aIdx][dIdx];
          if (cell > 1) scored.push({ id: p.id, cell });
        }
        scored.sort((a, b) => b.cell - a.cell);
        return scored.slice(0, 2).map((s) => s.id);
      }

      /** Believability suboptimality wrap: with probability `rate`, return
       *  the second-best item from a ranked list (descending preference);
       *  else return the best. Length-0 short-circuits to null; length-1
       *  always returns the only option (no swap to make). */
      function pickWithSuboptimality<T>(ranked: T[], rate: number): T | null {
        if (ranked.length === 0) return null;
        if (rate > 0 && ranked.length >= 2 && rng() < rate) return ranked[1];
        return ranked[0];
      }

      function pickByPersona(p: Persona, affordable: Array<{ id: string }>): string | null {
        // Apply the minSpendCost filter. Empty eligible pool = abstain (save
        // funds for next cadence). `tech` uses this; other personas leave
        // minSpendCost = 0 so eligible === affordable.
        const eligible =
          p.minSpendCost > 0
            ? affordable.filter((q) => (costOf.get(q.id) ?? 0) >= p.minSpendCost)
            : affordable;
        if (eligible.length === 0) return null;

        const subRate = believability.suboptimalityRate;

        switch (p.unitPicker) {
          case 'cheapest': {
            const ranked = [...eligible].sort(
              (a, b) => (costOf.get(a.id) ?? Infinity) - (costOf.get(b.id) ?? Infinity),
            );
            return pickWithSuboptimality(ranked, subRate)?.id ?? null;
          }
          case 'highest-cost': {
            const ranked = [...eligible].sort(
              (a, b) => (costOf.get(b.id) ?? -Infinity) - (costOf.get(a.id) ?? -Infinity),
            );
            return pickWithSuboptimality(ranked, subRate)?.id ?? null;
          }
          case 'counter': {
            // Believability suboptimality applies to the matrix-ranked
            // counter pick (best vs second-best counter). Random-affordable
            // fallback when no dominance is detected stays untouched —
            // its semantics are already legitimate decision noise from the
            // production policy and aren't believability calibration.
            const counterRanked = pickCounterRanked(eligible);
            if (counterRanked.length > 0) {
              return pickWithSuboptimality(counterRanked, subRate);
            }
            return randomItem(eligible)?.id ?? null;
          }
        }
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;

        lastSendSec.value += dt;
        const baseThreshold = AI_SEND_CADENCE_SEC * persona.cadenceMultiplier;
        const jitter = believability.cadenceJitterScale;
        // Multiplicative ±jitter; one constant covers all persona cadence
        // shapes. Production has jitter=0 so the threshold is exact.
        const threshold =
          jitter > 0 ? baseThreshold * (1 + (rng() * 2 - 1) * jitter) : baseThreshold;
        if (lastSendSec.value < threshold) return;

        // Income-upgrade spend branch. Walk tiers in order; first unpurchased
        // tier is the next candidate. Tiers unlock in order, so later tiers
        // won't be canPurchase until earlier tiers are purchased; we stop
        // walking on the first unpurchased entry.
        //
        // Per-tier mode selected by tier index relative to
        // `persona.saveForUpgradeTiers`:
        //
        //   - tier index < saveForUpgradeTiers: SAVE-FIRST. Purchase when
        //     amount >= cost; abstain from unit purchases while still saving.
        //     Forces an economy-first phase.
        //   - tier index >= saveForUpgradeTiers: OPPORTUNISTIC. Purchase when
        //     amount >= surplusFactor × cost; fall through to unit purchase
        //     otherwise. `Infinity` factor disables this path.
        //
        // With `saveForUpgradeTiers: 0` AND `upgradeSurplusFactor: Infinity`,
        // the upgrade branch effectively no-ops (mass / counter / tech).
        for (let tierIdx = 0; tierIdx < data.incomeUpgrades.length; tierIdx++) {
          const def = data.incomeUpgrades[tierIdx];
          const p = upgrades.getPurchasable(def.id);
          if (!p) break;
          if (p.active.value) continue;
          const cost = Number(p.getCost(1));
          const inc = Number(income.value);
          if (tierIdx < persona.saveForUpgradeTiers) {
            // save-first
            if (inc >= cost) {
              p.purchase();
              lastSendSec.value = 0;
              return;
            }
            // Saving — abstain from unit purchases this cadence.
            return;
          }
          // opportunistic
          if (!Number.isFinite(persona.upgradeSurplusFactor)) break;
          if (!p.canPurchase.value) break;
          if (inc >= persona.upgradeSurplusFactor * cost) {
            p.purchase();
            lastSendSec.value = 0;
            return;
          }
          break; // Affordable but not surplus — fall through to unit purchase.
        }

        const affordable = shop.getAffordable();
        // Hold the cadence accumulator if nothing affordable — when income
        // catches up, the AI opponent purchases on the next tick rather than waiting an
        // extra full cadence window.
        if (affordable.length === 0) return;

        const chosenId = pickByPersona(persona, affordable);
        // Null = abstain (tech with no eligible highest-cost unit affordable). Hold
        // the accumulator at the threshold so funds keep accumulating
        // toward the next cadence window — same as the empty-affordable
        // path above.
        if (!chosenId) return;

        // The shop's `onPurchase` enqueues the unit into SequencerKey[side];
        // the sequencer's canStart + tick loop starts sends against
        // per-archetype cooldowns. Opponent composition is read off
        // lane.units[opposite] above, not via getUnits(opposite) — live-on-
        // field counts reflect policy better than cumulative purchases.
        const purchasable = shop.getPurchasable(chosenId);
        purchasable?.purchase();
        lastSendSec.value = 0;
      });
    },
  };
}
