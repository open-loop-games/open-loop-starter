import type { Action, Skill, Loop, ZoneSystem } from 'open-loop-engine';
import type { Resource } from 'open-loop-engine';
import type { DecimalSource } from 'open-loop-engine';

export interface DemoState {
  mana: Resource<DecimalSource>;
  maxMana: number;
  woodcutting: Skill;
  zones: ZoneSystem;
  actions: Map<string, Action>;
  loop: Loop;
}
