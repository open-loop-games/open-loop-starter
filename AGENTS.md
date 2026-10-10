# AGENTS.md

Repo conventions — read this whether you are Claude Code, Codex, opencode
or anything else. `.claude/CLAUDE.md` imports this file rather than restating it, so this is
the one home for the content; edit here.

open-loop-starter — the engine's batteries-included clone target, and the storybook for those batteries. Games clone and eject from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + `@open-loop/engine` + break_eternity.js

## Purpose

Two halves split at `src/showcase/`: the **base** — the batteries, § Scaffold — and the **stories**, the archetype demos. Not a library; clone and eject.

The stories half documents itself at `src/showcase/AGENTS.md`, inside the strip boundary — how an archetype is built, how the two halves test each other, and the `pnpm eject` fork workflow. `pnpm eject` deletes that tree, so the file goes with the code it describes and a fork is left holding only what still applies to it.

### Scaffold — the base (`src/lib/`, `src/ui/`, `src/styles/`, composables)

Layout shells, AppFrame, modal stack, default CSS tokens, reset, and the bridge composables that connect engine state to UI. `src/lib/` is presentational-only — no engine imports — and is **not** an importable cross-package library. `src/styles/` provides opinionated CSS-variable values and widget-level selectors layered over the token defaults; forks override per-variable or swap wholesale.

