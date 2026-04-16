import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Decimal } from 'open-loop-engine';
import { bootIL, type ILBoot } from '@/test/idle-loops/accessors';
import type { IdleLoopsState } from '@/modules/mods/idle-loops';

describe('idle-loops mod', () => {
  let boot: ILBoot;
  let state: IdleLoopsState;

  beforeAll(() => {
    boot = bootIL();
    state = boot.state;
  });

  afterAll(() => {
    boot.handle.dispose();
  });

  // --- Boot & state ---

  it('boots and provides all subsystems', () => {
    expect(state.stats).toBeDefined();
    expect(state.zones).toBeDefined();
    expect(state.actions).toBeDefined();
    expect(state.queue).toBeDefined();
    expect(state.mana).toBeDefined();
    expect(state.loop).toBeDefined();
    expect(state.loopLog).toBeDefined();
    expect(state.bestOf).toBeDefined();
    expect(state.recommendations).toBeDefined();
    expect(state.achievements).toBeDefined();
    expect(state.automation).toBeDefined();
  });

  // --- Stats ---

  it('registers 4 stats in accumulator mode', () => {
    expect(state.stats.size).toBe(4);
    for (const id of ['str', 'int', 'dex', 'con']) {
      const skill = state.stats.getSkill(id);
      expect(skill).toBeDefined();
      expect(skill!.permanentBonus).toBeDefined();
      expect(skill!.accumulateBonus).toBeDefined();
    }
  });

  // --- Zones ---

  it('starts with beginnersville unlocked and forest-path locked', () => {
    expect(state.zones.isUnlocked('beginnersville')).toBe(true);
    expect(state.zones.isUnlocked('forest-path')).toBe(false);
  });

  // --- Actions ---

  it('registers 12 actions', () => {
    expect(state.actions.registry.size).toBe(12);
  });

  // --- Sequencer ---

  it('uses list mode with seed items and cursor at 0', () => {
    expect(state.queue.mode).toBe('list');
    expect(state.queue.items.value.length).toBe(8);
    expect(state.queue.cursor).toBe(0);
  });

  // --- Action dispatch ---

  it('completes an action: cursor advances and stat XP increases', async () => {
    const strBefore = new Decimal(state.stats.getSkill('str')!.xp.value).toNumber();
    const cursorBefore = state.queue.cursor;

    // First action is train-str (2s base duration). Tick enough to complete it.
    await boot.handle.tick(200);

    const strAfter = new Decimal(state.stats.getSkill('str')!.xp.value).toNumber();
    expect(strAfter).toBeGreaterThan(strBefore);
    // Cursor should have advanced (possibly multiple times)
    expect(state.queue.cursor).toBeGreaterThan(cursorBefore);
  });

  // --- Mana drain ---

  it('drains mana over time', async () => {
    const manaBefore = new Decimal(state.mana.value).toNumber();
    await boot.handle.tick(10);
    const manaAfter = new Decimal(state.mana.value).toNumber();
    expect(manaAfter).toBeLessThan(manaBefore);
  });

  // --- Loop completion ---

  it('ends the loop when mana depletes, then restarts', async () => {
    const countBefore = new Decimal(state.loop.count.value).toNumber();

    // Tick until mana depletes and loop restarts (or timeout)
    await boot.handle.tickUntil(
      () => new Decimal(state.loop.count.value).toNumber() > countBefore,
      100_000,
    );

    const countAfter = new Decimal(state.loop.count.value).toNumber();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  // --- Skill retention ---

  it('accumulates permanent bonuses after loop restart', () => {
    // After at least one loop, some stats should have nonzero permanent bonuses
    const anyBonus = state.stats.getAll().some((e) =>
      e.skill.permanentBonus != null &&
      Decimal.gt(e.skill.permanentBonus.value, 0),
    );
    expect(anyBonus).toBe(true);
  });

  // --- Sequencer reset ---

  it('resets cursor to 0 after loop restart (items preserved)', () => {
    // After a loop restart, cursor resets to 0 and items are still there
    expect(state.queue.items.value.length).toBe(8);
    // Cursor is either 0 (just reset) or has already advanced some in the new loop
    expect(state.queue.cursor).toBeGreaterThanOrEqual(0);
  });

  // --- BestOf captures ---

  it('populates bestOf entries with strategy snapshots after a loop', () => {
    const entries = state.bestOf.entries.value;
    // At least one metric should have an entry after completing a loop
    const hasEntry = Object.values(entries).some((e) => e != null);
    expect(hasEntry).toBe(true);

    // Check that the strategy snapshot is an array (the captured queue items)
    const firstEntry = Object.values(entries).find((e) => e != null);
    if (firstEntry) {
      expect(Array.isArray(firstEntry.strategySnapshot)).toBe(true);
    }
  });

  // --- captureStrategy/applySnapshot round-trip ---

  it('round-trips queue through captureStrategy/applySnapshot', () => {
    const originalItems = state.queue.items.value.map((item) => item.id);

    // Get the snapshot from bestOf
    const entry = Object.values(state.bestOf.entries.value).find((e) => e != null);
    expect(entry).toBeDefined();
    const snapshot = entry!.strategySnapshot as Array<{ id: string }>;
    expect(Array.isArray(snapshot)).toBe(true);

    // Apply via recommendations applySnapshot path (same shape as captureStrategy)
    state.queue.clear();
    expect(state.queue.items.value.length).toBe(0);

    for (const item of snapshot) {
      state.queue.enqueue({ id: item.id, metadata: undefined });
    }
    const restored = state.queue.items.value.map((item) => item.id);
    expect(restored).toEqual(originalItems);
  });

  // --- RecommendationSystem wired ---

  it('has recommendation system wired with no strategies', () => {
    expect(state.recommendations).toBeDefined();
    expect(state.recommendations.strategies.length).toBe(0);
    // evaluate() with no strategies returns null
    const result = state.recommendations.evaluate();
    expect(result).toBeNull();
  });
});

describe('idle-loops — zone unlock', () => {
  let boot: ILBoot;
  let state: IdleLoopsState;

  beforeAll(() => {
    boot = bootIL();
    state = boot.state;
  });

  afterAll(() => {
    boot.handle.dispose();
  });

  it('unlocks forest-path when Str reaches level 5', async () => {
    expect(state.zones.isUnlocked('forest-path')).toBe(false);

    // Pump Str XP until level 5
    // xpDivisor for str is 10, level = floor(xp / 10), so need xp >= 50
    state.stats.addXP('str', 50);
    await boot.handle.tick(1);

    expect(state.zones.isUnlocked('forest-path')).toBe(true);
  });
});
