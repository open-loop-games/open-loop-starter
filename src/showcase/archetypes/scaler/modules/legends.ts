import {
  createAchievementCategory,
  type AchievementCategory,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { LEGENDS, LEVERS, type LegendDef } from '../data';
import { CoreKey } from './core';
import { JUSTICE } from './run';

/**
 * Legends: lifetime-Justice thresholds that step the stack. Each one earned
 * multiplies every hero, and no reset takes it back.
 */

export interface LegendsApi {
  legends: AchievementCategory<LegendDef>;
}

export const LegendsKey: InjectionKey<LegendsApi> = Symbol(
  'scaler/legends',
) as InjectionKey<LegendsApi>;

let api: LegendsApi;

export function getLegends(): LegendsApi {
  return api;
}

export function createLegendsModule(): EngineModule {
  return {
    id: 'scaler/legends',
    dependencies: ['scaler/core', 'scaler/run'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const legends = createAchievementCategory<LegendDef>({
        id: 'legends',
        mapAchievement: (def) => ({
          display: {
            title: def.title,
            description: def.description,
            effectDescription: `×${LEVERS.legendMult} heroes`,
          },
          goal: { kind: 'cumulative-gte', resource: JUSTICE, value: def.lifetime },
          showPopup: false,
          onComplete: () => core.log('legend', `Legend earned: ${def.title}.`),
          grants: [{ chain: core.output, multiplier: LEVERS.legendMult, description: def.title }],
        }),
      });
      legends.register(LEGENDS);

      api = { legends };
      ctx.provide(LegendsKey, api);
    },
  };
}
