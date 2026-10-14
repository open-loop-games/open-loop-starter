import {
  createModifierChain,
  persistent,
  shallowRef,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type ShallowRef,
} from '@open-loop/engine';

/**
 * What no reset reaches: the modifier chains every layer binds into, the clocks,
 * the prestige counts and the police scanner. The masthead reads the counts as a
 * comic: the Rewrite count is the volume, the Reboot count the issue.
 */

export type ScannerKind =
  | 'reboot'
  | 'rewrite'
  | 'elseworld-enter'
  | 'elseworld-complete'
  | 'elseworld-abandon'
  | 'legend'
  | 'upgrade'
  | 'automation';

/** One line on the police scanner. */
export interface ScannerLine {
  /** Order of logging, from 1; the scanner is bounded, so read new lines by it. */
  seq: number;
  /** Seconds of play when it happened. */
  at: number;
  kind: ScannerKind;
  text: string;
}

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
  /** Seconds of play since the save began. */
  playSeconds: Persistent<number>;
  reboots: Persistent<number>;
  rewrites: Persistent<number>;
  /** The scanner's recent lines, oldest first. Session state, not saved. */
  scanner: ShallowRef<ScannerLine[]>;
  /** Put a line on the scanner. */
  log(kind: ScannerKind, text: string): void;
}

export const CoreKey: InjectionKey<CoreApi> = Symbol('scaler/core') as InjectionKey<CoreApi>;

let api: CoreApi;

export function getCore(): CoreApi {
  return api;
}

const SCANNER_LENGTH = 80;

export function createCoreModule(): EngineModule {
  return {
    id: 'scaler/core',
    install(ctx) {
      const playSeconds = persistent<number>(0, { id: 'play-seconds' });
      const reboots = persistent<number>(0, { id: 'reboots' });
      const rewrites = persistent<number>(0, { id: 'rewrites' });
      ctx.onTick((dt) => {
        playSeconds.value += dt;
      });

      let seq = 0;
      const scanner = shallowRef<ScannerLine[]>([]);
      const log = (kind: ScannerKind, text: string) => {
        scanner.value = [
          ...scanner.value.slice(-(SCANNER_LENGTH - 1)),
          { seq: ++seq, at: playSeconds.value, kind, text },
        ];
      };

      api = {
        output: createModifierChain('output'),
        street: createModifierChain('output-street'),
        high: createModifierChain('output-high'),
        priceRatio: createModifierChain('price-ratio'),
        legacyGain: createModifierChain('legacy-gain'),
        knee: createModifierChain('legacy-knee'),
        playSeconds,
        reboots,
        rewrites,
        scanner,
        log,
      };
      ctx.provide(CoreKey, api);
    },
  };
}
