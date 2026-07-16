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
| A | root + frame | 12 | 1.8k | **done** — 4 entries, 1 subsumed, 3 housekeeping |
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
- Theme scoping (slice A): 3 of 9 roots import a `*-theme.css` (ambient, looper,
  producer); 6 set `document.body.dataset.archetype`, but only those 3 have CSS
  reading `body[data-archetype=…]`. The other 3 set it for nobody.
- The frame tier is two different jobs under one role: defender/tug's
  `*FrameLayout` are raw slot grids, while interlocker's `GameView` uses
  `ThreePanelShell` and owns tab logic + a mount gate. Same tier, unshared shape.
- interlocker alone omits `provide('currentScreen', …)` — and is right to (see
  § Housekeeping).

## Unverified leads

Scratch. Grep-level or read-in-passing signal, not site-read. A lead is not an N.

- **Adapter to a composition contract.** `producer/composables/use-row-adapter.ts`
  and `scaler/composables/use-producer-row.ts` both adapt archetype state into
  `ProducerList`'s `ProducerRowData`. Independently written, same job, different
  names. Grep says interlocker's `useResources` / `useJobs` and its
  `BuildingsPanel` also touch the contract — unread, so not counted. Slice A adds
  a third *form*: `ScalerAppRoot.vue:74-116` builds a `ResourceReadout[]` for
  `ResourceHeaderStrip` inline in the root, with no adapter layer at all. So the
  adapter is sometimes a composable and sometimes inline — bears on #20's third
  uncertainty. Slice B.
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

### Archetype app-root spine — N=9 (canonical)

Every archetype root is the same assembly with an archetype-shaped hole in the
middle. `SlotScreen` on `Screen.Slots` → `AppFrame` (`:stack`,
`:tooltip-delay="400"`) with a `SystemHeader` in `#header` → a shell → a sibling
`ToastContainer` → the dev dock. Around it: `inject<Engine>('engine')!`, a
`currentScreen` ref, `useModalStack()`, and three session functions.

**Status — established, not candidate.** Present in all 9 roots including
`_blank`; it *is* the archetype app convention, past the await-N=3 stage. Like
the parent's tuning-registry seam, the live question is graduation, not whether
it converged. Its sub-shapes carry their own N and their own divergence:

| Sub-shape | N | Divergence |
|---|---|---|
| `getActiveModules()` | 9 | **none — byte-identical.** Exists only to feed `BalanceWorkbench`'s `:modules`. |
| `returnToSlots()` | 9 | **none — byte-identical.** |
| dev-dock block (`isDev` + `showDevPanel` + `DevDiagnostics` + `DevPanelOverlay` + `BalanceWorkbench`) | 9 | **none — verbatim.** |
| `:tooltip-delay="400"` | 9 | none — the same magic number, 9 times. |
| `startGame()` | 9 | **spine identical, tail diverges.** Bare (`_blank`, interlocker, looper, producer, scaler); + offline catch-up (defender); + catch-up + match auto-start (tug); + match auto-start only (skirmish); + `SessionClock` resume with a pre/post primary-resource bracket for the welcome-back overlay (ambient). |

The `startGame` tail is the only sub-shape where the divergence is load-bearing —
each tail is a real archetype need. Everything above it is copy.

**The dev-dock sub-shape has a tell worth keeping.** `.claude/CLAUDE.md` § Dev
overlay documents this block as "typical fork wiring", framing the dev panel as
opt-in that forks mount themselves. All 9 opt-ins are byte-identical — the
boilerplate got *documented* rather than removed, and the opt-in framing is
buying nothing. A graduation here retires a doc section too.

**Shape a dive would weigh** (not a decision): a slot-based root component in
`src/ui/` plus a `useGameSession()` composable, leaving archetypes the residue
that actually differs — shell choice, panel set, theme import, `startGame` tail,
extra provides. Survives eject, so a fork keeps it.

- **Sites:** `_blank/ui/GameAppRoot.vue:13-47`, `ambient/ui/AmbientAppRoot.vue:23-132`,
  `defender/ui/DefenderAppRoot.vue:19-62`, `interlocker/ui/InterlockerAppRoot.vue:14-40`,
  `looper/ui/LooperAppRoot.vue:18-52`, `producer/ui/ProducerAppRoot.vue:21-82`,
  `scaler/ui/ScalerAppRoot.vue:32-140`, `skirmish/ui/SkirmishAppRoot.vue:15-52`,
  `tug/ui/TugAppRoot.vue:21-59`.

### Web-font injection from the archetype root — N=2 (ambient, producer)

A `FONTS_HREF` const plus an `ensure<Theme>Fonts()` that early-returns on an
element-id guard, builds two `<link rel=preconnect>` and one `<link
rel=stylesheet>`, and `document.head.append`s all three — called from
`onMounted`. Byte-identical modulo the href and the element id.

Both live and independently maintained; counts per the parent's rule. Home if it
graduates: `src/lib/` — presentational, no engine, a `useWebFont(id, href)`.

Rider: both fetch Google Fonts from the network at runtime, injected by an
archetype root. Worth a decision on its own merits before this gets blessed into
a shared helper that makes it easier to do nine more times.

- **Sites:** `ambient/ui/AmbientAppRoot.vue:30-50`, `producer/ui/ProducerAppRoot.vue:28-48`.

