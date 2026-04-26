import { persistent, randomItem, type EngineModule } from 'open-loop-engine';
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
 * (`lastSendSec`) gates a single purchase call per `aiSendCadenceSec` window;
 * the per-side sequencer paces actual dispatch against per-archetype
 * cooldowns.
 *
 * Production installs one instance for `'ai'` only — the player drives the
 * other side via UI input. Sim engines (`buildTugSimEngine`) install a
 * second instance for `'player'` so balance harnesses can run unattended.
 *
 * Three modes per `data.balance.aiOpponentMode`:
 *
 * - `'symmetric-mirror'` (default) — pick a random affordable archetype and
 *   purchase it. Income parity is achieved upstream via the
 *   `'balance/aiIncomeMultiplier'` tunable on `tug/match/ai/income`.
 * - `'counter-aware'` (fork extension) — read opponent composition from the
 *   lane and pick the archetype that strong-counters the opponent's current
 *   dominant archetype, falling back to random affordable when no dominance
 *   is detected. Reads `data.counterMatrix` directly (it's data, not a
 *   modifier chain — same call site as the lane combat resolver).
 * - `'off'` (PvP only) — module no-ops; this side stays idle.
 *
 * Module-level gate: skip all work while a match isn't in progress
 * (outcome non-null OR fortresses uninitialized). Keeps the bot from buying
 * during inter-match windows or before `match.start()` runs.
 *
 * **Per-side perturbation isolation seam.** All policy reads from
 * `data.balance.*` (`aiOpponentMode`, `aiSendCadenceSec`) and the
 * `inc >= 2 * cost` upgrade-surplus heuristic + `bestCount >= 2` dominance
 * threshold are *shared* across both side instances by construction.
 * Asymmetric perturbation of any of these requires per-side keying —
 * candidate-primitives.md "Tier-C bilateral-symmetric sim-bot pattern" notes
 * the seam. The only legitimately asymmetric perturbation knob is
 * `'balance/aiIncomeMultiplier'`, which is bound to AI side's income
 * chain by key, not read here.
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
      const mode = data.balance.aiOpponentMode;
      if (mode === 'off') return;

      const match = ctx.inject(MatchKey);
      const lane = ctx.inject(LaneKey);
      const shop = ctx.inject(UnitsKey[side]);
      const income = ctx.inject(IncomeKey[side]);
      const upgrades = ctx.inject(IncomeUpgradesKey[side]);

      // archetypeId → matrix-index map. Same convention as lane.ts and
      // match.ts: data.units order is load-bearing.
      const idxOf = new Map<string, number>();
      for (let i = 0; i < data.units.length; i++) idxOf.set(data.units[i].id, i);

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

      function pickCounterAware(): string | null {
        const dominant = dominantOpponentArchetype();
        if (!dominant) return null;
        const dIdx = idxOf.get(dominant);
        if (dIdx === undefined) return null;
        // Find the archetype with the strongest matrix cell against the
        // opponent's dominant. Restrict to side-affordable.
        const affordable = shop.getAffordable();
        let bestId: string | null = null;
        let bestCell = 1; // require strictly > 1 to count as a counter
        for (const p of affordable) {
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

      ctx.onTick((dt) => {
        if (!match.inMatch.value) return;
        lastSendSec.value += dt;
        if (lastSendSec.value < data.balance.aiSendCadenceSec) return;

        // Income-upgrade spend branch. Walk tiers in order; first
        // un-bought purchasable tier is the next candidate. Sequential
        // gating means later tiers won't be canPurchase until earlier
        // tiers buy in, so we stop walking on the first un-bought entry.
        // Surplus heuristic: only buy if cost ≤ ½ current side income —
        // keeps the bot from starving its unit production with greedy
        // upgrade buys. Mirrors corpus AI policies (don't spend until
        // income > N×cost).
        for (const def of data.incomeUpgrades) {
          const p = upgrades.getPurchasable(def.id);
          if (!p) break;
          if (p.bought.value) continue;
          if (!p.canPurchase.value) break;
          const cost = Number(p.getCost(1));
          const inc = Number(income.value);
          if (inc >= 2 * cost) {
            p.purchase();
            lastSendSec.value = 0;
            return; // Spent on upgrade this cadence; unit-buy waits for next.
          }
          break; // Affordable but not surplus — wait.
        }

        const affordable = shop.getAffordable();
        // Hold the cadence accumulator if nothing affordable — when income
        // catches up, the bot buys on the next tick rather than waiting an
        // extra full cadence window.
        if (affordable.length === 0) return;

        let chosenId: string | null = null;
        if (mode === 'counter-aware') {
          chosenId = pickCounterAware();
        }
        if (!chosenId) {
          // Symmetric-mirror default OR counter-aware fallback when no
          // dominance is detected. randomItem uses the engine's seeded RNG
          // so sim runs are deterministic given a seed.
          const pick = randomItem(affordable);
          chosenId = pick?.id ?? null;
        }

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
