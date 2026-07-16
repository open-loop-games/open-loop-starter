# Candidate Recipes — UI & bridge

Companion to `candidate-recipes.md`. Same surface, same back-flow cadence
(`/work/studio/CLAUDE.md` § Back-flows) — see the parent file for the cadence, the
counting rule, and the primitive-vs-recipe test. Nothing here restates it.

This file is the **presentation & bridge** flavor: shapes whose repetition is
purely in the UI layer — app assembly, Vue composables, panels, widgets. It is a
third flavor on the recipe surface's existing resolve-by-flavor model
(studio/meta#11), alongside scaffolding and engine-composition, and it splits on
the same axis those do — by resolved home:

| Flavor | Resolved home |
|---|---|
| scaffolding | shared starter standard module (`src/modules/`) |
| engine-composition | engine `consumer-guide-recipes.md` |
| **presentation & bridge** | **`src/lib/` · `src/ui/components/` · `src/ui/compositions/`** |

The file split is the flavor split, so it costs no new vocabulary — and it keeps
the parent inside doc-size discipline as this lane grows.

The parent file indexes recipes by their *wiring*; a shape already indexed there
does not get a second entry here just because its UI copies rode along.

**Status: sweep in progress.** § Unverified leads is scratch — leads are drained
into entries as slices verify them, and the section is deleted when the sweep
closes. Nothing in it has been site-read. Entries below § Entries are site-read
per the parent file's landing rule.

## The UI discriminator

The parent's delete-test (invent engine API → primitive; re-wire engine API →
recipe) has nothing to bite on here: UI hand-rolls don't compose engine
primitives, they compose Vue, reka-ui, and lib shells. The UI test asks instead
**which layer the re-invention lands in**. Delete the thing; what must a fork
re-invent?

- **Layout or a cross-cutting surface** (shell, modal, focus trap, theme root) →
  `src/lib/`, and only if it clears that layer's cut line (`.claude/CLAUDE.md`
  § `src/lib/` scope). Presentational; no engine imports.
- **A widget** → `src/ui/components/`.
- **The wiring from engine state to a widget contract** →
  `src/ui/compositions/`, the `ProducerList` / `UpgradeGrid` /
  `ResourceHeaderStrip` shape: a `.ts` contract + `.vue` renderer + test.
- **Only archetype vocabulary over an existing composition** → stays copied. Not
  a candidate. This is the default and the largest bucket.

Ambient's `AutobuyerToggles` says "Tending" where producer's says "Automation".
That is archetype voice, not drift — a diff sees convergence, a reader sees two
archetypes correctly speaking their own language. When in doubt, it stays copied.

## Scope

**In:** the 9 archetypes with a UI, at the roles mapped below.

**Out, and why** — each of these would inflate every N it touched:

- `cycler/` — no UI surface at all (data + modules + balance + sim; no `boot.ts`,
  no `ui/`, no `composables/`). Nothing to sweep.
- `skirmish/_seeds/**` — verbatim copies harvested from tug and defender,
  unwired, excluded from typecheck, staged for deletion (`_seeds/README.md`).
  Provenance, not instances; counting them double-counts their sources.
- `scaler/*.ts` at archetype root — vendored SynergismOfficial source
  (`achievements`, `buy`, `challenges`, `reset`, `runes`, `synergism`,
  `upgrades`, `variables`). Not our hand-roll; nobody maintains it here.

Both exclusions follow from the parent's counting rule rather than being special
cases: an instance counts when it is **live and independently maintained** — code
someone would have to fix twice. Unwired and vendored trees are neither.

## Role map

Roles cut across paths, because the path conventions have diverged (see § Path
divergence). Membership is by role; the directory a file sits in decides nothing.

**root** — archetype app assembly: boot, shell selection, provide/inject, modal
and toast wiring.

- `_blank/ui/GameAppRoot.vue`, `ambient/ui/AmbientAppRoot.vue`,
  `defender/ui/DefenderAppRoot.vue`, `interlocker/ui/InterlockerAppRoot.vue`,
  `looper/ui/LooperAppRoot.vue`, `producer/ui/ProducerAppRoot.vue`,
  `scaler/ui/ScalerAppRoot.vue`, `skirmish/ui/SkirmishAppRoot.vue`,
  `tug/ui/TugAppRoot.vue`

**frame** — a layout tier between root and panels. Only 3 archetypes have one.

- `defender/ui/DefenderFrameLayout.vue`, `tug/ui/TugFrameLayout.vue`,
  `interlocker/ui/InterlockerGameView.vue`

**composable** — reactive bridge from module state to UI.

- ambient: `useAutobuyers`, `useAutoProducers`
- interlocker: `useActions`, `useAutomationPanel`, `useBuildings`, `useCrafts`,
  `useGameLog`, `useJobs`, `useLogFeed`, `useResources`, `useSciences`
- looper: `useTrackedResources`
- producer: `useAutobuyers`, `useChainBreakdown`, `useProducers`,
  `use-row-adapter`, `useUpgrades`
- scaler: `scaler-game-state`, `use-producer-row`
- skirmish: `useMatch`
- tug: `useCounterMatrix`, `useIncomeUpgrades`, `useLane`, `useMatch`, `useUnits`

**helper** — non-composable UI-side TS.

- `looper/composables/tooltips/actionTooltips.ts`, `looper/ui/next-action-drag.ts`

