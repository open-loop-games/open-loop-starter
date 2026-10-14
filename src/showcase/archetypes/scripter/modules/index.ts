import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createLineageModule } from './lineage';
import { createDojoModule } from './dojo';
import { createGateModule } from './gate';
import { createKataModule } from './kata';
import { createGraduationModule } from './graduation';

export { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';
export {
  LineageKey,
  getLineage,
  type LineageApi,
  type JournalLine,
  type JournalTone,
} from './lineage';
export { DojoKey, getDojo, type DojoApi } from './dojo';
export { GateKey, getGate, type GateApi, type Visitor } from './gate';
export {
  KataKey,
  getKata,
  type KataApi,
  type KataItem,
  type RackSlot,
  type RowMark,
  type RowTally,
} from './kata';
export { GraduationKey, getGraduation, type GraduationApi } from './graduation';
export * from './kata-lang';
export * from './bout';

/**
 * The scripter modules in dependency order: the registry; what survives graduation; the
 * dojo graduation resets; the gate; the scroll and its student; graduation itself.
 */
export function createScripterModules(): EngineModule[] {
  return [
    createTuningModule(),
    createLineageModule(),
    createDojoModule(),
    createGateModule(),
    createKataModule(),
    createGraduationModule(),
  ];
}
