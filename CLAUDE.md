# CLAUDE.md

open-loop-starter — quick-copy scaffold for prototyping games on `open-loop-engine`. Games fork from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + open-loop-engine + break_eternity.js

## Purpose

Three jobs:

1. **Scaffold layout/theme layer (`src/lib/`)** — layout shells, AppFrame, modal stack, default CSS tokens, reset. Presentational-only; no engine imports. Not an importable cross-package library.
2. **Default theme (`src/styles/`)** — opinionated CSS-variable values and widget-level selectors layered over the token defaults. Forks override per-variable or swap wholesale.
3. **Quick-copy scaffold (`src/modules/`, `src/composables/`, `src/ui/`)** — pre-wired engine boot, module registration, save/load, settings, notation, toasts, theme, slot helpers, layout wrappers, and a demo village-gathering game across 4 mod variants. Everything a new game would re-derive from scratch. Fork the repo, rename, strip the demo module, start building content.

Starter is not a library — it's a template. Downstream games consume it by *forking*, not by depending on it. The bar for code here is "would a new game want this on day one?" If yes, ship it; if no, cut it.

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc -b && vite build
pnpm typecheck        # vue-tsc -b
pnpm preview          # Preview production build
pnpm test             # Vitest run (covers src/lib/ primitives)
pnpm test:watch       # Vitest watch mode
pnpm lint             # eslint src/
pnpm format           # prettier --write
```

## Architecture

```
src/
├── main.ts           # Vue entry + engine creation + CSS import order
├── App.vue           # Root component
├── types.ts          # Shared starter types
├── lib/              # Scaffold layout/theme layer
│   ├── shells/       # 5 layout shells validated by the 42-game spray
│   ├── frame/        # AppFrame: header + shell + modal stack + toasts + theme
│   ├── modal/        # useModalStack composable + ModalStack mount (reka-ui Dialog)
│   ├── styles/       # tokens.css (default CSS custom properties) + reset.css
│   └── index.ts      # Barrel — import via '@/lib'
├── modules/
│   ├── index.ts      # allModules[] — registered with createEngine()
│   ├── core.ts       # Demo module (resources, skills, zones, actions, producers)
│   ├── settings.ts   # Settings module (theme, notation, autosave)
│   ├── ui-registry.ts # UI slot registry (panel/screen registration)
│   └── mods/         # Mod-layer extension point (idle-loops-ng pattern)
├── composables/      # Vue composables — bridge engine refs to UI
│                       useGame, useSave, useSettings, useTheme, useToasts,
│                       useSlots, useNotation, useFormatting, useAutomation,
│                       useSaveEvents, useUI
├── styles/
│   ├── base.css          # Consumer theme — fills in --color-*, --gap-*, etc.
│   └── theme-widgets.css # Widget-specific theme (progress, tooltip, popover, panel)
└── ui/
    ├── layouts/      # Layout wrappers (Vanilla/Clicker/Ledger) around lib shells
    ├── screens/      # Page-level views (GameScreen, SlotScreen)
    ├── panels/       # Mountable panels registered via ui-registry
    └── components/   # Widgets (PanelLayout, Tooltip, Popover, ProgressBar)
                      # + game-specific SFCs (SavePanel, SettingsPanel, etc.)