### Archetype-local slot grid — N=2 (defender, tug) — a practice, not a component

Raw CSS grid with `grid-template-areas`, named slots, a `@media (max-width:900px)`
single-column collapse as a "don't crash on a narrow window" floor, and a header
comment carrying an ASCII region diagram plus the graduation trigger.

The **components do not converge** — 3 regions vs 5, no shared markup — and they
shouldn't. What converges is the *practice*. Both files independently reason
their way to the same place, in nearly the same words: inline under the archetype
rather than `src/lib/shells/` because it's N=1, graduate at a second consumer of
that shape. Each is correct about itself; neither is evidence for the other's
shell.

This is the § UI discriminator's last bucket working exactly as intended — it
stays copied. Indexed so the third instance doesn't mistake the pattern for a
missing shell.

- **Sites:** `defender/ui/DefenderFrameLayout.vue:1-16`, `tug/ui/TugFrameLayout.vue:1-19`.

### Post-start module access gate — N=3, divergent solutions — ROUTING QUESTION

One engine fact — module getters and `inject` are only valid after
`engine.start()` — worked around three different ways, each with a comment
explaining the same constraint to the next reader:

- **interlocker** extracts a whole component (`InterlockerGameView.vue`) whose
  stated reason for existing is mount timing: "Lives in its own component so it
  mounts only after a game starts, when the engine modules (getBuildings etc.)
  are installed."
- **ambient** guards inline in a computed: `almanacUnlocked` returns early unless
  `currentScreen === Screen.Game`, because "the unlocks category is only
  populated after engine.start(), and Screen.Game is the gate that guarantees
  that's run."
- **skirmish / tug** reach for `engine.tryInject(MatchKey)` *after* `start()`,
  commented "Match module is only injectable post-start".

**This may not be a recipe.** Three independent workarounds to one ergonomic gap
is the shape of a *primitive* gap: the clean fix wants engine API (a post-start
injection guarantee, or a lazy accessor that resolves on first read), which by
the parent's delete-test routes to `open-loop-engine/docs/candidate-primitives.md`,
not here. Left indexed here with the receipts; the dive routes it.

**Lumping risk, stated on purpose:** these are three *manifestations*, not three
copies — a component extraction, a computed guard, and a post-start inject. They
are one entry only because they share a root cause. If the dive finds the root
cause isn't shared, split them rather than forcing the label.

- **Sites:** `interlocker/ui/InterlockerGameView.vue:1-6`,
  `ambient/ui/AmbientAppRoot.vue:119-126`, `skirmish/ui/SkirmishAppRoot.vue:36-38`,
  `tug/ui/TugAppRoot.vue:43-44`.

### Subsumed, not indexed

- **Match auto-start after load** — `const match = engine.tryInject(MatchKey); if
  (match && !match.inMatch.value) match.start();` is byte-identical in
  `skirmish/ui/SkirmishAppRoot.vue:37-38` and `tug/ui/TugAppRoot.vue:43-44`.
  The parent already indexes *Two-sided match lifecycle* (N=2, same two sites);
  this is that entry's two-line boot residue, not a shape of its own.
  **First data on #20's double-indexing uncertainty: the wiring entry subsumes
  the presentational residue.** One data point, not a rule yet — but the residue
  was too small to carry an entry, which suggests the test is size and
  independence, not principle.

## Housekeeping found in passing

Not sweep output; noted so it isn't lost.

- **`provide('currentScreen', …)` is vestigial in 8 of 9 roots.**
  `src/composables/useGame.ts:7` injects it behind a `!` non-null assertion and
  returns it — and no caller reads it: its only consumers, `useModule.ts:9` and
  `useSave.ts:5`, destructure `{ engine }` alone. Roots use their local
  `currentScreen` ref for their own `v-if`, which is real; the *provide* feeds
  nothing. interlocker is the single root that omits it and is correct by
  accident — the only one that noticed. The `!` is the landmine: a fork calling
  `useGame()` under a root that doesn't provide gets `undefined` with TS
  silenced. Fix is to drop `currentScreen` from `useGame`'s inject + return and
  delete 8 provides.
- **`document.body.dataset.archetype` is dead in 3 of 6 setters.** Only
  ambient/looper/producer ship a `*-theme.css` reading `body[data-archetype=…]`.
  `_blank` (sets `'game'`), scaler, and skirmish set it for no reader.
  `_blank` matters most: it's the fork template, so every clean fork is born with
  inert `onMounted`/`onUnmounted` wiring it has to reverse-engineer to delete.
  (`SandboxWrapper.vue:52` is a separate, legitimate consumer of the same
  attribute.)
- **skirmish has no offline catch-up; tug has one.** Both are match archetypes
  and both auto-start a match after load, but only tug advances the tick driver
  over the gap (`tug/ui/TugAppRoot.vue:39-42` vs `skirmish/ui/SkirmishAppRoot.vue:35-39`).
  Possibly deliberate — skirmish's match is bot-vs-bot and may not want a
  fast-forward — but nothing says so.
- `scaler/variables.ts` is vendored Synergism (imports `./Calculate`, `./Tabs`,
  `./types/Synergism` — none present), is imported by nothing, and is absent from
  the `tsconfig.app.json` exclude list that covers its seven vendored siblings.
- `tsconfig.app.json` excludes `src/showcase/archetypes/_template`; the directory
  no longer exists.