Maintenance discipline: stability **and generality**. Forks copy this and don't want it shifting under them; they also shouldn't have to fight it. The bar for new scaffold code is "would every new game want this on day one, and is it general enough that a story doesn't route around it?"

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc -b && vite build
pnpm typecheck        # vue-tsc -b
pnpm preview          # Preview production build
pnpm test             # Vitest run
pnpm test:watch       # Vitest watch mode
pnpm lint             # eslint src/
pnpm format           # oxfmt src
```

## Architecture

```
src/
├── main.ts        # Gallery boot. `pnpm eject` rewrites it to a single-game mount.
├── boot.ts        # bootEngine / bootApp — the supported way to wire an engine + app. Archetype boot.ts files flow through these.
├── types.ts       # Shared starter types (the gallery contract).
├── showcase/      # ← STRIP BOUNDARY. `pnpm eject` deletes this whole tree. Archetype demos, gallery, about, sandbox. Documented at src/showcase/AGENTS.md.
├── lib/           # Scaffold layout/theme layer. Presentational — no engine imports (eslint-enforced). Import via '@/lib'.
├── ui/            # Engine-bridged UI — screens, panels, components, compositions. Archetype-specific SFCs live with their archetype, not here.
├── composables/   # Starter-level composables — bridge shared-base state to UI.
├── modules/       # The shared-base engine modules every archetype boots.
├── directives/    # Shared Vue directives.
├── balance/       # Cross-archetype balance toolkit over the engine harness. Per-archetype balance/ lives with the archetype.
├── styles/        # Scaffold theme layered over lib's token defaults.
└── test/          # Scaffold-level test primitives. Game-agnostic; survives eject.
```

Directory roles, not inventories — the directory is the list. `src/ui/components/**` is auto-registered globally (`unplugin-vue-components`), so components resolve in templates without an import.

### Layering

```
modules (engine logic) → composables (when earned) → ui (game rendering)
lib/styles → lib/shells → lib/frame → lib/modal
styles (scaffold theme) → ui + lib (via CSS custom properties)
```

- **`src/lib/`** — scaffold layout/theme layer. No engine imports. Consumed by `src/ui/` via `@/lib`.
- **`src/modules/`** own engine state via `persistent()` refs; no UI imports.
- **`src/composables/`** — UI consumes module public API, never internals. Composables earn their layer with `computed` / `watch` / lifecycle, per-component state, or cross-module synthesis. Pure re-export composables are wallpaper — UI imports from `modules/` directly.
- **`src/ui/compositions/`** — engine-state→widget wiring that recurs across archetypes. Each composition is a `.ts` **contract** (the row/item shape a game supplies) plus a `.vue` **default renderer** and a test. **The contract is the battery; the renderer is one default.** A game can adopt the contract and render it however it likes — take `ResourceReadout` and render it with your own list component. "Want the shape, not the markup" is a first-class path, not a fallback. Two extension seams, in order of reach: (1) the typed `extra?: T` payload + the `#row`/`#cell` slot — parameterize the component (`ProducerList<MyRow>`) and read your own state back typed in the slot; this is how a game holds a shape the flat contract can't (e.g. multi-resource costs) **without the core contract growing every consumer's needs**; (2) reskin from outside via the composition's costume hooks (`:deep(.producer-list__…)`), which are documented **stable API** in each composition header — renames are breaking. Survives eject. Bar: "would a new game want this on day one, and is it general enough that a story doesn't fight it?" Promotion is a deliberate pass over accumulated evidence, never hoist-on-noticing.
- **`src/styles/`** sets token defaults and widget-level selectors consumed by `src/lib/` and `src/ui/components/`.

### Key Patterns

- **Engine singleton** — created once via `bootEngine` (`src/boot.ts`), HMR-invalidated, shared via `provide('engine')`. `bootEngine` prepends `sharedBase` to every mod, so archetypes never assemble the base themselves.
- **Routing shell vs game view** — an archetype root (`*AppRoot.vue`) is routing + app chrome only and reads **no** engine module state (its setup runs pre-`start()`, on the slot screen). All module reads live in a `<XGameView>` subtree rendered under the post-start `v-else` frame. Full discipline + corollaries in `.claude/rules/app-root-discipline.md` — Claude Code loads it on the path match, no other harness loads `.claude/rules/` at all, so read it directly. `_blank/ui/GameView.vue` is the reference forks copy.
- **Slot-based shells** — `src/lib/shells/*` never prescribe content; games fill slots
- **CSS variables for theming** — the single source of styling truth. `src/lib/styles/tokens.css` declares the default token values (palette, spacing, radius, shell/modal/widget knobs); `src/styles/` provides the scaffold theme and widget-level selectors on top

## Balance methodology

Three rules for per-archetype balance work under `sim/` and `balance/`:

- **Math first, sim to verify.** Use closed-form expressions (`costCurve` and the engine's `Formula` algebra, geometric series, piecewise integrals) to predict balance targets. Sim-verify at a coarse `tickDelta` (1s–5s) — not the default 0.05s, which wastes cycles on sub-second fidelity for minute-scale events.
- **Scripts discover, Vitest locks.** Balance discovery (solver iteration, projector runs, perturbation sweeps) belongs in vite-node scripts (`pnpm exec vite-node <archetype>/balance/<probe>.ts`). Vitest is for regression locks: chosen invariants pinned with tolerance bounds *after* discovery converges. Don't route discovery through Vitest — its semantics fight the workflow.
- **Step solvers incrementally.** For multi-beat solvers, run beat N alone at `PASSES = 1`, then `PASSES = 3`, then add the next beat. Each rung should flush a log in under two minutes. The full run is the last step, not the first.

## Behavioral testing

Balance probes lock *how much* (magnitudes, with tolerance); behavioral suites spec *what a mechanic does* (counts, monotonic growth, slots freeing) by driving the real assembled engine tick-by-tick. Keep them separate — behavioral assertions stay true across retunes, so magnitude numbers don't belong in them.

- **Primitive:** `src/test/bootTestEngine.ts` — boots a fresh engine (shared base + given modules) on memory storage under a unique namespace, returning `{ engine, tick, tickUntil, dispose }`. Scaffold-level and game-agnostic; survives eject.
- **Per-game harness:** `sim/harness.ts` wraps the primitive into bare `boot()`/`tick()`/`tickUntil()` free functions that hardcode the game's module list, so tests read `boot(); doThing(); await tick(10)`. Set its `TICK_RATE` to match your economy's time unit. `_blank` ships this plus a living `sim/example.test.ts`; eject leaves both in `src/game/sim/`, so a fork is born with the pattern green.
- **Reset by fresh boot.** `beforeEach(() => boot())` — modules rebind their state on `install` and the unique namespace isolates persistent-ref contexts, so a fresh engine per test *is* the reset. No per-module reset surface to maintain.
- **Where suites live:** per-module behavioral specs beside the module (`src/game/modules/<name>.test.ts`), importing the `sim/` harness. `sim/` holds `harness.ts` and any suite that genuinely spans modules. Balance probes are vite-node scripts under `balance/` and never live in either — they print rather than assert, so a test runner has nothing to do with them.

## `src/lib/` scope

`src/lib/` is the scaffold's layout and theme layer: layout shells, AppFrame, modal stack, token defaults, reset. It is a real layer inside starter — presentational-only, no engine imports — but it is **not** an importable cross-package library. Games consume starter by forking; there is no `open-loop-starter` package dependency and no cross-game semver contract. Forks are free to rename, restructure, or delete any of this.

Rules that apply inside `src/lib/`, and that forks should carry forward by default:

1. **Styling: CSS custom properties only.** No Tailwind, no shadcn-vue. Theme by variable override.
2. **Behavioral primitives via reka-ui.** a11y, focus trap, portal, positioning come from reka-ui. `src/lib/` layers classes and custom-property defaults on top; it never reimplements the behavior.
3. **Presentational only.** No engine imports — enforced in `eslint.config.js`, not by convention. `src/ui/` owns engine bridging.
4. **What lives here.** The cut line: `src/lib/` owns layout and cross-cutting surfaces (shells, frame, modals, theme root); concrete widgets are scaffold components that live in `src/ui/components/` alongside game components, for forks to adapt in place. Decide membership by the cut line — what happens to sit here today is an outcome, not the rule.

Extraction to a real shared library is deferred until multiple independent game UI passes converge on the same shape. Don't pre-extract against a single consumer.

## Dev overlay

`src/lib/dev/DevPanelOverlay.vue` is a presentational fullscreen overlay (toolbar + content slot, ESC to close). It ships unmounted — base starter does not wire a dev panel into `App.vue`. Forks opt in by mounting it themselves, gated by their own dev flag.

`src/ui/panels/BalanceWorkbench.vue` is the canonical content screen: a picker + perturbation form + delta table wired through `useBalanceWorkbench` onto `@open-loop/engine/harness`. It's engine-aware and lives in the engine-bridged `src/ui/` layer.

Typical fork wiring in `App.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DevPanelOverlay } from '@/lib';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import { engine } from './main';
import { allModules } from './modules';

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
</script>

<template>
  <AppFrame>…</AppFrame>
  <DevDiagnostics v-if="isDev" v-model:workbench-open="showDevPanel" />
  <DevPanelOverlay v-if="isDev && showDevPanel" title="Balance Workbench" @close="showDevPanel = false">
    <BalanceWorkbench :engine="engine" :modules="() => allModules" />
  </DevPanelOverlay>
</template>
```

`DevDiagnostics` is the always-on dev dock (FPS/TPS readout, speed buttons, Workbench toggle). `DevPanelOverlay` is a top-level sibling of `AppFrame`, not pushed through `useModalStack` — it owns its own fullscreen chrome and doesn't need the modal stack's Dialog wrapping.

## Code Rules

**Naming:**
- Components: PascalCase.vue — `SidebarMainShell.vue`, `ModalStack.vue`
- Composables: `use*` — `useModalStack`, `useGame`
- CSS variables: one flat namespace. Palette (`--color-*`, `--gap-*`, `--radius-*`, `--font-*`) and scaffold knobs (`--shell-*`, `--modal-*`, `--panel-*`, `--tooltip-*`, `--popover-*`, `--progress-bar-*`) all live in `src/lib/styles/tokens.css`.

**Rules:**
- All game quantities use `Decimal` from `@open-loop/engine` (engine re-exports `break_eternity`; consumers reach for the engine import, not the upstream package).
- Declare engine state inside `withPersistentContext(id, () => ({ ... }))` in `install(ctx)` — or use bare `persistent()` calls when the module context is already active (the engine wraps `install()` in its own `withPersistentContext`).
- Archetype `data/` is pure config — typed defs and balance constants only; modules read data at construction via factory closure.
- Archetype data lives inline in `data/*.ts` with the skeleton + balance lens as comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`) — no parallel `vars/` layer, no codegen round-trips.
- Each archetype carries a `domain-map.config.mjs` + generated `domain-map.md` — a per-game map of its own domain language (vocabulary + is-a + reference graph) sourced from the `data/` types by the engine's `ol-domain-map` tool. Regenerate with `pnpm domain-map`. This is a read-only research surface: generated FROM the types, never feeding back IN — so it's drift-proof, not a codegen round-trip. Edit the config (suffixes, nouns, curated disambiguators), never the `.md`. Each committed map doubles as a forkable best-practice example.
- Game-specific content lives under `src/showcase/archetypes/<name>/`; cross-archetype `src/modules/` and `src/ui/` stay archetype-agnostic.
- Layering inside each archetype runs `data → modules → composables → ui`.
- Layout uses `src/lib/` shells and AppFrame; `src/lib/` is presentational, with engine bridging in `src/ui/`.
- Theme by setting CSS variables (no Tailwind, no shadcn-vue).
- Public component props and composable APIs are typed explicitly.
- Shells are slot-based — content fills slots, the shell doesn't prescribe.
- Every clickable element imports `Button` from `@/ui/components/Button.vue` — the shared component wraps reka-ui Primitive with `v-hold-repeat` and centralizes disabled-suppression.
- Component and composable tests use Vitest + @vue/test-utils + jsdom.
- Visual behavior runs in CSS first; JS is for state and interaction only.
- Focus, portal, and a11y come from reka-ui primitives.
- Shell additions to `src/lib/` cite the layout research they come from — the shell set is a research finding, not a preference.

## Path Aliases

```
@/* → src/*
@/lib → src/lib
```

## Peer Setup

`@open-loop/engine` is an ordinary dependency — the version range in `package.json` is the pin, and engine updates arrive through your package manager like any other. A checkout that resolves it to a local sibling instead is doing so by workspace override, which supersedes that range; check for one before reading the range as authoritative.
