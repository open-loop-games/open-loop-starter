# open-loop-starter

Quick-copy scaffold for prototyping games on [open-loop-engine](../open-loop-engine). Fork this repo, `eject` down to one archetype, start building.

The repo has two halves: the **scaffold** (`src/lib`, `src/ui`, `src/composables`, `src/modules`, `src/styles` — layout shells, AppFrame, bridge composables) that every game keeps, and the **showcase** (`src/showcase/` — archetype demos + browsable gallery) that a fork sheds. The cut is one-way: the scaffold never imports the showcase (an eslint rule enforces it), so shedding the showcase can't break your game.

## Quick start

```bash
# Fork or clone
git clone <this-repo> my-game && cd my-game

# Install (engine is a link: dep to the sibling directory)
pnpm install

# Browse the archetype gallery
pnpm dev
```

## Eject to a single game

Pick the archetype closest to your game and eject everything else:

```bash
# Dry-run by default — prints the plan, touches nothing
pnpm eject producer --name "My Game"

# Perform it
pnpm eject producer --name "My Game" --execute
```

This hoists your archetype to `src/game/`, rewrites `main.ts` to boot it directly, prunes config, and deletes the whole `src/showcase/` demo surface. What's left is the scaffold + your one archetype. Run `pnpm eject` with no archetype to list the available ones.

## What you get

- Engine boot, save/load, settings, theme wiring
- Layout shells, AppFrame, modal stack, toast system
- Self-bootable archetype demos (see below) behind a one-command `eject`
- CSS variable theming with token defaults

## How to use the engine

Read the [consumer guide](../open-loop-engine/docs/consumer-guide.md) for how to think about expressing your game — which primitives to reach for, when to drop down a layer, and when the engine should grow.

Per-symbol API reference: [open-loop-engine/docs/api/INDEX.md](../open-loop-engine/docs/api/INDEX.md)

## Archetype demos

`pnpm dev` opens a gallery of self-bootable archetype demos under `src/showcase/archetypes/`. Each is a first-arc port of a validated archetype against one canonical exemplar, showing a distinct slice of engine systems and a distinct layout shell. Pick the one closest to your game and `eject` it (above).

| Archetype | Demo (exemplar) | Shell | Engine systems | What it shows |
|---|---|---|---|---|
| `producer` | Bakery | ThreePanelShell | ProducerCategory, PurchasableCategory, ModifierChain, AchievementCategory (tiered) | Classic big-number incremental: cost-scaled auto-production, stacked multipliers, achievement bonuses |
| `looper` | Classic Adventuring | ThreePanelShell | Sequencer, SkillCategory, ZoneSystem, Loop, RetentionPolicy, TimeSystem | Repetition-with-retention: a resource-gated run, skill mastery carried across resets, zone-gated action queue |
| `scaler` | Antimatter Physics | TabsBarShell | ProducerCategory, MultiplicativeModifier, CostRequirement, Reset | Layered prestige at extreme scale: nested reset layers and deep modifier chains |
| `interlocker` | Kittens | ThreePanelShell | Conversion, ModifierChain, PurchasableCategory, CategoryBase | Wide-not-deep resource management: a multi-resource graph of interlocking conversions and building synergies |
| `defender` | Bloons | SidebarMainShell | Sequencer, SpatialGrid, PurchasableCategory, Reset | Placement + wave pacing: commit static defenders on a grid before the wave resolves |
| `tug` | SciFi Armada | TugFrameLayout | Sequencer, Loop, PurchasableCategory, ChallengeCategory, Reset | Adversarial lane push: auto-send economy versus a live zero-sum opponent |
| `ambient` | Cozy Farm | SingleColumnShell | ProducerCategory, Loop, PurchasableCategory, AchievementCategory, Reset | Companion-software idle: an auto-production spine tuned for low-pressure ambient progression |

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