```

### Layering

```
modules (engine logic) → composables (Vue bridge) → ui (game rendering)
lib/styles → lib/shells → lib/frame → lib/modal
styles (scaffold theme) → ui + lib (via CSS custom properties)
```

- **`src/lib/`** — scaffold layout/theme layer. No engine imports. Consumed by `src/ui/` via `@/lib`.
- **`src/modules/`** own engine state via `persistent()` refs; no UI imports.
- **`src/composables/`** are the only `ui → modules` bridge.
- **`src/styles/`** sets token defaults and widget-level selectors consumed by `src/lib/` and `src/ui/components/`.

### Key Patterns

- **Engine singleton** — created once in `main.ts`, HMR-invalidated, shared via `provide('engine')`
- **UI slot registry** — panels and screens register themselves; composable mods can add/remove without touching the shell
- **Mod extension point** — `src/modules/mods/` mirrors the idle-loops-ng pattern for vanilla-plus-mods games
- **Slot-based shells** — `src/lib/shells/*` never prescribe content; games fill slots
- **CSS variables for theming** — the single source of styling truth. `src/lib/styles/tokens.css` declares the default token values (palette, spacing, radius, shell/modal/widget knobs); `src/styles/` provides the scaffold theme and widget-level selectors on top

## `src/lib/` scope

`src/lib/` is the scaffold's layout and theme layer: layout shells, AppFrame, modal stack, token defaults, reset. It is a real layer inside starter — presentational-only, no engine imports — but it is **not** an importable cross-package library. Games consume starter by forking; there is no `open-loop-starter` package dependency and no cross-game semver contract. Forks are free to rename, restructure, or delete any of this.

Rules that apply inside `src/lib/`, and that forks should carry forward by default:

1. **Styling: CSS custom properties only.** No Tailwind, no shadcn-vue. Theme by variable override.
2. **Behavioral primitives via reka-ui.** a11y, focus trap, portal, positioning come from reka-ui. `src/lib/` layers classes and custom-property defaults on top; it never reimplements the behavior.
3. **Presentational only.** No engine imports. `src/ui/` owns engine bridging via composables.
4. **What lives here.** Shells (5 validated layout patterns), AppFrame (header + shell + modal + theme glue), `useModalStack` + `ModalStack`, `styles/tokens.css`, `styles/reset.css`. Widget components — PanelLayout, Tooltip, Popover, ProgressBar, and future additions — live in `src/ui/components/` alongside game components, not here. The cut line: `src/lib/` owns layout and cross-cutting surfaces (modals, theme root); concrete widgets are scaffold components forks adapt in place.

Extraction to a real shared library is deferred until multiple independent game UI passes converge on the same shape. Don't pre-extract against a single consumer.

## Code Rules

**Naming:**
- Components: PascalCase.vue — `SidebarMainShell.vue`, `ModalStack.vue`
- Composables: `use*` — `useModalStack`, `useGame`
- CSS variables: one flat namespace. Palette (`--color-*`, `--gap-*`, `--radius-*`, `--font-*`) and scaffold knobs (`--shell-*`, `--modal-*`, `--panel-*`, `--tooltip-*`, `--popover-*`, `--progress-bar-*`) all live in `src/lib/styles/tokens.css`.

**Must:**
- All game quantities use `Decimal` from `open-loop-engine`
- Declare engine state inside `withPersistentContext(id, () => ({ ... }))` in `install(ctx)` — or use bare `persistent()` calls when the module context is already active (the engine wraps `install()` in its own `withPersistentContext`)
- Use `src/lib/` shells and frame for layout — don't hand-roll
- Theme by setting CSS variables, not by writing component-level styles
- Type all public component props and composable APIs explicitly
- Slot-based shells — never prescribe content
- Test `src/lib/` with Vitest + @vue/test-utils + jsdom
- Prefer CSS over JS for anything visual
- Use reka-ui primitives for focus/portal/a11y — do not hand-roll

**Must Not:**
- Import `break_eternity.js` directly (use engine re-exports)
- Add game-specific content to the base starter — it stays generic
- Bake in a particular game loop shape; the demo is illustrative, not prescriptive
- Add Tailwind or shadcn-vue
- Depend on `open-loop-engine` from `src/lib/` (keep it presentational)
- Add a 2×2 quadrant shell to `src/lib/` (zero prior art — see layout-spray research)
- Hand-roll focus traps, ARIA, or portal mounting when reka-ui provides them

## Path Aliases

```
@/* → src/*
@/lib → src/lib (the former open-loop-ui import surface)
```

## Peer Setup

`open-loop-engine` is consumed as a `link:` dep pointing at the sibling directory. Changes propagate immediately via HMR.

- `open-loop-engine` at `/work/studio/open-loop-engine`

## Research Inputs

- `/work/studio/open-loop-research/patterns/ui-ux/layout-spray-2026-04.md` — 42-game spray that validated the 5-shell set and killed the 2×2 idea. Primary reference for shell design.
- `/work/studio/open-loop-research/patterns/ui-ux/game-layout-patterns.md` — deep dives on Cookie Clicker, Progress Knight, Kittens Game.
- `/work/studio/open-loop-research/patterns/ui-ux/{interactive-elements,progress-indicators,number-formatting}.md` — widget inputs.
