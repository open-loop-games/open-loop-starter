---
paths: ["src/showcase/archetypes/*/ui/*AppRoot.vue", "src/showcase/archetypes/_blank/ui/GameAppRoot.vue", "src/showcase/archetypes/*/ui/*GameView.vue"]
description: Startup/routing discipline for archetype roots — roots are routing + chrome only and read no engine module state; all module reads live in the post-start game-view subtree.
---

# App-root discipline — routing shell vs game view

An archetype root (`*AppRoot.vue`) runs its `<script setup>` at app mount, on the
slot-picker screen, **before** `engine.start()`. Engine module getters
(`getBuildings()`, `getUnlocks()`, …), module composables (`useAutobuyers()`),
and `engine.inject`/`tryInject` of a module key only resolve *after* `start()`
has run install/connect wiring — so a module read in root setup fires pre-start
and throws (or reads `undefined`).

The fix is structural, not a signal or a guard. Split each archetype in two:

- **Root `*AppRoot.vue` — routing + app chrome only.** Setup pulls
  `useGameSession`, `useModalStack`, and dev refs — **nothing that reads module
  state.** Template routes `<SlotScreen v-if="currentScreen === Screen.Slots">`
  and, under `v-else`, the `AppFrame` + `SystemHeader` chrome wrapping a single
  `<XGameView>` in the default slot (plus `ToastContainer` / dev panels).

- **`<XGameView>` — everything module-facing.** The shell, panels, overlays, and
  any module-derived readouts. It mounts only under the `v-else` branch, so every
  read inside it (and its children) is structurally post-start. No mount-timing
  ceremony, no `currentScreen === Game` gate: the boundary *is* the guarantee.

Corollaries:

- A header action that reads module state (an autobuyer master button, an
  almanac unlock button) is its **own child component** rendered in the
  `SystemHeader` slot — its setup runs when the frame mounts (post-start), not at
  root setup. Never lift its read into a root-level `computed`.
- An overlay gated on `currentScreen === Game` belongs *inside* the game view,
  where the gate is redundant and gets dropped.
- `useGameSession`'s `onLoaded(result)` is the one legitimate root-side post-start
  seam — first-run wiring that needs a started engine (auto-starting a match,
  measuring the offline gap) goes there. That is not a module read in setup.
- `useModule(key)` throwing on a missing provider is a correct fail-fast: under
  this discipline it is only ever called post-start, so a throw means "you read a
  module from the routing shell" — a structural bug, not a race to paper over.

`_blank/ui/GameView.vue` is the reference: every clean fork copies the
thin-root + game-view split from the template, so the pattern can't be reborn per
fork. Every archetype's `ui/*GameView.vue` is a worked example of the boundary —
`skirmish/ui/SkirmishGameView.vue` with `BattlefieldScreen.vue` inside it, for one.
