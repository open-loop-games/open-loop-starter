import { persistent, randomItem, type EngineModule } from 'open-loop-engine';
import { PERSONAS, type Persona } from '../data/personality';
import type { TugData } from '../data/types';
import { IncomeKey } from './income';
import { IncomeUpgradesKey } from './income-upgrades';
import { LaneKey } from './lane';
import { MatchKey } from './match';
import { type Side } from './tuning';
import { UnitsKey } from './units';

const OPPOSITE: Record<Side, Side> = { player: 'ai', ai: 'player' };

/**
 * Per-side opponent policy module. Hand-rolls cadence on top of `ctx.onTick`
 * rather than adopting `setupAutoPurchase`, which would buy every affordable
 * archetype every tick and dump the side's economy. The accumulator
 * (`lastSendSec`) gates a single purchase call per cadence window; the
 * per-side sequencer paces actual dispatch against per-archetype cooldowns.
 *
 * Production installs one instance for `'ai'` only — the player drives the
 * other side via UI input. Sim engines (`buildTugSimEngine`) install a
 * second instance for `'player'` so balance harnesses can run unattended.
 *
 * **Parameterized-personality decision code.** The decision-architecture
 * (cadence gate → upgrade branch → unit picker) is invariant across
 * personas. `data.balance.opponentPersona[side]` is read per tick and the
 * matching `Persona` parameter vector drives:
 *
 * - cadence threshold (`cadenceMultiplier * aiSendCadenceSec`)
 * - upgrade greed (`inc >= upgradeSurplusFactor * cost`; `Infinity` skips)
 * - eligible-pool gating (`minSpendCost`; abstain when nothing affordable
 *   meets the floor — saves funds for next cadence, the tech rush pattern)
 * - action selection (`unitPicker`: `cheapest` / `top-tier` / `counter`)
 *
 * The 4 canonical personas live in `data/personality.ts`; the OL-721
 * game-AI variety study D7 specifies their consumer-side adoption shape.
 *
 * **Per-side perturbation isolation seam.** All policy reads from
 * `data.balance.*` are shared across both side instances by construction
 * EXCEPT `opponentPersona[side]`, which is the legitimately asymmetric
 * field. Asymmetric perturbation of `aiSendCadenceSec` or upgrade thresholds
 * requires per-side keying — see `open-loop-engine/docs/candidate-
 * primitives.md` "Tier-C bilateral-symmetric sim-bot pattern". The
 * existing asymmetric income knob (`'balance/aiIncomeMultiplier'`) is
 * bound to the AI side's income chain by key, not read here.
 *
 * **PvP / no-bot.** PvP mode (or any "no AI on this side" config) is
 * expressed by not installing the module for that side, not by a sentinel
 * persona. Production's `createTugModules` installs `'ai'` only.
 */
