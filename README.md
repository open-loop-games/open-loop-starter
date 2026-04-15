# open-loop-starter

Quick-copy scaffold for prototyping games on [open-loop-engine](../open-loop-engine). Fork this repo, strip the demo content, start building.

## Quick start

```bash
# Fork or clone
git clone <this-repo> my-game && cd my-game

# Install (engine is a link: dep to the sibling directory)
pnpm install

# Dev server
pnpm dev
```

## What you get

- Engine boot, save/load, settings, theme wiring
- Layout shells, AppFrame, modal stack, toast system
- A demo village-gathering game across 5 mod variants
- CSS variable theming with token defaults

## How to use the engine

Read the [consumer guide](../open-loop-engine/docs/consumer-guide.md) for how to think about expressing your game — which primitives to reach for, when to drop down a layer, and when the engine should grow.

Per-symbol API reference: [open-loop-engine/docs/api/INDEX.md](../open-loop-engine/docs/api/INDEX.md)

## Demo modules

The demo game is a village gatherer split across domain modules and selectable mods. Each demonstrates specific engine systems:

| Module | Engine systems | What it shows |
|---|---|---|
| `gathering` | ActionCategory, SkillCategory, ZoneSystem, Sequencer, ActionRunner | Resource gain, skill XP, zone unlocking, queue-driven execution |
| `economy` | ProducerCategory, ScalingPurchasable, PersistentEffectSystem, ModifierChain | Auto-production, upgrade scaling, conditional modifiers, surface-wide chains |
| `progression` | AchievementCategory, BestOf | Auto-complete achievements, per-run high-water marks |

| Mod | Engine systems | What it shows |
|---|---|---|
| `loop` | Loop, RetentionPolicy, LoopLog, TemporaryEffectSystem | Mana-drain reset cycle, skill retention, per-run history, timed buffs |
| `prestige` | IndependentConversion, Reset, PersistentEffectSystem | Meta-currency conversion with automatic reset, attributed modifier bindings |
| `merchant` | Inventory | Limited-capacity item storage, buy/sell against resources |
| `challenges` | ChallengeCategory, Reset | Mutually exclusive challenges with per-completion rewards |
| `clicker` | _(none beyond base)_ | Same base modules, completely different game shape via UI slot swap |

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc -b && vite build
pnpm typecheck        # vue-tsc -b
pnpm test             # Vitest run
pnpm lint             # eslint src/
pnpm format           # prettier --write
```

## Architecture

See [CLAUDE.md](CLAUDE.md) for layering rules, code conventions, and project structure.
