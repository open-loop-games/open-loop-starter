import {
  TickDriverKey,
  computed,
  persistent,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { createEventLog, type EventLog } from '@/modules/event-log';
import { createModuleApi } from '@/modules/module-api';
import { BOX_PAGES, ENDING, OPENING, RECONSTRUCT_LEADS, SUSPECTS, doorDefs } from '../data';
import { createLifecycle, type Lifecycle } from './lifecycle';

/**
 * Case module — the case file every phase writes into: the carbon log the
 * game is read through, the door ladder, and whether the case is closed. The
 * case closes when the last page is read: the tick driver stops and stays
 * stopped across reloads, and the content is over.
 */
export interface CaseApi {
  life: Lifecycle;
  /** The carbon, saved with the game. */
  log: EventLog;
  /** Type lines onto the carbon, in order. */
  write(...text: string[]): void;
  /** The last page is read: nothing ticks again. */
  closed: ComputedRef<boolean>;
  /** Read the last page: write the ending and stop the clock for good. */
  close(): void;
}

/** Lines kept; older ones scroll off. */
const LOG_LIMIT = 80;

export const CaseKey: InjectionKey<CaseApi> = Symbol('phase-shifter/case') as InjectionKey<CaseApi>;

const caseApi = createModuleApi(CaseKey);

/** The case file: the carbon, the door ladder, and whether the case is closed. Read it after the engine starts. */
export const getCase = caseApi.get;

export function createCaseModule(): EngineModule {
  return {
    id: 'phase-shifter/case',
    install(ctx) {
      const log = createEventLog(ctx, {
        cap: LOG_LIMIT,
        persistId: 'log',
        initial: OPENING,
      });
      const write = (...text: string[]) => {
        for (const line of text) log.post(line);
      };
      const life = createLifecycle(
        doorDefs({
          boxPages: BOX_PAGES,
          reconstructLeads: RECONSTRUCT_LEADS,
          alibis: SUSPECTS.length,
        }),
      );
      const lastPageRead = persistent(false, { id: 'lastPageRead' });
      const closed = computed(() => lastPageRead.value);

      const driver = ctx.inject(TickDriverKey);
      life.onOpened((door) => write(...door.log));
      ctx.onLoad(() => {
        if (closed.value) driver.stop();
      });
      const close = () => {
        if (lastPageRead.value) return;
        lastPageRead.value = true;
        write(...ENDING);
        driver.stop();
      };

      const api: CaseApi = { life, log, write, closed, close };
      caseApi.publish(ctx, api);
    },
  };
}
