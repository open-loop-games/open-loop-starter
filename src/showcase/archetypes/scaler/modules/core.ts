import {
  createModifierChain,
  persistent,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
} from '@open-loop/engine';
import { createEventLog, type EventLog } from '@/modules/event-log';
import { createModuleApi } from '@/modules/module-api';

/**
 * What no reset reaches: the modifier chains every layer binds into, the clocks,
 * the prestige counts and the police scanner. The masthead reads the counts as a
 * comic: the Age count names the age, the Rewrite count is the volume, the
 * Reboot count the issue.
 */

export type ScannerKind =
  | 'reboot'
  | 'rewrite'
  | 'age'
  | 'elseworld-enter'
  | 'elseworld-complete'
  | 'elseworld-abandon'
  | 'legend'
  | 'upgrade'
  | 'automation';

export interface CoreApi {
  /** Every hero's output: Legacy, Continuity, Public Trust, Hero Training, Legends. */
  output: ModifierChain;
  /** The street tiers' band, below `HIGH_TIER_FROM`: No Powers' reward. */
  street: ModifierChain;
  /** The high tiers' band: No Powers' rule. */
  high: ModifierChain;
  /** The per-unit price growth every tier shares: Villain Uprising's rule and reward. */
  priceRatio: ModifierChain;
  /** Legacy per Reboot: Press Office, Mythic Standing, Secret Identity's reward. */
  legacyGain: ModifierChain;
  /** Where the Legacy multiplier bends: Secret Identity's reward moves it. */
  knee: ModifierChain;
  /** Continuity per Rewrite: Myth, Canon. */
  continuityGain: ModifierChain;
  /** How fast the Network makes Hope: Echoes, Dark Days. */
  hopeSpeed: ModifierChain;
  /** How fast the Earths make Echoes: Myth, Lost Earth's reward. */
  echoSpeed: ModifierChain;
  /** How much Echoes count for: Lost Earth's rule silences them. */
  echoPotency: ModifierChain;
  /** Seconds of play since the save began. */
  playSeconds: Persistent<number>;
  reboots: Persistent<number>;
  rewrites: Persistent<number>;
  /** Turns of the Age. */
  ages: Persistent<number>;
  /** What happened, stamped in play-seconds. Session state, not saved. */
  scanner: EventLog<ScannerKind>;
}

export const CoreKey: InjectionKey<CoreApi> = Symbol('scaler/core') as InjectionKey<CoreApi>;

const coreApi = createModuleApi(CoreKey);
export const getCore = coreApi.get;

const SCANNER_LENGTH = 80;

export function createCoreModule(): EngineModule {
  return {
    id: 'scaler/core',
    install(ctx) {
      const playSeconds = persistent<number>(0, { id: 'play-seconds' });
      const reboots = persistent<number>(0, { id: 'reboots' });
      const rewrites = persistent<number>(0, { id: 'rewrites' });
      const ages = persistent<number>(0, { id: 'ages' });
      ctx.onTick((dt) => {
        playSeconds.value += dt;
      });

      const scanner = createEventLog<ScannerKind>(ctx, {
        cap: SCANNER_LENGTH,
        clock: () => playSeconds.value,
      });

      const api: CoreApi = {
        output: createModifierChain('output'),
        street: createModifierChain('output-street'),
        high: createModifierChain('output-high'),
        priceRatio: createModifierChain('price-ratio'),
        legacyGain: createModifierChain('legacy-gain'),
        knee: createModifierChain('legacy-knee'),
        continuityGain: createModifierChain('continuity-gain'),
        hopeSpeed: createModifierChain('hope-speed'),
        echoSpeed: createModifierChain('echo-speed'),
        echoPotency: createModifierChain('echo-potency'),
        playSeconds,
        reboots,
        rewrites,
        ages,
        scanner,
      };
      coreApi.publish(ctx, api);
    },
  };
}
