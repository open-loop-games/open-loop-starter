import type { EngineModule, ModDef } from 'open-loop-engine';
import { settingsModule } from './settings';
import { uiRegistryModule } from './ui-registry';
import { coreModule } from './core';
import { loopModule } from './mods/loop';
import { prestigeModule } from './mods/prestige';
import { merchantModule } from './mods/merchant';
import { clickerModule } from './mods/clicker';
import { equipmentModule } from './mods/equipment';

/** Always-on modules installed before any mod selection. */
export const baseModules: EngineModule[] = [
  settingsModule,
  uiRegistryModule,
  coreModule,
];

/** Selectable game variants. Each `module` list is layered over `baseModules`. */
export const modDefs: ModDef[] = [
  {
    id: 'vanilla',
    name: 'Vanilla',
    description:
      'The baseline village gatherer: 3 zones, 6 actions, producers, upgrades, achievements. Uses a mana-drained loop with skill retention.',
    recommended: true,
    module: [loopModule],
  },
  {
    id: 'prestige',
    name: 'Prestige Run',
    description:
      'Vanilla plus a Renown meta-currency. Convert gold → renown to reset your run; each renown adds +10% to every producer.',
    module: [loopModule, prestigeModule],
  },
  {
    id: 'equipment',
    name: 'Equipment',
    description:
      'Vanilla plus auto-granted equipment that conditionally boosts production. Reference example for the surface-wide chain + persistent-effect pattern.',
    module: [loopModule, equipmentModule],
  },
  {
    id: 'merchant',
    name: "Merchant's Ledger",
    description:
      'Vanilla plus a 20-slot trinket inventory and buy/sell trading. The game screen is reskinned as a shopkeeper ledger.',
    module: [loopModule, merchantModule],
  },
  {
    id: 'clicker',
    name: 'Clicker',
    description:
      'A different game from the same core: no loop, no mana. Producers and upgrades only, reframed as a big-button clicker.',
    module: [clickerModule],
  },
];
