# AGENTS.md

Repo conventions for every agent harness: Claude Code, Codex, opencode or any other.
`.claude/CLAUDE.md` imports this file rather than restating it. So this file is the one
home for the content; edit here.

open-loop-starter is the engine's batteries-included clone target, and the storybook for those batteries. Games clone and eject from here.

**Stack:** Vue 3 + TypeScript + Vite + reka-ui + `@open-loop/engine` + break_eternity.js

## Purpose

Two halves split at `src/showcase/`. The **base** is the batteries (§ Scaffold). The **stories** are the archetype demos. Starter is not a library; clone and eject.

The stories half documents itself in `src/showcase/AGENTS.md`, inside the strip boundary. That file covers how an archetype is built, how the two halves test each other, and the `pnpm eject` fork workflow. `pnpm eject` deletes that tree, so the file goes with the code it describes. A fork keeps only what still applies to it.

### Scaffold — the base (`src/lib/`, `src/ui/`, `src/styles/`, composables)

Layout shells, AppFrame, modal stack, default CSS tokens, reset, and the bridge composables that connect engine state to UI. `src/lib/` is presentational only, with no engine imports. It is **not** an importable cross-package library. `src/styles/` provides opinionated CSS-variable values and widget-level selectors over the token defaults. A fork overrides single variables or replaces the set.

Maintenance discipline: stability **and generality**. A fork copies this. It wants the base not to change under it, and not to need workarounds. The bar for new scaffold code is two questions:

- Would every new game want this on day one?
- Is it general enough that a story does not route around it?

## Terms

Starter's text follows the engine's term list: `docs/terms.md` in the `@open-loop/engine` package. It governs prose, TSDoc, runtime messages, UI text and starter's own API names. Read a word's family there before you write it.

Starter adds two terms:

| term | meaning | not |
|---|---|---|
| **test harness** | an archetype's `sim/harness.ts`: bare `boot()`, `tick()` and `tickUntil()` over its module list, for behavioral suites | bare "harness" |
| **costume classes** | the CSS classes and data attributes a fork overrides to reskin a component. Each composition header lists its own; they are stable API | costume hooks, class hooks, data hooks |

Starter differs from the engine list in one rule. It always qualifies "harness": balance harness, test harness or agent harness. The engine's bare "harness" means the balance harness, but starter has a second one. Code spans such as `@open-loop/engine/harness` and `sim/harness.ts` are exempt.

