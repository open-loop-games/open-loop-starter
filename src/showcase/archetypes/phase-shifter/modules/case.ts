import {
  TickDriverKey,
  computed,
  persistent,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
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
  /** The carbon: oldest line first, capped. */
  lines: Persistent<string[]>;
  write(...text: string[]): void;
  /** The last page is read: nothing ticks again. */
  closed: ComputedRef<boolean>;
  /** Read the last page: write the ending and stop the clock for good. */
  close(): void;
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

      api = { life, lines, write, closed, close };
      ctx.provide(CaseKey, api);
    },
  };
}
