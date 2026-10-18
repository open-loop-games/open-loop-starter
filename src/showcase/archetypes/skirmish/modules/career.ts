/**
 * The career: which contract is next and how each one went. Outside the match
 * reset, so it survives every match.
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

export interface CareerApi {
  /** Index of the contract the next match is fought on. */
  readonly contractIndex: Persistent<number>;
  readonly contract: ComputedRef<ContractDef>;
  /** Contracts won, counted once each. */
  readonly wins: ComputedRef<number>;
  /** Best winning time per contract id, in match seconds. */
  readonly best: Persistent<Record<string, number>>;
  readonly finished: ComputedRef<boolean>;
  /** Record a win on the current contract; the ladder moves on at `advance`. */
  recordWin(seconds: number): void;
  /** Move to the next contract, once the player leaves the verdict screen. */
  advance(): void;
  /** Pick a contract already reached, to replay it. */
  choose(index: number): void;
}

export const CareerKey: InjectionKey<CareerApi> = Symbol('skirmish/career');

const careerApi = createModuleApi(CareerKey);
/** The career API the newest live engine published. */
export const getCareer = careerApi.get;

export const careerModule: EngineModule = {
  id: 'skirmish/career',
  install(ctx) {
    const contractIndex = persistent(0, { id: 'contract' });
    const best = persistent<Record<string, number>>({}, { id: 'best' });
    const reached = persistent(0, { id: 'reached' });
    const wins = computed(() => Object.keys(best.value).length);
    const api: CareerApi = {
      contractIndex,
      contract: computed(() => CONTRACTS[contractIndex.value]),
      wins,
      best,
      finished: computed(() => wins.value >= CONTRACTS.length),
      recordWin(seconds) {
        const id = CONTRACTS[contractIndex.value].id;
        const prev = best.value[id];
        best.value = {
          ...best.value,
          [id]: prev === undefined ? seconds : Math.min(prev, seconds),
        };
        reached.value = Math.max(
          reached.value,
          Math.min(contractIndex.value + 1, CONTRACTS.length - 1),
        );
      },
      advance() {
        if (contractIndex.value < CONTRACTS.length - 1) contractIndex.value += 1;
      },
      choose(index) {
        if (index >= 0 && index <= reached.value) contractIndex.value = index;
      },
    };
    careerApi.publish(ctx, api);
  },
};
