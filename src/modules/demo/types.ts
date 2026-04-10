import type {
  Action,
  Skill,
  Loop,
  ZoneSystem,
  Resource,
  Decimal,
  DecimalSource,
} from 'open-loop-engine';

export interface DemoState {
  mana: Resource<DecimalSource>;
  maxMana: Decimal;
  woodcutting: Skill;
  zones: ZoneSystem;
  actions: Map<string, Action>;
  loop: Loop;
}