Where the list is silent, a word keeps its everyday sense. Examples are starter's layers (`modules`, `composables`, `ui`, `lib`) and Vue's "render".

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
├── ui/            # Engine-bridged UI — screens, panels, components, compositions. Archetype-specific SFCs are in their archetype, not here.
├── composables/   # Starter-level composables — bridge shared-base state to UI.
├── modules/       # The shared-base engine modules every archetype boots.
├── directives/    # Shared Vue directives.
├── balance/       # Cross-archetype balance toolkit over the engine's balance harness. Per-archetype balance/ is in the archetype.
├── styles/        # Scaffold theme layered over lib's token defaults.
└── test/          # Scaffold-level test utilities. Game-agnostic; survives eject.
```

These are roles, not inventories: the directory is the list. `src/ui/components/**` is registered globally (`unplugin-vue-components`), so templates need no import for them.

### Layering

```
modules (engine logic) → composables (when earned) → ui (game rendering)
lib/styles → lib/shells → lib/frame → lib/modal
styles (scaffold theme) → ui + lib (via CSS custom properties)
```

- **`src/lib/`** — the scaffold layout and theme layer. It has no engine imports. `src/ui/` imports it through `@/lib`.
- **`src/modules/`** own engine state through `persistent()` refs, and import no UI.
- **`src/composables/`** — UI uses a module's public API, never its internals. A composable qualifies for this layer through `computed`, `watch` or lifecycle, per-component state, or cross-module synthesis. A composable that only re-exports adds nothing; UI imports from `modules/` directly.
- **`src/ui/compositions/`** — engine-state-to-widget wiring that recurs across archetypes. Each composition is a `.ts` **contract** (the row or item shape a game supplies), a `.vue` **default renderer** and a test. **The contract is the battery; the renderer is one default.** A game can adopt the contract and render it its own way. For example, render `ResourceReadout` with your own list component. "Want the shape, not the markup" is a first-class path, not a fallback. There are two extension seams, in order of reach:
  1. The typed `extra?: T` payload and the `#row`/`#card` slot. Parameterize the component (`ProducerList<MyRow>`), and read your own state back, typed, in the slot. This way a game holds a shape the flat contract cannot, such as multi-resource costs. So **the core contract does not grow with every consumer's needs**.
  2. A reskin from outside, through the composition's costume classes (`:deep(.producer-list__…)`). Each composition header documents them as **stable API**, so a rename is breaking.

  Compositions survive eject. Their bar is the one in § Scaffold. Promotion is a deliberate pass over accumulated evidence, never a hoist on first notice.
- **`src/styles/`** sets the token defaults and widget-level selectors that `src/lib/` and `src/ui/components/` use.

### Key Patterns

- **Engine singleton** — `bootEngine` (`src/boot.ts`) creates it once, and `bootApp` shares it through `provide('engine')`. `bootEngine` prepends `sharedBase` to every mod, so an archetype never assembles the base itself.
- **Routing shell vs game view** — an archetype root (`*AppRoot.vue`) is routing and app chrome only. It reads **no** module state, because its setup runs before `start()`, on the slot screen. All module reads are in a `<XGameView>` subtree, rendered under the post-start `v-else` frame. A header action that reads module state is its own child component in the `SystemHeader` slot. `usePlaySession`'s `onLoaded` is the one root-side seam for post-start work. `_blank/ui/GameView.vue` is the reference a fork copies.
- **Slot-based shells** — `src/lib/shells/*` never prescribe content; games fill the slots.
- **CSS variables for theming** — the single source of styling truth. `src/lib/styles/tokens.css` declares the default token values: palette, spacing, radius, and the shell, modal and widget tokens. `src/styles/` adds the scaffold theme and widget-level selectors on top.

## Balance methodology

Three rules for per-archetype balance work under `sim/` and `balance/`:

- **Math first, simulate to verify.** Predict balance targets with closed-form expressions: `costCurve` and the engine's `Formula` algebra, geometric series, piecewise integrals. Verify by simulation at a coarse `tickDelta` of 1s–5s. The default of 0.05s wastes cycles on sub-second fidelity for minute-scale events.
- **Scripts discover, Vitest locks.** Balance discovery belongs in vite-node scripts (`pnpm exec vite-node <archetype>/balance/<probe>.ts`): solver iteration, projector runs, perturbation sweeps. Vitest is for regression locks: chosen invariants, pinned with tolerance bounds *after* discovery converges. Do not route discovery through Vitest, because its semantics do not fit the workflow.
- **Step solvers incrementally.** For a multi-beat solver, run beat N alone at `PASSES = 1`, then at `PASSES = 3`, then add the next beat. Each step should write its log in under two minutes. The full run is the last step, not the first.

## Behavioral testing

Balance probes lock *how much*: magnitudes, with tolerance. Behavioral suites spec *what a mechanic does*: counts, monotonic growth, slots freeing. They drive the real assembled engine tick by tick. Keep the two separate. Behavioral assertions stay true across retunes, so magnitudes do not belong in them.

- **Utility:** `src/test/bootTestEngine.ts` boots a fresh engine (shared base plus the given modules) on memory storage, under a unique persistence namespace. It returns `{ engine, tick, tickUntil, dispose }`. It is scaffold-level, game-agnostic, and survives eject.
- **Test harness:** `sim/harness.ts` wraps the utility into bare `boot()`/`tick()`/`tickUntil()` free functions that hardcode the game's module list. So tests read `boot(); doThing(); await tick(10)`. Set its `INTERVAL_RATE` to match your economy's time unit. `_blank` ships the test harness plus a living `sim/example.test.ts`. Eject leaves both in `src/game/sim/`, so a fork starts with the pattern green.
- **Reset by fresh boot.** `beforeEach(() => boot())`: modules rebind their state on `install`, and the unique persistence namespace isolates persistent contexts. So a fresh engine per test *is* the reset. No per-module reset surface needs maintenance.
- **Where suites go:** a per-module behavioral spec goes beside its module (`src/game/modules/<name>.test.ts`) and imports the test harness. `sim/` holds `harness.ts` and any suite that spans several modules. Balance probes are vite-node scripts under `balance/`, never in either place. They print rather than assert, so a test runner has no use for them.

## `src/lib/` scope

`src/lib/` is the scaffold's layout and theme layer: layout shells, AppFrame, modal stack, token defaults, reset. It is a real layer inside starter: presentational only, with no engine imports. But it is **not** an importable cross-package library. Games fork starter. There is no `open-loop-starter` package dependency and no cross-game semver contract. A fork may rename, restructure or delete any of this.

Rules that apply inside `src/lib/`, which a fork should keep by default:

1. **Styling: CSS custom properties only.** No Tailwind, no shadcn-vue. Theme by overriding variables.
2. **Behavior from reka-ui primitives.** a11y, focus trap, portal and positioning come from reka-ui. `src/lib/` adds classes and custom-property defaults on top; it never reimplements the behavior.
3. **Presentational only.** No engine imports. `eslint.config.js` enforces this, not convention. `src/ui/` owns engine bridging.
4. **What belongs here.** The cut line: `src/lib/` owns layout and cross-cutting pieces (shells, frame, modals, theme root). Concrete widgets are scaffold components in `src/ui/components/`, beside game components, so a fork adapts them in place. Decide membership by the cut line. What happens to be here today is an outcome, not the rule.

Extraction to a real shared library waits until several independent game UI passes converge on the same shape. Do not extract early against a single consumer.

## Dev overlay

`src/lib/dev/DevPanelOverlay.vue` is a presentational fullscreen overlay: a toolbar, a content slot, and ESC to close. It ships unmounted; base starter mounts no dev panel in `App.vue`. A fork opts in by mounting it behind its own dev flag.

`src/ui/panels/BalanceWorkbench.vue` is the balance workbench, the canonical content screen. It is a picker, a perturbation form and a delta table, wired through `useBalanceWorkbench` to `@open-loop/engine/harness`. It is engine-aware, so it is in the `src/ui/` layer.

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

`DevDiagnostics` is the always-on dev dock: an FPS and interval-rate readout, speed buttons and a balance workbench toggle. `DevPanelOverlay` is a top-level sibling of `AppFrame`, not pushed through `useModalStack`. It owns its fullscreen chrome, so it needs no modal-stack Dialog wrapping.

## Code Rules

**Naming:**
- Components: PascalCase.vue — `SidebarMainShell.vue`, `ModalStack.vue`
- Composables: `use*` — `useModalStack`, `useGame`
- CSS variables: one flat CSS namespace. Palette (`--color-*`, `--gap-*`, `--radius-*`, `--font-*`) and scaffold tokens (`--shell-*`, `--modal-*`, `--panel-*`, `--tooltip-*`, `--popover-*`, `--progress-bar-*`) are all in `src/lib/styles/tokens.css`.

**Rules:**
- All game quantities use `Decimal` from `@open-loop/engine`. The engine re-exports `break_eternity`; import it from the engine, not from the upstream package.
- Declare engine state inside `withPersistentContext(id, () => ({ ... }))` in `install(ctx)`. Or call bare `persistent()` while a persistent context is open: the engine wraps `install()` in its own `withPersistentContext`.
- Archetype `data/` is pure config: typed defs and balance constants only. Modules read data at construction, through a factory closure.
- Archetype data is inline in `data/*.ts`, with the skeleton and the balance lens as comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`). There is no parallel `vars/` layer and no codegen round-trip.
- Each archetype has a `domain-map.config.mjs` and a generated `domain-map.md`. The map covers the archetype's own domain language: vocabulary, is-a and reference graph. The engine's `ol-domain-map` tool builds it from the `data/` types; regenerate with `pnpm domain-map`. It is a read-only research reference, generated FROM the types and never feeding back IN. So it cannot drift, and it is not a codegen round-trip. Edit the config (suffixes, nouns, curated disambiguators), never the `.md`. Each committed map is also a forkable best-practice example.
- Game-specific content goes under `src/showcase/archetypes/<name>/`. Cross-archetype `src/modules/` and `src/ui/` stay archetype-agnostic.
- Layering inside each archetype runs `data → modules → composables → ui`.
- Layout uses `src/lib/` shells and AppFrame. `src/lib/` is presentational; engine bridging is in `src/ui/`.
- Theme by setting CSS variables (no Tailwind, no shadcn-vue).
- Type public component props and composable APIs explicitly.
- Shells are slot-based: content fills the slots, and the shell prescribes nothing.
- Every clickable element imports `Button` from `@/ui/components/Button.vue`. That component wraps the reka-ui `Primitive` with `v-hold-repeat`, and centralizes disabled-suppression.
- Component and composable tests use Vitest, @vue/test-utils and jsdom.
- Visual behavior runs in CSS first; JS is for state and interaction only.
- Focus, portal and a11y come from reka-ui primitives.
- A shell added to `src/lib/` cites the layout research it comes from. The shell set is a research finding, not a preference.

## Path Aliases

```
@/* → src/*
@/lib → src/lib
```

## Peer Setup

`@open-loop/engine` is an ordinary dependency. The version range in `package.json` is the pin, and engine updates come through your package manager like any other. A checkout may resolve it to a local sibling through a workspace override, which supersedes that range. Check for one before you trust the range.
