import { describe, expect, it } from 'vitest';
import { createMemoryStorage, type EngineModule } from '@open-loop/engine';
import { bootEngine } from '@/boot';

function marker(installed: string[]): EngineModule {
  return { id: 'boot-test/marker', install: () => void installed.push('marker') };
}

function boot(mods: { id: string; modules: EngineModule[] }[]) {
  return bootEngine({
    gameId: 'boot-test',
    persistenceNamespace: `boot-test-${Math.random().toString(36).slice(2)}`,
    storageAdapter: createMemoryStorage(),
    autoSaveInterval: 0,
    mods: mods.map((m) => ({ ...m, displayName: m.id })),
  });
}

describe('bootEngine', () => {
  it("selects a lone mod, so a headless start() installs the game's modules", () => {
    const installed: string[] = [];
    const engine = boot([{ id: 'game', modules: [marker(installed)] }]);
    engine.start();
    expect(engine.activeModId).toBe('game');
    expect(installed).toEqual(['marker']);
    engine.dispose();
  });

  it('leaves the choice open when several mods are registered', () => {
    const engine = boot([
      { id: 'a', modules: [] },
      { id: 'b', modules: [] },
    ]);
    expect(engine.activeModId).toBeNull();
    engine.dispose();
  });
});
