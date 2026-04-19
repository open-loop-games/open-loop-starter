import { describe, expect, it } from 'vitest';
import {
  createAdditiveModifier,
  createModifierChain,
  Decimal,
  withPersistentContext,
  type ModifierChain,
} from 'open-loop-engine';
import { FACTION_IDS, type CellState, type FactionId } from '../creep-vs-creep/content';
import { createCombatSystem } from '../creep-vs-creep/combat';
import { createCreepGrid, type CreepGrid } from '../creep-vs-creep/grid';
import { loadCreepVsCreepVars } from '../creep-vs-creep/vars';

const vars = loadCreepVsCreepVars();

function buildGrid(): CreepGrid {
  return withPersistentContext('test-creep-warfare-combat', () => createCreepGrid(vars));
}

function buildChains(): {
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
} {
  return withPersistentContext('test-creep-warfare-combat-chains', () => {
    const attack = {} as Record<FactionId, ModifierChain>;
    const defense = {} as Record<FactionId, ModifierChain>;
    for (const f of FACTION_IDS) {
      attack[f] = createModifierChain(`test/${f}/attack`);
      defense[f] = createModifierChain(`test/${f}/defense`);
    }
    return { attack, defense };
  });
}

function buildCombat(cg: CreepGrid, chains: ReturnType<typeof buildChains>) {
  return createCombatSystem({
    grid: cg.grid,
    chains,
    baseHp: vars.balance.baseHp,
    baseAttack: vars.balance.baseAttack,
    baseDefense: vars.balance.baseDefense,
  });
}

function seedPair(
  cg: CreepGrid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  aOwner: FactionId,
  bOwner: FactionId,
  hp: string = vars.balance.baseHp.toString(),
): void {
  const a: CellState = { ...cg.grid.at(ax, ay), owner: aOwner, hp };
  const b: CellState = { ...cg.grid.at(bx, by), owner: bOwner, hp };
  cg.grid.set(ax, ay, a);
  cg.grid.set(bx, by, b);
}

describe('creep-vs-creep combat', () => {
  it('frontier defender loses HP per tick at the expected rate', () => {
    // Baseline damage with no chain bindings: baseAttack(10) × 1 neighbour
    //  − baseDefense(5) = 5/tick. One edge only; no asymmetry.
    const cg = buildGrid();
    const combat = buildCombat(cg, buildChains());
    seedPair(cg, 10, 10, 11, 10, 'red', 'blue');

    combat.tickOnce();
    expect(new Decimal(cg.grid.at(10, 10).hp).toNumber()).toBe(95);
    expect(new Decimal(cg.grid.at(11, 10).hp).toNumber()).toBe(95);

    for (let t = 0; t < 4; t++) combat.tickOnce();
    expect(new Decimal(cg.grid.at(10, 10).hp).toNumber()).toBe(75);
    expect(new Decimal(cg.grid.at(11, 10).hp).toNumber()).toBe(75);
  });

  it('flips a cell to the killing attacker and resets HP to baseHp', () => {
    // Red buffed enough to one-shot through base defense. Blue is unbuffed,
    // so red's cell survives the first tick and claims blue on the second.
    const cg = buildGrid();
    const chains = buildChains();
    chains.attack.red.bind({
      modifier: () =>
        createAdditiveModifier({
          addend: 200,
          description: 'test:red one-shot',
        }),
    });
    const combat = buildCombat(cg, chains);
    seedPair(cg, 10, 10, 11, 10, 'red', 'blue');

    combat.tickOnce();
    // Blue dies this tick (damage 205 > HP 100), flips to red at baseHp.
    // Red also takes a tick of damage from blue before the frontier scan
    // sees the flip, so red's HP drops normally this tick.
    expect(cg.grid.at(11, 10).owner).toBe('red');
    expect(new Decimal(cg.grid.at(11, 10).hp).toString()).toBe(
      new Decimal(vars.balance.baseHp).toString(),
    );
    expect(combat.totalFlipped.red).toBe(1);
  });

  it('chain.bind on attackChain measurably accelerates flip cadence', () => {
    const baseline = buildGrid();
    const baselineChains = buildChains();
    const baselineCombat = buildCombat(baseline, baselineChains);
    seedPair(baseline, 10, 10, 11, 10, 'red', 'blue');

    const buffed = buildGrid();
    const buffedChains = buildChains();
    buffedChains.attack.red.bind({
      modifier: () =>
        createAdditiveModifier({ addend: 45, description: 'test:red buff' }),
    });
    const buffedCombat = buildCombat(buffed, buffedChains);
    seedPair(buffed, 10, 10, 11, 10, 'red', 'blue');

    // Baseline: 5 dmg/tick against blue → blue survives for 20 ticks.
    // Buffed: 50 dmg/tick against blue → blue flips within 2 ticks.
    for (let t = 0; t < 2; t++) {
      baselineCombat.tickOnce();
      buffedCombat.tickOnce();
    }
    expect(baseline.grid.at(11, 10).owner).toBe('blue');
    expect(buffed.grid.at(11, 10).owner).toBe('red');
  });

  it('saturates at zero damage when defense >= attack', () => {
    const cg = buildGrid();
    const chains = buildChains();
    chains.defense.blue.bind({
      modifier: () =>
        createAdditiveModifier({ addend: 100, description: 'test:blue wall' }),
    });
    const combat = buildCombat(cg, chains);
    seedPair(cg, 10, 10, 11, 10, 'red', 'blue');

    for (let t = 0; t < 5; t++) combat.tickOnce();
    expect(new Decimal(cg.grid.at(11, 10).hp).toNumber()).toBe(
      new Decimal(vars.balance.baseHp).toNumber(),
    );
    expect(cg.grid.at(11, 10).owner).toBe('blue');
  });

  it('round-trips Decimal HP through commit/hydrate', () => {
    // 1.5e100 far exceeds JS number precision; if the snapshot path coerced
    // to POJO it would come back as a broken Decimal.
    const cg = buildGrid();
    const bigHp = '1.5e100';
    const cell: CellState = { ...cg.grid.at(10, 10), owner: 'red', hp: bigHp };
    cg.grid.set(10, 10, cell);

    cg.commit();
    // Mutate the live grid to prove hydrate actually replays the snapshot.
    cg.grid.set(10, 10, { ...cg.grid.at(10, 10), hp: 0 });
    cg.hydrate();

    const restored = cg.grid.at(10, 10);
    expect(new Decimal(restored.hp).toString()).toBe(new Decimal(bigHp).toString());
    expect(restored.owner).toBe('red');
  });
});
