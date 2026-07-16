# CLAUDE.md

open-loop-starter — the engine's batteries-included clone target, and the storybook for those batteries. Games clone and eject from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + `@open-loop/engine` + break_eternity.js

## Purpose

Two halves split at `src/showcase/` (see `/work/studio/CLAUDE.md` § Studio components): the **base** — the batteries, § Scaffold — and the **stories** — the archetypes, § Archetype demos. Not a library; clone and eject.

**The stories demonstrate the base.** The strip boundary is a one-way *import* cut, not a separation of concerns. A story that hand-rolls what a battery provides is a **story** defect — it teaches the next fork to hand-roll. A story that must fight a battery to say what it means is a **battery** defect: the stories are the generality test, and a documented bypass at the call site is that test reporting a failure.

### Scaffold — the base (`src/lib/`, `src/ui/`, `src/styles/`, composables)

Layout shells, AppFrame, modal stack, default CSS tokens, reset, and the bridge composables that connect engine state to UI. `src/lib/` is presentational-only — no engine imports — and is **not** an importable cross-package library. `src/styles/` provides opinionated CSS-variable values and widget-level selectors layered over the token defaults; forks override per-variable or swap wholesale.

Maintenance discipline: stability **and generality**. Forks copy this and don't want it shifting under them; they also shouldn't have to fight it. The bar for new scaffold code is "would every new game want this on day one, and is it general enough that a story doesn't route around it?"

### Archetype demos — the stories (`src/showcase/archetypes/<name>/`)

Forkable best-practice implementations of validated archetypes. Each archetype is a composition in research's pattern language (its identity line) carried by a rate-function balance spine, and is self-bootable with its own `data/`, `modules/`, `composables/`, `ui/`, `sim/`, and `boot.ts` — pre-wired engine boot, module registration, save/load, settings, notation, toasts, theme, and a working game skeleton.

This half is a research-output surface that happens to live inside starter. Maintenance discipline: research-grounding. An archetype is grounded in two things — the **pattern language** (the validated patterns its identity line composes, per `open-loop-research/LIBRARY.md` and `archetypes/_identity.md`) and a **rate-function balance spine** (the closed-form or named-adjacent-math bucket its economy lives in, per `incremental-math/…/rate-functions/`) that *generates* its balance rather than lifting numbers from a game. Exemplar games validate that the composition ships in the wild — cited as a set, crosses and all — never lifted verbatim. The bar for new archetype content is "would a new game forking this archetype want this on day one, and does its balance fall out of the declared spine?"

(The built archetypes — looper, defender, scaler, interlocker — predate this: they are subtractive ports that lifted ids/names/numbers 1:1 from one canonical exemplar. Their own `overview.md` / `PROGRESSION.md` / `BALANCING-<name>.md` record that, honestly, as dated fact. They are not the forward model, and forward archetypes are not built that way.)

### Fork workflow

`pnpm eject <archetype> [--name <game>]` turns the starter into a single-game fork in one step: hoists your archetype to `src/game/`, rewrites `main.ts` to a single-archetype boot, repoints/prunes config, slims `types.ts`/`manifest.ts` to game identity, stubs the README, and deletes the entire demo/research surface (`src/showcase/` + the repo-root demo docs) **and eject's own machinery** (`scripts/eject.mjs`, `src/test/eject.test.ts`, the `eject` script, the `@/showcase` eslint guard). The fork starts clean, green, and correctly-named. It's **dry-run by default** — it prints the plan and touches nothing; pass `--execute` to perform it. Implementation in `scripts/eject.mjs`, locked by `src/test/eject.test.ts`.

Two modes: `pnpm eject <archetype>` builds on a validated archetype (its `Producer*`/`Looper*` identifiers stay — honestly naming the pattern you chose); `pnpm eject --clean` hoists the neutral `_blank` skeleton (generic `Game*` symbols) for a novel composition with no fitting archetype — the honest blank base, so there's no archetype content to gut. `--name` controls display casing (`--name "Cookie Tycoon"` → `Cookie Tycoon`); the package name + `GAME_ID` are slugified.

Because the eject test is deleted with the machinery, there is no self-checking green-after-eject invariant — the fork must run `pnpm install && pnpm typecheck && pnpm test && pnpm lint` itself (eject prints this).

