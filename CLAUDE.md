# CLAUDE.md

open-loop-starter — default theme tokens, UI primitives, and quick-copy scaffold for prototyping games on `open-loop-engine`. Games fork from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + open-loop-engine + break_eternity.js

## Purpose

Three jobs:

1. **UI primitives (`src/lib/`)** — layout shells, AppFrame, modal stack, thin reka-ui wrappers, `--olui-*` token contract. Formerly shipped as the peer package `open-loop-ui`; merged into starter on 2026-04-11 because starter was the only consumer and the sibling ceremony cost more than it delivered.
2. **Default theme (`src/styles/`)** — opinionated CSS-variable values that fill in the `--olui-*` token contract with sensible defaults. Consumer games override per-variable or swap wholesale.
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
├── lib/              # UI primitives (formerly open-loop-ui)
│   ├── shells/       # 5 layout shells validated by the 42-game spray
│   ├── frame/        # AppFrame: header + shell + modal stack + toasts + theme
│   ├── modal/        # useModalStack composable + ModalStack mount (reka-ui Dialog)
│   ├── widgets/      # ProgressBar, Tooltip, Popover, PanelLayout
│   ├── styles/       # tokens.css (--olui-* contract) + reset.css
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
    └── components/   # Misc game-specific Vue SFCs
```

### Layering

```
modules (engine logic) → composables (Vue bridge) → ui (game rendering)
lib/styles → lib/shells → lib/frame → lib/modal → lib/widgets
styles (consumer theme) → ui (via --olui-* token contract)
```

- **`src/lib/`** — pure UI primitives. No engine imports. Consumed by `src/ui/` via `@/lib`.
- **`src/modules/`** own engine state via `persistent()` refs; no UI imports.
- **`src/composables/`** are the only `ui → modules` bridge.
- **`src/styles/`** sets token defaults consumed by `src/lib/` components.

### Key Patterns

- **Engine singleton** — created once in `main.ts`, HMR-invalidated, shared via `provide('engine')`
- **UI slot registry** — panels and screens register themselves; composable mods can add/remove without touching the shell
- **Mod extension point** — `src/modules/mods/` mirrors the idle-loops-ng pattern for vanilla-plus-mods games
- **Slot-based shells** — `src/lib/shells/*` never prescribe content; games fill slots
- **CSS variables for theming** — the single source of styling truth. `src/lib/styles/tokens.css` declares the `--olui-*` contract; `src/styles/` provides the default values and widget theming

## Resolved Decisions (src/lib/ scope)

These govern what earns a place in `src/lib/`. Do not re-litigate without a reason.

1. **Styling: CSS custom properties only.** No Tailwind, no shadcn-vue. Games theme by variable override. A thin utility layer is acceptable only if genuinely needed.
2. **Behavioral primitives via reka-ui.** a11y, focus trap, portal, positioning come from reka-ui. `src/lib/` layers `--olui-*`-bound classes on top but never reimplements the behavior.
3. **Engine coupling: presentational props.** No typed engine-primitive props in `src/lib/` components. `src/ui/` owns the bridging via composables.
4. **Prescriptive cut line: reka-ui gap ∩ universal-same-shape.** A primitive earns a place in `src/lib/` only when *both* hold: reka-ui doesn't cover it, AND every incremental game solves it the same way. That scopes `src/lib/` to shells, `useModalStack` semantics, the `--olui-*` token contract, and big-number display. Buttons, inputs, tooltips, popovers, and similar are thin CSS-variable bindings over reka primitives — ship only when the token contract alone is the value; otherwise game code pulls reka-ui direct. Composite game patterns (equipment pages, generator ladders, prestige trees) are explicitly out of scope for `src/lib/` and belong in the game layer (`src/ui/`) as copy-diverge scaffolds.

## Code Rules

**Naming:**
- Components: PascalCase.vue — `SidebarMainShell.vue`, `ModalStack.vue`
- Composables: `use*` — `useModalStack`, `useGame`
- CSS variables: `--olui-*` for library-owned tokens; consumer tokens (`--color-*`, `--gap-*`) pass through

**Must:**
- All game quantities use `Decimal` from `open-loop-engine`
- Declare engine state inside `beginPersistentContext` / `endPersistentContext` in `install(ctx)`
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