**panel** — a screen region owning one concern. Role, not path: looper's
`StatsPanel` / `TownColumn` / `ActionColumn` live in `ui/components/` and are
panels; scaler's live flat in `ui/`.

- ambient: `AutoProducerList`, `IdleScenePanel`, `UnlockTray`, `WelcomeBackOverlay`
- defender: `EndGameOverlay`, `MapCanvas`, `RoundStatusHeader`, `TowerShop`
- interlocker: `AutomationPanel`, `BuildingsPanel`, `CraftsPanel`,
  `JobAssignmentPanel`, `LogPanel`, `ResourceSidebar`, `SciencePanel`
- looper: `ActionColumn`, `StatsPanel`, `TownColumn`
- producer: `HeadlinePanel`, `ProducerPanel`, `UpgradeTray`
- scaler: `AchievementsModal`, `BuildingsPanel`, `ChallengesPanel`,
  `PrestigePanel`, `RunesPanel`, `TranscendPanel`, `UpgradesPanel`
- skirmish: `BattlefieldScreen`, `PlayField`
- tug: `CounterMatrixPanel`, `FortressBars`, `IncomeBar`, `LaneStrip`,
  `MatchEndSummary`, `UnitShop`

**component** — a widget or row rendered inside a panel.

- ambient: `AchievementGridDialog`, `AutobuyerMasterButton`, `AutobuyerToggles`,
  `PlantingGlyph`
- interlocker: `ActionBar`, `AutomationRow`, `BuildingRow`, `CalendarHeader`,
  `CraftCard`, `JobAllocationRow`, `ResourceList`, `ScienceNode`
- looper: `AppTooltip`, `CurrentActionDetail`, `CurrentActionList`, `HeaderBand`,
  `NextActionList`, `NextActionRow`
- producer: `AchievementGridDialog`, `AutobuyerMasterButton`, `AutobuyerToggles`,
  `ClickCookieButton`, `CookieGlyph`, `ProducerTooltip`
- scaler: `ChallengeRow`, `CrystalRow`, `CumulativeRow`, `RuneRow`

## Slice plan

Slices cut by role across archetypes, never per-archetype: convergence is
cross-archetype by definition, so an archetype-shaped slice cannot see a repeat.
Each slice ends by writing entries + leads here, committing, then compacting —
this file and the commit are the memory.

| Slice | Roles | Files | ~Lines | Status |
|---|---|---|---|---|
| A | root + frame | 12 | 1.8k | not started |
| B | composable + helper | 30 | 2.1k | not started |
| C | component | 26 | 3.9k | not started |
| D | panel | 34 | 7.0k | not started — oversized, split at read-time |

A first: smallest, highest convergence density, and it names the vocabulary the
later slices reference.

D is oversized and will need splitting. The split must be a **size
accommodation, not a taxonomy** — cutting it by a guessed family (economy vs
contest, list vs overlay) decides convergence before reading, which is the
over-lumping trap the parent file records. Whatever the cut, entries from both
halves get cross-checked before the sweep closes.

## Path divergence

Running observations. The archetype directory convention has drifted; this is
recorded for a **later standardization pass on the code**, deliberately not
enforced by doc or lint — the convention isn't finished being learned, and
freezing it now would freeze the wrong shape.

- Composables sit at `<archetype>/composables/` everywhere except interlocker,
  which nests them at `ui/composables/`.
- `ui/` splits into `components/` + `panels/` in ambient, defender, interlocker,
  producer, tug; looper has `components/` but no `panels/` (and files there are
  panels by role); scaler and skirmish are flat.
- The frame tier exists in 3 archetypes under 2 names (`*FrameLayout` in
  defender/tug, `InterlockerGameView`).
- `_blank` ships a root only, so it models none of the above for a fork.

## Housekeeping found in passing

Not sweep output; noted so it isn't lost.

- `scaler/variables.ts` is vendored Synergism source (imports `./Calculate`,
  `./Tabs`, `./types/Synergism` — none present), is imported by nothing, and is
  absent from the `tsconfig.app.json` exclude list that covers its seven vendored
  siblings.
- `tsconfig.app.json` excludes `src/showcase/archetypes/_template`; the directory
  no longer exists.

## Unverified leads

Scratch. Grep-level or read-in-passing signal, not site-read. A lead is not an N.

- **Adapter to a composition contract.** `producer/composables/use-row-adapter.ts`
  and `scaler/composables/use-producer-row.ts` both adapt archetype state into
  `ProducerList`'s `ProducerRowData`. Independently written, same job, different
  names. Grep says interlocker's `useResources` / `useJobs` and its
  `BuildingsPanel` also touch the contract — unread, so not counted. Slice B.
- **Autobuyer UI trio.** ambient/producer each carry `AutobuyerToggles` (75/75),
  `AutobuyerMasterButton` (29/28), `AchievementGridDialog` (239/268). The
  *wiring* is already indexed in the parent as "Autobuyer-as-content registry —
  N=2"; only a purely-presentational residue would belong here. Watch for
  double-indexing. Slices C.
- **Engine-API drift in a fork-copy.** ambient's `useAutobuyers` hand-rolls the
  ref/function/value unwrap that producer's does via the engine's
  `processGetter`. Not a recipe — a copy that drifted off engine API. Expect a
  class of these; file separately rather than fixing inline. Slice B.

## Entries

None landed yet.
