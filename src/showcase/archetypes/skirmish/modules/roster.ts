/**
 * The roster: the rival crew the next match is fought against. Any contract may
 * be picked; nothing a match does carries to the next.
 */
import {
  computed,
  persistent,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { CONTRACTS, type ContractDef } from '../data/contracts';

export interface RosterApi {
  /** Index of the contract the next match is fought on. */
  readonly contractIndex: Persistent<number>;
  readonly contract: ComputedRef<ContractDef>;
  /** Pick the contract for the next match. */
  choose(index: number): void;
}

export const RosterKey: InjectionKey<RosterApi> = Symbol('skirmish/roster');

const rosterApi = createModuleApi(RosterKey);
/** The roster API the newest live engine published. */
export const getRoster = rosterApi.get;

export const rosterModule: EngineModule = {
  id: 'skirmish/roster',
  install(ctx) {
    const contractIndex = persistent(0, { id: 'contract' });
    rosterApi.publish(ctx, {
      contractIndex,
      contract: computed(() => CONTRACTS[contractIndex.value]!),
      choose(index) {
        if (index >= 0 && index < CONTRACTS.length) contractIndex.value = index;
      },
    });
  },
};
