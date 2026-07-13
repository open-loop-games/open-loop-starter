import { computed, type ComputedRef } from 'vue';
import { getAutomation, type AutomationApi } from '../../modules';
import { BUILDINGS, JOBS, SCIENCES, CRAFTS } from '../../data';
import type { BuildingId, CraftId, JobId, ScienceId } from '../../data/types';

/**
 * useAutomationPanel — bridges the automation module's `{enabled,max,trigger}`
 * profile + tier state into per-domain settings rows for the Automation tab.
 * Each field is a read computed + a setter onto the module's immutable setters,
 * so an edit reassigns the persisted profile and re-renders. (Read + setter,
 * not a writable computed, so the row component drives edits through a method
 * rather than mutating a prop.) Sections are tier-gated (build/assign/research/
 * craft) so controls appear as the player unlocks them.
 */

export interface AutomationItemRow {
  id: string;
  name: string;
  enabled: ComputedRef<boolean>;
  setEnabled(v: boolean): void;
  /** Present only for domains that carry a trigger (buildings, crafts). */
  trigger?: ComputedRef<number>;
  setTrigger?(v: number): void;
  /** Present only for domains that carry a max (buildings, jobs, crafts). */
  max?: ComputedRef<number>;
  setMax?(v: number): void;
}

export interface AutomationSection {
  key: 'buildings' | 'jobs' | 'sciences' | 'crafts';
  title: string;
  /** Tier that gates this section — `hasReached(tier)` reveals its controls. */
  tier: string;
  unlocked: ComputedRef<boolean>;
  rows: AutomationItemRow[];
}

export interface UseAutomationPanel {
  automation: AutomationApi;
  sections: AutomationSection[];
}

const NO_MAX_DISPLAY = 9999;

export function useAutomationPanel(): UseAutomationPanel {
  const automation = getAutomation();
  const profile = () => automation.profile.value;

  const buildingRows: AutomationItemRow[] = BUILDINGS.map((def) => {
    const id = def.id as BuildingId;
    return {
      id: def.id,
      name: def.name,
      enabled: computed(() => profile().buildings[id].enabled),
      setEnabled: (v) => automation.setBuildingField(id, 'enabled', v),
      trigger: computed(() => profile().buildings[id].trigger),
      setTrigger: (v) => automation.setBuildingField(id, 'trigger', clamp01(v)),
      max: computed(() => profile().buildings[id].max),
      setMax: (v) => automation.setBuildingField(id, 'max', clampMax(v)),
    };
  });

  const jobRows: AutomationItemRow[] = JOBS.map((def) => {
    const id = def.id as JobId;
    return {
      id: def.id,
      name: def.name,
      enabled: computed(() => profile().jobs[id].enabled),
      setEnabled: (v) => automation.setJobField(id, 'enabled', v),
      max: computed(() => profile().jobs[id].max),
      setMax: (v) => automation.setJobField(id, 'max', clampMax(v)),
    };
  });

  // Sciences carry only an enabled toggle — their trigger is inert in arc-1
  // (science is uncapped, so there's no storage fraction to gate on), so the
  // control is omitted rather than shown as a dead slider.
  const scienceRows: AutomationItemRow[] = SCIENCES.map((def) => {
    const id = def.id as ScienceId;
    return {
      id: def.id,
      name: def.name,
      enabled: computed(() => profile().sciences[id].enabled),
      setEnabled: (v) => automation.setScienceField(id, 'enabled', v),
    };
  });

  const craftRows: AutomationItemRow[] = CRAFTS.map((def) => {
    const id = def.id as CraftId;
    return {
      id: def.id,
      name: def.name,
      enabled: computed(() => profile().crafts[id].enabled),
      setEnabled: (v) => automation.setCraftField(id, 'enabled', v),
      trigger: computed(() => profile().crafts[id].trigger),
      setTrigger: (v) => automation.setCraftField(id, 'trigger', clamp01(v)),
      max: computed(() => profile().crafts[id].max),
      setMax: (v) => automation.setCraftField(id, 'max', clampMax(v)),
    };
  });

  const sections: AutomationSection[] = [
    {
      key: 'buildings',
      title: 'Buildings',
      tier: 'build',
      unlocked: computed(() => automation.hasReached('build')),
      rows: buildingRows,
    },
    {
      key: 'jobs',
      title: 'Jobs',
      tier: 'assign',
      unlocked: computed(() => automation.hasReached('assign')),
      rows: jobRows,
    },
    {
      key: 'sciences',
      title: 'Research',
      tier: 'research',
      unlocked: computed(() => automation.hasReached('research')),
      rows: scienceRows,
    },
    {
      key: 'crafts',
      title: 'Crafts',
      tier: 'craft',
      unlocked: computed(() => automation.hasReached('craft')),
      rows: craftRows,
    },
  ];

  return { automation, sections };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
function clampMax(v: number): number {
  return Math.max(0, Math.min(NO_MAX_DISPLAY, Math.round(v) || 0));
}
