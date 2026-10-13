import {
  TickDriverKey,
  persistent,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { ANCHORS, BOX_PAGES, ENDING, OPENING, RECONSTRUCT_LEADS, doorDefs } from '../data';
import { createLifecycle, type Lifecycle } from './lifecycle';

/**
 * Case module — the case file every phase writes into: the carbon log the
 * game is read through, the door ladder, and whether the case is closed. The
 * last door is the ending: the tick driver stops and stays stopped across
 * reloads, and the content is over.
 */
export interface CaseApi {
  life: Lifecycle;
  /** The carbon: oldest line first, capped. */
  lines: Persistent<string[]>;
  write(...text: string[]): void;
  /** The last account is read: nothing ticks again. */
  closed: ComputedRef<boolean>;
}

/** Lines kept; older ones scroll off. */
const LOG_LIMIT = 80;

export const CaseKey: InjectionKey<CaseApi> = Symbol('phase-shifter/case') as InjectionKey<CaseApi>;

let api: CaseApi;

export function getCase(): CaseApi {
  return api;
}

export function createCaseModule(): EngineModule {
  return {
    id: 'phase-shifter/case',
    install(ctx) {
      const lines = persistent<string[]>([...OPENING], { id: 'lines' });
      const write = (...text: string[]) => {
        lines.value = [...lines.value, ...text].slice(-LOG_LIMIT);
      };
      const life = createLifecycle(
        doorDefs({
          boxPages: BOX_PAGES,
          reconstructLeads: RECONSTRUCT_LEADS,
          eliminable: ANCHORS.suspects - 1,
        }),
      );
      const closed = life.isOpen('accuse');

      const driver = ctx.inject(TickDriverKey);
      life.onOpened((door) => {
        write(...door.log);
        if (door.id === 'accuse') {
          write(...ENDING);
          driver.stop();
        }
      });
      ctx.onLoad(() => {
        if (closed.value) driver.stop();
      });

      api = { life, lines, write, closed };
      ctx.provide(CaseKey, api);
    },
  };
}
