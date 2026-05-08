/**
 * Regression locks for the Scaler challenges leaf — direct API exercise on
 * the engine's `createChallengeCategory` wiring + the consumer-side ECC reward
 * binds + the per-leaf invariants the spec § 5 names.
 *
 * Bootstrap shape: each test boots a fresh engine and stages state directly
 * (`coins.value`, `acceleratorPurchasable.amount.value`, etc.) rather than
 * sim-running to first transcend. Direct staging is ~5ms vs. the ~5s
 * transcend-bootstrap, and the assertions don't need the sim path — they
 * lock module behaviour, not balance trajectory. The walkthrough closure
 * (OL-916) exercises the full bootstrap path.
 *
 * Invariants pinned (see plan file § Sim plan):
 *   1. Restricts apply on enter (Ch2 reduces coin rate)
 *   2. Restricts clear on exit (rate restores)
 *   3. Auto-completion on tick (goal-met → completions += 1)
 *   4. Auto-exit on completion (active → false post-tick)
 *   5. Reward bind present post-completion (chain.bindings includes 'Ch2 reward')
 *   6. Completions persist across transcend reset
 *   7. `category.allMaxed` flips when every challenge is at completionLimit
 *   8. `runChallengeSweep` enters next unmaxed challenge automatically
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'open-loop-engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getAccelerator,
  getMultiplier,
  getCoinResource,
  getCoinProducers,
  getChallengesCategory,
  getTranscendConversion,
  getTranscendPoints,
  getCoinsThisTranscension,
  getAutoEnabled,
  getAutobuyerToggles,
  challengeRequirement,
} from '../modules';

function bootEngine(label: string) {
  const { engine } = createScalerEngine({
    persistenceNamespace: `challenge-beat-${label}-${Math.random().toString(36).slice(2)}`,
  });
  engine.selectMod(SCALER_MOD_ID);
  engine.start();
  return engine;
}

describe('scaler challenges-beat lock', () => {
  it('(1) restricts apply on enter — Ch2 zeros Accelerator + caps Multiplier', () => {
    const engine = bootEngine('ch2-restricts-on');
    const accelerator = getAccelerator();
    const multiplier = getMultiplier();
    const coin1 = getCoinProducers().getProducer('coin-1')!;
    const cat = getChallengesCategory()!;

    // Stage Accelerator + Multiplier amounts so the existing 'Accelerator' and
    // 'Multiplier' binds contribute non-trivially. Without staging, both
    // amounts are 0 and the contributions evaluate to identity 1 — Ch2's
    // neutralization wouldn't observably change the rate.
    accelerator.amount.value = 10;
    multiplier.amount.value = 5;

    // Pre-enter rate sample (multiplicative composition of base × Accel × Mult).
    const preRate = new Decimal(coin1.computedRate.value);

    const ch2 = cat.getChallenge('challenge-2')!;
    expect(ch2.enter()).toBe(true);

    // Tick once so the chain re-evaluates (Vue computeds are pull-based and
    // chain.bind reads via the active predicate — re-eval happens on next read).
    const postRate = new Decimal(coin1.computedRate.value);

    // Ch2 collapses Accelerator (1.10^10 ≈ 2.59) to 1, and Multiplier (2^5 = 32)
    // to 1.25^5 ≈ 3.05. Combined ratio: postRate / preRate
    //   = (1 × 3.05) / (2.59 × 32)
    //   = 3.05 / 82.9 ≈ 0.0368 — large reduction.
    expect(postRate.lt(preRate)).toBe(true);
    expect(Decimal.div(postRate, preRate).toNumber()).toBeLessThan(0.1);

    engine.dispose();
  });

  it('(2) restricts clear on exit — rate restores within tolerance', () => {
    const engine = bootEngine('ch2-restricts-off');
    const accelerator = getAccelerator();
    const multiplier = getMultiplier();
    const coin1 = getCoinProducers().getProducer('coin-1')!;
    const cat = getChallengesCategory()!;

    accelerator.amount.value = 10;
    multiplier.amount.value = 5;
    const preRate = new Decimal(coin1.computedRate.value);

    const ch2 = cat.getChallenge('challenge-2')!;
    ch2.enter();
    ch2.exit();

    const postRate = new Decimal(coin1.computedRate.value);
    // Rates equal within float precision after restricts clear.
    expect(Math.abs(Decimal.sub(postRate, preRate).toNumber())).toBeLessThan(1e-6);

    engine.dispose();
  });

  it('(3) + (4) auto-completion on tick + auto-exit', () => {
    const engine = bootEngine('autocomplete');
    const coins = getCoinResource();
    const cat = getChallengesCategory()!;

    const ch1 = cat.getChallenge('challenge-1')!;
    expect(ch1.completions.value).toBe(0);

    // Set coins above Ch1's first-completion goal (10^(base × (1+0)^2) =
    // 10^10 with base=10), enter, tick once.
    const goal = challengeRequirement(1, 0);
    coins.value = Decimal.mul(goal, 2); // 2× margin

    expect(ch1.enter()).toBe(true);
    expect(ch1.active.value).toBe(true);

    // Engine tick scans canComplete → calls complete(false), which exits.
    engine.loop.simulateTick(1);

    // (3) Completion increments
    expect(ch1.completions.value).toBe(1);
    // (4) Auto-exit (default complete(false) calls exit())
    expect(ch1.active.value).toBe(false);

    engine.dispose();
  });

  it('(5) reward bind present in coin-1 rateChain post-completion', () => {
    const engine = bootEngine('reward-bind');
    const coins = getCoinResource();
    const cat = getChallengesCategory()!;
    const coin1 = getCoinProducers().getProducer('coin-1')!;

    // Reward binds are install-time permanent — they exist on the chain
    // before any challenge is completed (their multiplier closure reads
    // completions.value, which is 0 → contribute identity 1). Verify both
    // pre- and post-completion: the binding ID is present from install.
    const preBindingIds = coin1.rateChain.bindings().map((b) => b.id);
    expect(preBindingIds.some((id) => id.includes('Ch2 reward'))).toBe(true);

    // Trigger a Ch2 completion to confirm the bind survives the
    // category-internal complete() flow (no rebind / unbind happens —
    // completion increment flows through computed reactivity).
    coins.value = Decimal.mul(challengeRequirement(2, 0), 2);
    const ch2 = cat.getChallenge('challenge-2')!;
    ch2.enter();
    engine.loop.simulateTick(1);
    expect(ch2.completions.value).toBe(1);

    const postBindingIds = coin1.rateChain.bindings().map((b) => b.id);
    expect(postBindingIds.some((id) => id.includes('Ch2 reward'))).toBe(true);

    engine.dispose();
  });

  it('(6) completions persist across transcend reset', () => {
    const engine = bootEngine('persist');
    const coins = getCoinResource();
    const coinsThisTranscension = getCoinsThisTranscension();
    const tp = getTranscendPoints();
    const cat = getChallengesCategory()!;

    // Complete Ch1 once via the goal+tick path.
    coins.value = Decimal.mul(challengeRequirement(1, 0), 2);
    const ch1 = cat.getChallenge('challenge-1')!;
    ch1.enter();
    engine.loop.simulateTick(1);
    expect(ch1.completions.value).toBe(1);
    expect(ch1.active.value).toBe(false);

    // Stage transcend conversion ready: coinsThisTranscension above threshold,
    // not in any challenge. The conversion's allOf wraps the disjunction with
    // !inAnyTranscensionChallenge — Ch1 just exited, so the guard passes.
    coinsThisTranscension.value = Decimal.mul(1e17, 1); // above 5e16 threshold
    const transcendConversion = getTranscendConversion();
    expect(transcendConversion.canConvert.value).toBe(true);

    transcendConversion.convert();

    // Transcend reset walks scaler-coin / scaler-prestige / scaler-transcend.
    // scaler-challenges is NOT in resetModules, so completion refs persist.
    expect(ch1.completions.value).toBe(1);
    expect(Decimal.gt(tp.cumulative?.value ?? 0, 0)).toBe(true);

    engine.dispose();
  });

  it('(7) category.allMaxed flips at completionLimit', () => {
    const engine = bootEngine('all-maxed');
    const cat = getChallengesCategory()!;

    expect(cat.allMaxed.value).toBe(false);

    for (const entry of cat.getAll()) {
      entry.challenge.completions.value = entry.def.completionLimit;
    }

    expect(cat.allMaxed.value).toBe(true);

    engine.dispose();
  });

  it('(8) runChallengeSweep enters next unmaxed when none active', () => {
    const engine = bootEngine('sweep');
    const cat = getChallengesCategory()!;
    const tp = getTranscendPoints();
    const autoEnabled = getAutoEnabled();
    const toggles = getAutobuyerToggles();

    // Stage tier-presence: transcendPoints.cumulative > 0 unlocks the sweep.
    tp.cumulative!.value = 1;

    // Ensure master + sweep toggles on (defaults are true; assert for clarity).
    autoEnabled.value = true;
    toggles.challengeSweep.value = true;

    expect(cat.active.value).toBeNull();

    // One tick: sweep observes active=null, finds the first unmaxed
    // challenge (challenge-1 in registration order), enters it.
    engine.loop.simulateTick(1);

    const active = cat.active.value;
    expect(active).not.toBeNull();
    expect(active!.id).toBe('challenge-1');

    engine.dispose();
  });
});
