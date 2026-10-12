---
paths: ["src/showcase/archetypes/*/ui/*AppRoot.vue", "src/showcase/archetypes/_blank/ui/GameAppRoot.vue", "src/showcase/archetypes/*/ui/*GameView.vue"]
description: Startup/routing discipline for archetype roots — roots are routing + chrome only and read no module state; all module reads are in the post-start game-view subtree.
---

# App-root discipline — routing shell vs game view

An archetype root (`*AppRoot.vue`) runs its `<script setup>` at app mount, on the
slot-picker screen, **before** `engine.start()`. These reads resolve only *after*
`start()` has run install/connect:

- module getters (`getBuildings()`, `getUnlocks()`, …);
- module composables (`useAutobuyers()`);
- `engine.inject`/`tryInject` of a module key.

So a module read in root setup runs before start, and throws or reads `undefined`.

The fix is structural, not a signal or a guard. Split each archetype in two:

- **Root `*AppRoot.vue` — routing + app chrome only.** Setup pulls
  `usePlaySession`, `useModalStack` and dev refs, and **nothing that reads module
  state.** The template routes `<SlotScreen v-if="currentScreen === Screen.Slots">`.
  Under `v-else` it renders the `AppFrame` + `SystemHeader` chrome. That chrome
  wraps a single `<XGameView>` in the default slot, plus `ToastContainer` and dev panels.

- **`<XGameView>` — everything module-facing:** the shell, panels, overlays and
  any module-derived readouts. It mounts only under the `v-else` branch. So every
  read inside it, and inside its children, is structurally post-start. It needs no
  mount-timing ceremony and no `currentScreen === Game` check: the boundary *is* the guarantee.

Corollaries:

- A header action that reads module state is its **own child component**,
  rendered in the `SystemHeader` slot. Examples are an autobuyer master button and an
  almanac unlock button. Its setup runs when the frame mounts, post-start, not at
  root setup. Never lift its read into a root-level `computed`.
- An overlay shown only while `currentScreen === Game` belongs *inside* the game view.
  There the check is redundant, so drop it.
- `usePlaySession`'s `onLoaded(result)` is the one legitimate root-side post-start
  seam. First-launch wiring that needs a started engine goes there: auto-starting
  a match, or measuring the offline gap. That is not a module read in setup.
- `useModule(key)` throws on a missing provider, and that is a correct fail-fast.
  Under this discipline it is called only post-start. So a throw means "you read a
  module from the routing shell". That is a structural bug, not a race to hide.

`_blank/ui/GameView.vue` is the reference. Every clean fork copies the thin-root +
game-view split from that template, so the pattern does not drift from fork to fork.
Every archetype's `ui/*GameView.vue` is a worked example of the boundary. One
example is `skirmish/ui/SkirmishGameView.vue`, with `BattlefieldScreen.vue` inside it.
