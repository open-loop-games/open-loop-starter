import {
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type Reset,
  createReset,
} from 'open-loop-engine';

// === Injection keys ===

export const AntimatterResetKey: InjectionKey<Reset> = Symbol(
  'scaler/resets/antimatter',
) as InjectionKey<Reset>;

export const PrestigeResetKey: InjectionKey<Reset> = Symbol(
  'scaler/resets/prestige',
) as InjectionKey<Reset>;

export const TranscendResetKey: InjectionKey<Reset> = Symbol(
  'scaler/resets/transcend',
) as InjectionKey<Reset>;

// === Module ===
//
// Three composable resets, declared via `resetModules` using the engine's
// module-ID resolution (reset.ts:164 — `getModulePersistentRefs(id)`).
// Each module's persistent refs are unioned into the reset's resolved
// scope at construction time. This module installs after all 3 tier
// modules so every persistent ref the tiers register is already in the
// engine's per-module registry.
//
// vanilla canonical: SynergismOfficial/src/Reset.ts:400-700 — the
// canonical reset() switch cascades naturally:
//   * 'prestige' input clears antimatter (lines 407-433) + adds
//     prestigePoints (line 437) + zeroes prestigeShards (line 438)
//   * 'transcension' input does all of the above PLUS prestige scope
//     (lines 482-508) — diamond producers, prestigePoints, crystal
//     upgrades, accelerator boost cost — and grants transcendPoints
//     (line 505).
// Slim port models the same nesting via declarative `resetModules` rather
// than imperative cascade. Triggering transcendReset zeroes everything
// in the antimatter + prestige + transcend module scopes; the conversion
// in transcend.ts adds transcendPoints BEFORE the reset (per
// conversion.ts: gainResource is updated, then `reset?.reset()` fires).
//
// Per consumer-guide § Persistence: per-challenge `active` and
// `completions` refs live at `{categoryId}/{def.id}` contexts that are NOT
// part of any module's resolvedScope. Synergism resets challenge
// completions only on Reincarnate (out of slim-port scope), so the
// transcendReset correctly leaves them untouched here. Achievements live
// in their own per-def contexts and survive likewise.
export function createResetsModule(): EngineModule {
  return {
    id: 'scaler/resets',
    dependencies: ['scaler/antimatter', 'scaler/prestige', 'scaler/transcend'],
    install(ctx: EngineContext): void {
      // Antimatter-only soft reset. Synergism doesn't expose this as a
      // player action (only Prestige / Transcend / Reincarnate trigger
      // resets), but the engine surface is useful for tutorial/debug paths
      // and for sim harnesses that probe sub-prestige beats.
      const antimatterReset = createReset({
        resetModules: ['scaler/antimatter'],
      });

      const prestigeReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige'],
      });

      const transcendReset = createReset({
        resetModules: ['scaler/antimatter', 'scaler/prestige', 'scaler/transcend'],
      });

      ctx.provide(AntimatterResetKey, antimatterReset);
      ctx.provide(PrestigeResetKey, prestigeReset);
      ctx.provide(TranscendResetKey, transcendReset);
    },
  };
}
