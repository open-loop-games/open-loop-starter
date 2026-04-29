# CLAUDE.md

open-loop-starter — quick-copy scaffold for prototyping games on `open-loop-engine`. Games fork from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + open-loop-engine + break_eternity.js

## Purpose

Three jobs:

1. **Scaffold layout/theme layer (`src/lib/`)** — layout shells, AppFrame, modal stack, default CSS tokens, reset. Presentational-only; no engine imports. Not an importable cross-package library.
2. **Default theme (`src/styles/`)** — opinionated CSS-variable values and widget-level selectors layered over the token defaults. Forks override per-variable or swap wholesale.
3. **Archetype demos (`src/archetypes/<name>/`)** — each archetype is a self-bootable demo with its own `data/`, `modules/`, `composables/`, `ui/`, `sim/`, and `boot.ts`. Pre-wired engine boot, module registration, save/load, settings, notation, toasts, theme, and a working game skeleton. Fork the repo, pick one archetype, delete the other nine + the gallery, start building content in place.

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
├── main.ts              # Mounts the active archetype via its createApp() factory
├── App.vue              # Transitional shell; replaced by archetype-owned root on fork
├── types.ts             # Shared starter types
├── archetypes/          # Self-bootable archetype demos (see § Archetype convention)
│   ├── producer/
│   ├── looper/
│   ├── scaler/
│   └── …                # one directory per canonical + candidate archetype
├── lib/                 # Scaffold layout/theme layer
│   ├── shells/          # 5 layout shells validated by the 42-game spray
│   ├── frame/           # AppFrame: header + shell + modal stack + toasts + theme
│   ├── modal/           # useModalStack composable + ModalStack mount (reka-ui Dialog)
│   ├── dev/             # DevPanelOverlay — presentational fullscreen dev surface
│   ├── styles/          # tokens.css (default CSS custom properties) + reset.css
│   └── index.ts         # Barrel — import via '@/lib'
├── modules/             # Shared-base modules used by every archetype
│   ├── index.ts         # sharedBase = [settingsModule, uiRegistryModule]
│   ├── settings.ts      # Settings module (theme, notation, autosave)
│   └── ui-registry.ts   # UI slot registry (panel/screen registration)
├── composables/         # Starter-level Vue composables — bridge shared-base refs to UI
│                          useGame, useSave, useSettings, useTheme, useToasts,
│                          useSlots, useNotation, useFormatting, useAutomation,
│                          useSaveEvents, useUI
├── styles/
│   ├── base.css             # Consumer theme — fills in --color-*, --gap-*, etc.
│   └── theme-widgets.css    # Widget-specific theme (progress, tooltip, popover, panel)
└── ui/
    ├── screens/         # Cross-archetype screens (SlotScreen, GameScreen)
    ├── panels/          # Cross-archetype panels (BalanceWorkbench)
    └── components/      # Shared primitives (Tooltip, ProgressBar, BaseModal, Tabs, …)
                         # Archetype-specific SFCs live under src/archetypes/<name>/ui/
```

### Archetype convention

Each archetype under `src/archetypes/<name>/` is self-bootable and follows the same colocated shape (matches `/work/studio/incloneution`):

```
src/archetypes/<name>/
├── data/            # Pure config. Typed defs + balance constants. Skeleton/theme/
│                    # balance lens lives here as comment sections, not separate files.
├── modules/         # Engine modules; factory-constructed, closing over data.
├── composables/     # Vue composables that bridge archetype modules to UI.
├── ui/              # Archetype-colocated screens + panels + components.
├── sim/             # Beat + probe vitest suite per archetype doc § 7.
└── boot.ts          # createApp(overrides?) → { app, engine, mount }.
```

**Dependency direction (strict):** `data → modules → composables → ui`. Data never imports from modules; composables and components never contain game logic. Lens inside data files uses comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`) — not separate files, not a codegen round-trip.

**Demo content is themed, not lifted.** Structural decisions (drain semantics, cost shape, queue dispatch, slot patterns) are canonical — validated by exemplars. Content names (action ids, item names, zone names) are per-theme costume authored fresh for the demo. Direct lifts from any exemplar's content set are a bug: forks copy the demo wholesale, so lifted names propagate the exemplar's identity into every fork. Use exemplars to resolve structural questions; author new names per theme.

**Fork workflow:** clone the repo, pick one archetype, delete the others + `src/gallery/` (when it lands), keep your one archetype as the whole app.

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

## Balance methodology

Three rules for per-archetype balance work under `sim/` and `balance/`:

- **Math first, sim to verify.** Use closed-form expressions (`calculateBeatTiming`, geometric series, piecewise integrals) to predict balance targets. Sim-verify at a coarse `tickDelta` (1s–5s) — not the default 0.05s, which wastes cycles on sub-second fidelity for minute-scale events.
- **Scripts discover, Vitest locks.** Balance discovery (solver iteration, projector runs, perturbation sweeps) belongs in vite-node scripts (`pnpm balance:*`). Vitest is for regression locks: chosen invariants pinned with tolerance bounds *after* discovery converges. Don't route discovery through Vitest — its semantics fight the workflow.
- **Step solvers incrementally.** For multi-beat solvers, run beat N alone at `PASSES = 1`, then `PASSES = 3`, then add the next beat. Each rung should flush a log in under two minutes. The full run is the last step, not the first.

