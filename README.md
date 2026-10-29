# open-loop-starter

Batteries-included clone target for building games on [open-loop-engine](https://github.com/open-loop-games/open-loop-engine), and the storybook for those batteries. Clone this repo, `eject` down to one archetype, start building.

Engine and starter are the two API surfaces — there's no library to depend on and no version to pin. The batteries reach you by being copied, so once you clone, they're yours: rename them, restructure them, delete them.

The repo has two halves:

- **The base — the batteries** (`src/lib`, `src/ui`, `src/composables`, `src/modules`, `src/styles`): layout shells, AppFrame, modal stack, widgets, compositions, bridge composables, token defaults. Every game keeps these.
- **The stories — the archetypes** (`src/showcase/`): worked examples composing the batteries into game shapes, plus a browsable gallery. A fork sheds all but one.

**The stories exist to demonstrate the base.** Read an archetype to learn how the pieces go together, not just to see a finished game. The cut between the halves is one-way — the base never imports the showcase (an oxlint rule enforces it) — so shedding it can't break your game.

## Quick start

```bash
# Fork or clone
git clone <this-repo> my-game && cd my-game

# Install (the engine comes from npm as @open-loop/engine)
pnpm install

# Browse the archetype gallery
pnpm dev
```

## Eject to a single game

Pick the archetype closest to your game and eject everything else:

```bash
# Dry-run by default — prints the plan, touches nothing
pnpm eject cycler --name "My Game"

# Perform it
pnpm eject cycler --name "My Game" --execute
```

This hoists your archetype to `src/game/`, rewrites `main.ts` to boot it directly, prunes config, and deletes the whole `src/showcase/` demo surface. What's left is the scaffold + your one archetype. Run `pnpm eject` with no archetype to list the available ones.

## What you get

- Engine boot, save/load, settings, theme wiring
- Layout shells, AppFrame, modal stack, toast system
- Self-bootable archetype demos (see below) behind a one-command `eject`
- CSS variable theming with token defaults

## How to use the engine

Read the [consumer guide](https://github.com/open-loop-games/open-loop-engine/blob/main/docs/consumer-guide.md) for how to think about expressing your game — which primitives to reach for, when to drop down an abstraction level, and when the engine should grow.

Per-symbol API reference: [docs/api/INDEX.md](https://github.com/open-loop-games/open-loop-engine/blob/main/docs/api/INDEX.md)

## Archetype demos

`pnpm dev` opens a gallery of self-bootable archetype demos under `src/showcase/archetypes/`. Each is a research composition — its identity line — built on a rate-function balance spine, showing a distinct slice of engine systems in the layout its game shape wants. Each is in one or more genres, whose documents in the studio's research library list the games in them; one, Skirmish, is a design claim said as such. Exemplar games validate that a research composition ships in the wild; they are cited as a set and are not clone targets. Pick the one closest to your game and `eject` it (above).

| Archetype | Demo | Layout | Engine systems | What it shows |
|---|---|---|---|---|
| `cycler` | Skerry Light | ColumnShell · left | Cycle, TickDriver phases, Inventory, SpatialGrid, Loadout, PurchasableCategory | Build by day against the forecast quarter, its spray and the quarter it backs to, weather the night, and spend the logbook toward the Flannans' final gale |
| `producer` | Probe Swarm | ColumnShell · left + right | ProducerCategory, AchievementCategory, AutomationTiers, processOfflineTime | A geometric cost ladder under a compounding modifier stack, with offline catch-up and a return report |
| `tug` | Hold the Causeway | ColumnShell · topBar | PurchasableCategory, Skill, Reset, ModifierChain, TuningRegistry | Adversarial lane push: waves released on alternating horns meet at a line that sways about the middle, cover stiffens each side near home, engines thrown from behind a held line breach the gate, and a Chronicle carries the career across a march of fields |
| `survivor` | One More Take | StageShell · floats | Skill, PurchasableCategory, Reset, ModifierChain, SpatialGrid, TuningRegistry | Automatic fire with positioning as the only input: rigs fire themselves, rewrites draft the loadout, each take ends on a lead to fell, ratings stage harsher takes, and each star improvises as an automated player |
| `skirmish` | Chrome & Cantrip | ColumnShell · topBar + left + right · fixed | ProducerCategory, ResourceBag, PurchasableCategory, Reset, AutomationTiers, TuningRegistry | Real-time strategy: hustlers and ley taps feed training floors, squads take three districts on the player's orders, units meet through a pairing table, and an assault from a held district burns the rival safehouse |
| `_blank` | — | ColumnShell | — | Neutral skeleton for a novel research composition (`pnpm eject --clean`) |

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc -b && vite build
pnpm typecheck        # vue-tsc -b
pnpm test             # Vitest run
pnpm lint             # oxlint src/
pnpm format           # oxfmt src
```

## Architecture

See [AGENTS.md](AGENTS.md) for layering rules, code conventions, and project structure.
