import type { ModDef } from 'open-loop-engine';
import { settingsModule } from './settings';
import { uiRegistryModule } from './ui-registry';
import { gatheringModule } from './gathering';
import { progressionModule } from './progression';
import { economyModule } from './economy';
import { loopModule } from './mods/loop';
import { prestigeModule } from './mods/prestige';
import { merchantModule } from './mods/merchant';
import { clickerModule } from './mods/clicker';
import { challengesModule } from './mods/challenges';
import { cookieFactoryModule } from './mods/cookie-factory';
import { ccAuthenticModule } from './mods/cc-authentic';

const sharedBase = [settingsModule, uiRegistryModule];
const villageContent = [gatheringModule, progressionModule, economyModule];

/** Selectable game variants. Each carries its full module set — not a tail. */
export const modDefs: ModDef[] = [
  {
    id: 'vanilla',
    name: 'Vanilla',
    description:
      'The baseline village gatherer: 3 zones, 6 actions, producers, upgrades, achievements. Uses a mana-drained loop with skill retention.',
    recommended: true,
    modules: [...sharedBase, ...villageContent, loopModule],
  },
  {
    id: 'prestige',
    name: 'Prestige Run',
    description:
      'Vanilla plus a Renown meta-currency. Convert gold → renown to reset your run; each renown adds +10% to every producer.',
    modules: [...sharedBase, ...villageContent, loopModule, prestigeModule],
  },
  {
    id: 'merchant',
    name: "Merchant's Ledger",
    description:
      'Vanilla plus a 20-slot trinket inventory and buy/sell trading. The game screen is reskinned as a shopkeeper ledger.',
    modules: [...sharedBase, ...villageContent, loopModule, merchantModule],
  },
  {
    id: 'challenges',
    name: 'Challenges',
    description:
      'Vanilla plus 3 challenge variants that restrict gameplay for permanent rewards. Demonstrates challenge-category + reset integration.',
    modules: [...sharedBase, ...villageContent, loopModule, challengesModule],
  },
  {
    id: 'clicker',
    name: 'Clicker',
    description:
      'A different game from the same core: no loop, no mana. Producers and upgrades only, reframed as a big-button clicker.',
    modules: [...sharedBase, ...villageContent, clickerModule],
  },
  {
    id: 'cookie-factory',
    name: 'Cookie Factory',
    description:
      'Total-conversion archetype: a self-contained idle producer. Single cookies resource, 7 producer tiers, scaling upgrades, milestone achievements. No loop, no village content.',
    modules: [...sharedBase, cookieFactoryModule],
  },
];

// Dev-only calibration fixture. The push is tree-shaken out of prod builds
// because `import.meta.env.DEV` is a Vite compile-time constant.
if (import.meta.env.DEV) {
  modDefs.push({
    id: 'cc-authentic',
    name: 'CC Authentic (dev)',
    description:
      'Calibration fixture: exact Cookie Clicker constants on top of the Cookie Factory wiring. Dev builds only.',
    modules: [...sharedBase, ccAuthenticModule],
  });
}