export function createOpponentBotModule(data: TugData, side: Side): EngineModule {
  const opposite = OPPOSITE[side];
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
      const shop = ctx.inject(UnitsKey[side]);
      const income = ctx.inject(IncomeKey[side]);
      const upgrades = ctx.inject(IncomeUpgradesKey[side]);

      // archetypeId → matrix-index map. Same convention as lane.ts and
      // match.ts: data.units order is load-bearing.
      const idxOf = new Map<string, number>();
      const costOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) {
        idxOf.set(data.units[i].id, i);
        costOf.set(data.units[i].id, Number(data.units[i].cost));
      }

      // Cadence accumulator. Persistent so save/load mid-match resumes
      // pacing without dumping a buy on the first post-load tick. Resets to
      // 0 on match-boundary reset (the match-scope reset enumerates this
      // module).
      const lastSendSec = persistent<number>(0, { name: 'lastSendSec' });

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

      function pickCounterAware(eligible: Array<{ id: string }>): string | null {
        const dominant = dominantOpponentArchetype();
        if (!dominant) return null;
        const dIdx = idxOf.get(dominant);
        if (dIdx === undefined) return null;
        // Find the eligible archetype with the strongest matrix cell
        // against the opponent's dominant. Strict > 1 to count as a counter.
        let bestId: string | null = null;
        let bestCell = 1;
        for (const p of eligible) {
          const aIdx = idxOf.get(p.id);
          if (aIdx === undefined) continue;
          const cell = data.counterMatrix[aIdx][dIdx];
          if (cell > bestCell) {
            bestCell = cell;
            bestId = p.id;
          }
        }
        return bestId;
      }

      function pickByPersona(persona: Persona, affordable: Array<{ id: string }>): string | null {
        // Apply minSpendCost gate. Empty eligible pool = abstain (save
        // funds for next cadence). `tech` uses this; other personas leave
        // minSpendCost = 0 so eligible === affordable.
        const eligible =
          persona.minSpendCost > 0
            ? affordable.filter((p) => (costOf.get(p.id) ?? 0) >= persona.minSpendCost)
            : affordable;
        if (eligible.length === 0) return null;

        switch (persona.unitPicker) {
          case 'cheapest': {
            let bestId: string | null = null;
            let bestCost = Infinity;
            for (const p of eligible) {
              const c = costOf.get(p.id) ?? Infinity;
              if (c < bestCost) {
                bestCost = c;
                bestId = p.id;
              }
            }
            return bestId;
          }
          case 'top-tier': {
            let bestId: string | null = null;
            let bestCost = -Infinity;
            for (const p of eligible) {
              const c = costOf.get(p.id) ?? -Infinity;
              if (c > bestCost) {
                bestCost = c;
                bestId = p.id;
              }
            }
            return bestId;
          }
          case 'counter': {
            // Counter-aware with random-affordable fallback when no
            // dominance is detected. randomItem uses the engine's seeded
            // RNG so sim runs are deterministic given a seed.
            return pickCounterAware(eligible) ?? randomItem(eligible)?.id ?? null;
          }
        }
      }

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;

        // Per-tick persona read so runtime mutation
        // (`data.balance.opponentPersona[side] = key`) takes effect on
        // the next cadence without re-installing the module.
        const persona = PERSONAS[data.balance.opponentPersona[side]];

        lastSendSec.value += dt;
        if (lastSendSec.value < data.balance.aiSendCadenceSec * persona.cadenceMultiplier) return;

        // Income-upgrade spend branch. Walk tiers in order; first un-bought
        // tier is the next candidate. Sequential gating means later tiers
        // won't be canPurchase until earlier tiers buy in, so we stop
        // walking on the first un-bought entry.
        //
        // Per-tier mode selected by tier index relative to
        // `persona.saveForUpgradeTiers`:
        //
        //   - tier index < saveForUpgradeTiers: SAVE-FIRST. Buy when
        //     balance >= cost; abstain from unit buy while still saving.
        //     Forces an economy-first phase.
        //   - tier index >= saveForUpgradeTiers: OPPORTUNISTIC. Buy when
        //     balance >= surplusFactor × cost; fall through to unit buy
        //     otherwise. `Infinity` factor disables this path.
        //
        // With `saveForUpgradeTiers: 0` AND `upgradeSurplusFactor: Infinity`,
        // the upgrade branch effectively no-ops (mass / counter / tech).
        for (let tierIdx = 0; tierIdx < data.incomeUpgrades.length; tierIdx++) {
          const def = data.incomeUpgrades[tierIdx];
          const p = upgrades.getPurchasable(def.id);
          if (!p) break;
          if (p.bought.value) continue;
          const cost = Number(p.getCost(1));
          const inc = Number(income.value);
          if (tierIdx < persona.saveForUpgradeTiers) {
            // save-first
            if (inc >= cost) {
              p.purchase();
              lastSendSec.value = 0;
              return;
            }
            // Saving — abstain from unit buy this cadence.
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
          break; // Affordable but not surplus — fall through to unit buy.
        }

        const affordable = shop.getAffordable();
        // Hold the cadence accumulator if nothing affordable — when income
        // catches up, the bot buys on the next tick rather than waiting an
        // extra full cadence window.
        if (affordable.length === 0) return;

        const chosenId = pickByPersona(persona, affordable);
        // Null = abstain (tech with no eligible top-tier affordable). Hold
        // the accumulator at the threshold so funds keep accumulating
        // toward the next cadence window — same as the empty-affordable
        // path above.
        if (!chosenId) return;

        // The shop's `onPurchase` (registered in leaf-3 units.ts) enqueues
        // the unit into SequencerKey[side]; the sequencer's canRun + tick
        // loop dispatches against per-archetype cooldowns. Opponent
        // composition is read off lane.units[opposite] above, not via
        // UnitsKey[opposite] — live-on-field counts reflect strategy
        // better than cumulative buys.
        const purchasable = shop.getPurchasable(chosenId);
        purchasable?.purchase();
        lastSendSec.value = 0;
      });
    },
  };
}