## `src/lib/` scope

`src/lib/` is the scaffold's layout and theme layer: layout shells, AppFrame, modal stack, token defaults, reset. It is a real layer inside starter — presentational-only, no engine imports — but it is **not** an importable cross-package library. Games consume starter by forking; there is no `open-loop-starter` package dependency and no cross-game semver contract. Forks are free to rename, restructure, or delete any of this.

Rules that apply inside `src/lib/`, and that forks should carry forward by default:

1. **Styling: CSS custom properties only.** No Tailwind, no shadcn-vue. Theme by variable override.
2. **Behavioral primitives via reka-ui.** a11y, focus trap, portal, positioning come from reka-ui. `src/lib/` layers classes and custom-property defaults on top; it never reimplements the behavior.
3. **Presentational only.** No engine imports. `src/ui/` owns engine bridging via composables.
4. **What lives here.** Shells (5 validated layout patterns), AppFrame (header + shell + modal + theme glue), `useModalStack` + `ModalStack`, `DevPanelOverlay` (fullscreen dev surface), `styles/tokens.css`, `styles/reset.css`. Widget components — PanelLayout, Tooltip, Popover, ProgressBar, and future additions — live in `src/ui/components/` alongside game components, not here. The cut line: `src/lib/` owns layout and cross-cutting surfaces (modals, theme root); concrete widgets are scaffold components forks adapt in place.

Extraction to a real shared library is deferred until multiple independent game UI passes converge on the same shape. Don't pre-extract against a single consumer.

## Dev overlay

`src/lib/dev/DevPanelOverlay.vue` is a presentational fullscreen overlay (toolbar + content slot, ESC to close). It ships unmounted — base starter does not wire a dev panel into `App.vue`. Forks opt in by mounting it themselves, gated by their own dev flag.

`src/ui/panels/BalanceWorkbench.vue` is the canonical content screen: a picker + perturbation form + delta table wired through `useBalanceWorkbench` onto `open-loop-engine/harness`. It's engine-aware and lives in the engine-bridged `src/ui/` layer.

Typical fork wiring in `App.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { DevPanelOverlay } from '@/lib';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { engine } from './main';
import { allModules } from './modules';

const showDevPanel = ref(false);
const onKey = (e: KeyboardEvent) => { if (e.key === 'F12') { e.preventDefault(); showDevPanel.value = !showDevPanel.value; } };
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <AppFrame>…</AppFrame>
  <DevPanelOverlay v-if="showDevPanel" title="Balance Workbench" @close="showDevPanel = false">
    <BalanceWorkbench :engine="engine" :modules="() => allModules" />
  </DevPanelOverlay>
</template>
```

The overlay is a top-level sibling of `AppFrame`, not pushed through `useModalStack` — it owns its own fullscreen chrome and doesn't need the modal stack's Dialog wrapping.

## Code Rules

**Naming:**
- Components: PascalCase.vue — `SidebarMainShell.vue`, `ModalStack.vue`
- Composables: `use*` — `useModalStack`, `useGame`
- CSS variables: one flat namespace. Palette (`--color-*`, `--gap-*`, `--radius-*`, `--font-*`) and scaffold knobs (`--shell-*`, `--modal-*`, `--panel-*`, `--tooltip-*`, `--popover-*`, `--progress-bar-*`) all live in `src/lib/styles/tokens.css`.

**Must:**
- All game quantities use `Decimal` from `open-loop-engine`
- Declare engine state inside `withPersistentContext(id, () => ({ ... }))` in `install(ctx)` — or use bare `persistent()` calls when the module context is already active (the engine wraps `install()` in its own `withPersistentContext`)
- Keep archetype `data/` as pure config — no engine imports, no logic beyond constant-level computation; modules read data at construction via factory closure
- Follow the `data → modules → composables → ui` direction inside each archetype; do not reverse
- Use `src/lib/` shells and frame for layout — don't hand-roll
- Theme by setting CSS variables, not by writing component-level styles
- Type all public component props and composable APIs explicitly
- Slot-based shells — never prescribe content
- Test `src/lib/` with Vitest + @vue/test-utils + jsdom
- Prefer CSS over JS for anything visual
- Use reka-ui primitives for focus/portal/a11y — do not hand-roll

**Must Not:**
- Import `break_eternity.js` directly (use engine re-exports)
- Add game-specific content to the base starter — archetype content lives under `src/archetypes/<name>/`, not in the cross-archetype `src/modules/` / `src/ui/` directories
- Extract archetype data into a parallel `vars/` layer with codegen round-trips — data is inline in `data/*.ts`; the skeleton/theme/balance lens lives as comment sections
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

- `/work/studio/open-loop-research/practical/ui-ux/layout-spray-2026-04.md` — 42-game spray that validated the 5-shell set and killed the 2×2 idea. Primary reference for shell design.
- `/work/studio/open-loop-research/practical/ui-ux/game-layout-patterns.md` — deep dives on Cookie Clicker, Progress Knight, Kittens Game.