**Manual post-fork steps eject leaves to judgment:** rewrite `.claude/CLAUDE.md` from the starter's dual-character framing to your game (eject leaves it verbatim — a `--name` stub would lose too much); regenerate `src/game/overview.md` + `domain-map.md` (`pnpm domain-map`) once you've reshaped `src/game/data`. (`.claude/CLAUDE.local.md` is gitignored and doesn't travel; the fork inherits the studio-root `gitea-tasks` MCP config once its own `.mcp.json` is removed, which eject does.)

The demo surface lives behind one strip boundary — everything under `src/showcase/` (archetypes, gallery, about, sandbox). The scaffold never imports across that boundary; an eslint rule enforces the one-way cut so the ejected game can't break (`eslint.config.js` holds the covered paths). The `_blank` skeleton lives under the boundary too — an underscore-prefixed authoring surface the gallery and the archetype list both filter out.

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # vue-tsc -b && vite build
pnpm typecheck        # vue-tsc -b
pnpm preview          # Preview production build
pnpm test             # Vitest run
pnpm test:watch       # Vitest watch mode
pnpm lint             # eslint src/
pnpm format           # prettier --write
```

## Architecture

```
src/
├── main.ts        # Gallery boot. `pnpm eject` rewrites it to a single-game mount.
├── boot.ts        # bootEngine / bootApp — the supported way to wire an engine + app. Archetype boot.ts files flow through these.
├── types.ts       # Shared starter types (the gallery contract).
├── showcase/      # ← STRIP BOUNDARY. `pnpm eject` deletes this whole tree. Archetype demos, gallery, about, sandbox.
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

### Archetype convention

Each archetype under `src/showcase/archetypes/<name>/` is self-bootable and follows the same colocated shape (matches `/work/studio/incloneution`):

```
src/showcase/archetypes/<name>/
├── data/            # Pure config. Typed defs + balance constants. Skeleton + balance
│                    # lens lives here as comment sections, not separate files.
├── modules/         # Engine modules; factory-constructed, closing over data.
├── composables/     # Vue composables when there's scoped Vue work or cross-module synthesis. Optional layer.
├── ui/              # Archetype-colocated screens + panels + components. Root
│                    # `*AppRoot.vue` is routing+chrome only; a `<XGameView>`
│                    # subtree owns all module reads (see § Key Patterns).
├── sim/             # Beat + probe vitest suite per archetype doc § 7.
└── boot.ts          # createApp(overrides?) → { app, engine, mount }.
```

**Dependency direction (strict):** `data → modules → ui`, with composables between modules and ui when they earn the layer (see § Layering). Data never imports from modules; composables and components never contain game logic.

**Port methodology lives next to the code** at `src/showcase/archetypes/README.md` — canonical template: directory shape, the two number-sourcing methods (forward spine / subtractive clone), `IDENTITY.md` requirements, the three-lane balance pipeline + canonical `balance/` filenames, and landing discipline (walkthrough gate, phased landing). `archetypes/README.md` is the balance-kit index that routes to it. Reference reading, not auto-loaded; consult before starting a port.

**Fork workflow:** `pnpm eject <archetype>` (see § Fork workflow above) — hoists one archetype to `src/game/` and deletes the rest of `src/showcase/`.

### Layering

```
modules (engine logic) → composables (when earned) → ui (game rendering)
lib/styles → lib/shells → lib/frame → lib/modal
styles (scaffold theme) → ui + lib (via CSS custom properties)
```

- **`src/lib/`** — scaffold layout/theme layer. No engine imports. Consumed by `src/ui/` via `@/lib`.
- **`src/modules/`** own engine state via `persistent()` refs; no UI imports.
- **`src/composables/`** — UI consumes module public API, never internals. Composables earn their layer with `computed` / `watch` / lifecycle, per-component state, or cross-module synthesis. Pure re-export composables are wallpaper — UI imports from `modules/` directly.
- **`src/ui/compositions/`** — engine-state→widget wiring that recurs across archetypes. Each composition is a `.ts` **contract** (the row/item shape a game supplies) plus a `.vue` **default renderer** and a test. **The contract is the battery; the renderer is one default.** A game can adopt the contract and render it however it likes — interlocker takes `ResourceReadout` and renders it with its own `ResourceList.vue`. "Want the shape, not the markup" is a first-class path, not a fallback. Two extension seams, in order of reach: (1) the typed `extra?: T` payload + the `#row`/`#cell` slot — parameterize the component (`ProducerList<MyRow>`) and read your own state back typed in the slot; this is how a game holds a shape the flat contract can't (e.g. multi-resource costs) **without the core contract growing every consumer's needs**; (2) reskin from outside via the composition's costume hooks (`:deep(.producer-list__…)`), which are documented **stable API** in each composition header — renames are breaking. Survives eject. Bar: "would a new game want this on day one, and is it general enough that a story doesn't fight it?" Route in is the recipe surface's presentation flavor (`src/showcase/recipes/candidate-recipes-ui.md`), not hoist-on-noticing.
- **`src/styles/`** sets token defaults and widget-level selectors consumed by `src/lib/` and `src/ui/components/`.

### Key Patterns

- **Engine singleton** — created once via `bootEngine` (`src/boot.ts`), HMR-invalidated, shared via `provide('engine')`. `bootEngine` prepends `sharedBase` to every mod, so archetypes never assemble the base themselves.
- **Routing shell vs game view** — an archetype root (`*AppRoot.vue`) is routing + app chrome only and reads **no** engine module state (its setup runs pre-`start()`, on the slot screen). All module reads live in a `<XGameView>` subtree rendered under the post-start `v-else` frame. Full discipline + corollaries in `.claude/rules/app-root-discipline.md`; `_blank/ui/GameView.vue` is the reference forks copy.
- **Slot-based shells** — `src/lib/shells/*` never prescribe content; games fill slots
- **CSS variables for theming** — the single source of styling truth. `src/lib/styles/tokens.css` declares the default token values (palette, spacing, radius, shell/modal/widget knobs); `src/styles/` provides the scaffold theme and widget-level selectors on top

## Balance methodology

Three rules for per-archetype balance work under `sim/` and `balance/`:

- **Math first, sim to verify.** Use closed-form expressions (`calculateBeatTiming`, geometric series, piecewise integrals) to predict balance targets. Sim-verify at a coarse `tickDelta` (1s–5s) — not the default 0.05s, which wastes cycles on sub-second fidelity for minute-scale events.
- **Scripts discover, Vitest locks.** Balance discovery (solver iteration, projector runs, perturbation sweeps) belongs in vite-node scripts (`pnpm balance:*`). Vitest is for regression locks: chosen invariants pinned with tolerance bounds *after* discovery converges. Don't route discovery through Vitest — its semantics fight the workflow.
- **Step solvers incrementally.** For multi-beat solvers, run beat N alone at `PASSES = 1`, then `PASSES = 3`, then add the next beat. Each rung should flush a log in under two minutes. The full run is the last step, not the first.

## Behavioral testing

Balance probes lock *how much* (magnitudes, with tolerance); behavioral suites spec *what a mechanic does* (counts, monotonic growth, slots freeing) by driving the real assembled engine tick-by-tick. Keep them separate — behavioral assertions stay true across retunes, so magnitude numbers don't belong in them.

- **Primitive:** `src/test/bootTestEngine.ts` — boots a fresh engine (shared base + given modules) on memory storage under a unique namespace, returning `{ engine, tick, tickUntil, dispose }`. Scaffold-level and game-agnostic; survives eject.
- **Per-game harness:** `sim/harness.ts` wraps the primitive into bare `boot()`/`tick()`/`tickUntil()` free functions that hardcode the game's module list, so tests read `boot(); doThing(); await tick(10)`. Set its `TICK_RATE` to match your economy's time unit. `_blank` ships this plus a living `sim/example.test.ts`; eject leaves both in `src/game/sim/`, so a fork is born with the pattern green.
- **Reset by fresh boot.** `beforeEach(() => boot())` — modules rebind their state on `install` and the unique namespace isolates persistent-ref contexts, so a fresh engine per test *is* the reset. No per-module reset surface to maintain.
- **Where suites live:** per-module behavioral specs beside the module (`src/game/modules/<name>.test.ts`), importing the `sim/` harness; balance probes stay under `sim/`+`balance/`.

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
- Each archetype carries a `domain-map.config.mjs` + generated `domain-map.md` — a per-game map of its own domain language (vocabulary + is-a + reference graph) sourced from the `data/` types by the engine's `ol-domain-map` tool. Regenerate with `pnpm domain-map`. This is a read-only research surface (like `overview.md`): generated FROM the types, never feeding back IN — so it's drift-proof, not a codegen round-trip. Edit the config (suffixes, nouns, curated disambiguators), never the `.md`. Each committed map doubles as a forkable best-practice example.
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
- Shell additions to `src/lib/` cite the layout-spray research (§ Research Inputs) — the shell set is a research finding, not a preference.

## Path Aliases

```
@/* → src/*
@/lib → src/lib (the former open-loop-ui import surface)
```

## Peer Setup

`@open-loop/engine` is a workspace dep resolved to the sibling checkout at `/work/studio/open-loop-engine` — the version range in `package.json` is superseded by the `workspace:*` override in the studio-root `pnpm-workspace.yaml`, so don't read it as a published-version pin. Changes propagate immediately via HMR.

## Research Inputs

- `/work/studio/open-loop-research/practical/ui-ux/layout-spray-2026-04.md` — the layout spray that validated the shell set and killed the 2×2 quadrant idea. Primary reference for shell design; read it before adding or reshaping a shell.
- `/work/studio/open-loop-research/practical/ui-ux/game-layout-patterns.md` — deep dives on Cookie Clicker, Progress Knight, Kittens Game.

<!-- Private, gitignored per-repo notes (replaces auto-memory). Resolves to .claude/CLAUDE.local.md. -->
@CLAUDE.local.md
