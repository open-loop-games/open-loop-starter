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

**Status: slices A–D read; sweep ready for its dive.** § Unverified leads is
scratch — leads drain into entries as slices verify them, and the section goes
when the sweep closes. Nothing in it has been site-read.

**Coverage, stated plainly.** Every site an entry cites for a *judgment* was read
in full — slices A (12/12), B (30/30) and C (26/26) completely, and 18 of slice
D's 34 panels. The 16 unread panels are archetype-specific screens that no entry
turns on; where slice D's § Surface chrome cites files beyond those 18, it cites
them as an **exact-string census**, not as judgment, and says so in the entry. The
read-every-site rule exists because judgment over-lumps — a `grep` for three
literal CSS declarations doesn't. Any future entry resting on those 16 must read
them first.

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

## `_blank` is not just another instance

`_blank` is the fork template — `pnpm eject --clean` hoists it to `src/game/` for
a novel composition with no fitting archetype. That gives it a different weight
from its eight siblings in three ways, and they apply to every slice.

**It counts, but the argument it supports is a different one.** `_blank` is live,
shipped, typechecked and independently maintained, so the parent's counting rule
admits it. But it is the *intended copy source*: when a shape sits in `_blank` and
eight archetypes carry it identically, that is not eight independent
convergences — it's the template doing its job. The N is real; the reasoning
changes. For an ordinary shape, N=k means *k authors hit the same problem*, which
is evidence a shared thing is wanted. For a `_blank`-resident shape, N=k means
*the template mandates it* — which is evidence it should be code the template
**uses**, not code the template **contains**.

**Its cost is amplified and permanent.** Duplication in `_blank` isn't nine copies
today; it's every clean fork, forever, by design. And a fork is the reader least
equipped to spot it: the boilerplate arrives as *its own code* in `src/game/`,
indistinguishable from what it wrote, so it can't tell inherited scaffold from
its own decisions, and gets no upgrades to it.

**It is the de facto spec of the spine.** `_blank`'s root is the spine with
nothing in the hole. Whatever appears in `_blank` *and* identically elsewhere is
definitionally boilerplate — `_blank` has no game to justify it. That makes it the
best reading direction for the rest of the sweep: diff an archetype against
`_blank` and what's left is the archetype.

**Provenance (verified).** `_blank` postdates the archetypes it resembles: seven
roots exist as of `2397b48`; `_blank` lands 2026-07-10 in `e5acd56` ("add _blank
skeleton for archetype-free forks"); skirmish follows 2026-07-13 in `ec747a8` —
carrying the spine as a fresh copy. So the spine was already recognized as
canonical enough to enshrine in a template, and the template enshrined it as
*copy*; the next archetype built duplicated it anyway rather than importing it.
`_blank` did not create the duplication — it promoted it from accident to policy.

## Scope

**In:** the 9 archetypes with a UI, at the roles mapped on studio/open-loop-starter#20.

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

## Role map & slice plan

Sweep scaffolding — working state, not surface output — lives on the umbrella
(studio/open-loop-starter#20), which is the flow-state home per PROCESS.md
§ Iterative umbrella tickets. It held the slice list already; the role map joined
it rather than being duplicated here. Both die with the sweep; the entries below
outlive it.

Two rules from it that the entries lean on, so they stay: **roles cut across
paths** (the directory a file sits in decides nothing — looper's 550-line
`StatsPanel` lives in `ui/components/`), and **slices cut by role across
archetypes, never per-archetype** (convergence is cross-archetype by definition,
so an archetype-shaped slice cannot see a repeat).

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
- `_blank` has **no `composables/` directory at all** (slice B), so the template
  models nothing for this layer either — consistent with it shipping a root only.
- Composable file naming (slice B): the majority is camelCase (`useAutobuyers.ts`),
  but both composition adapters are kebab (`use-row-adapter.ts`,
  `use-producer-row.ts`) and scaler is kebab throughout
  (`scaler-game-state.ts`). `/work/studio/CLAUDE.md` says "Files: kebab-case.ts
  for TS" — so the camelCase majority drifts from the documented convention,
  including the scaffold's own `src/composables/useGame.ts`. Whichever way the
  standardization pass goes, it's the doc or ~25 files, not both.
- Every archetype with composables ships a pure re-export `index.ts` barrel (5 of
  5). Uniform and unremarkable; noted only so its absence somewhere reads as
  deliberate.

## Unverified leads

Scratch. Grep-level or read-in-passing signal, not site-read. A lead is not an N.

- **Cross-repo N=2, phase-3 sourcing.** `looper/ui/next-action-drag.ts:5` cites
  `idle-loops-ng/src/ui/components/next-action-drag.ts` as "same pattern" — an
  `InjectionKey` + drag-type-tag module so a row and a tile can share drag state
  without importing each other. The cited file exists (verified). Different
  repos = different consumer boundaries, so it would count N=2 — but reading it
  is phase-3 sourcing scope, and an unread site is not an N. Left as a lead.

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

**`_blank` changes what this N means** (see § `_blank` is not just another
instance). This isn't nine authors converging — `_blank` is the template, so the
spine is *mandated*, and every clean fork gets it as its own code in `src/game/`
forever. The provenance sharpens it: `_blank` was distilled from the archetypes
in `e5acd56`, and skirmish was built three days later with the spine copied
again rather than imported. The shape was recognized as canonical enough to
enshrine in a template; it just got enshrined as copy.

**The honest counter-argument.** Starter is "not a library — a template", and
forks are explicitly free to rename, restructure, or delete. A root a fork *owns*
is arguably correct, and a shared root trades that away. This entry does not
settle that — but the divergence data bears on it, and points one way: ownership
only pays where it's exercised. `startGame`'s tails diverged four ways because
each archetype genuinely needed something different — that's ownership earning
itself, and it should stay owned. `getActiveModules` did not diverge once in nine
tries. Nine chances to differ, taken zero times, is not ownership; it's copying.
The split runs through the middle of the spine, not around it.

**Shape a dive would weigh** (not a decision): a slot-based root component in
`src/ui/` plus a `useGameSession()` composable, leaving archetypes the residue
that actually differs — shell choice, panel set, theme import, `startGame` tail,
extra provides. Survives eject, so a fork keeps it, and `_blank`'s root becomes a
thin slot-filling shell instead of a hundred lines a fork inherits and can't
upgrade.

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

### Post-start module access gate — N=6, divergent solutions — ROUTING QUESTION

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
- **scaler** (slice B) wraps **20 `try`/`catch` blocks** with `?? ZERO` fallbacks
  around every cross-tier module getter in `composables/scaler-game-state.ts`,
  documented as tolerating "module not yet installed". By far the most severe
  manifestation — the workaround is most of the file's control flow.

- **ambient + producer** (slice C) each ship `AutobuyerMasterButton.vue` as a
  standalone 28-line component *whose only stated reason to be a separate file is
  mount timing* — both comments, in near-identical words: "Standalone component
  so the `useAutobuyers()` inject runs inside a child of the `v-else` AppFrame —
  i.e. after `engine.start()` has installed the autobuyer registry module.
  Mounting it under [X]AppRoot's `<script setup>` would fire the inject before
  slot-pick runs `engine.start()`."

**The component-extraction workaround is itself N=3** (interlocker's `GameView`,
ambient's and producer's `AutobuyerMasterButton`) — three components that exist
for no design reason, only to move an `inject` later in the mount order. A
component with no reason to be a component is a pure tax, and this is the
sub-shape a dive should weigh first.

**scaler's is adjacent, not identical, and that distinction may split the entry.**
The other three are *start*-order ("before `engine.start()`"). scaler's is
*install*-order between sibling modules: coin's upgrade grants evaluate eagerly
during `category.register` (the engine resolves modifier descriptions via
`chain.bind`), so cross-tier reads of prestige state run before prestige
installs. Same family — "the module isn't there yet" — different trigger. Left in
one entry with the difference stated rather than silently lumped.

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

### Composition-contract adapter — N=6 across three contracts

The `.ts` contract half of a composition needs archetype state mapped onto it.
Six independent instances across three contracts:

| Contract | Site | Form |
|---|---|---|
| `ProducerRowData` + `UpgradeCellData` | `producer/composables/use-row-adapter.ts` | pure `to*` fns over producer's own rich `ProducerRow` |
| `ProducerRowData` + `UpgradeCellData` | `scaler/composables/use-producer-row.ts` | pure `to*` fns over an engine `Producer` / `Purchasable` |
| `ResourceReadout` | `interlocker/ui/composables/useResources.ts` | a `use*` composable returning the array |
| `ResourceReadout` | `scaler/ui/ScalerAppRoot.vue:74-116` | **inline in the root — no adapter layer** |
| `AchievementGridCell` | `ambient/ui/components/AchievementGridDialog.vue:9-20` | inline `computed` in the consuming component |
| `AchievementGridCell` | `producer/ui/components/AchievementGridDialog.vue:9-20` | inline `computed` in the consuming component |

**The `AchievementGridCell` pair is byte-identical** — twelve lines that differ by
one word inside one string (`'Hidden — earn to reveal'` vs `'Hidden — bake to
reveal'`). Not the same idea expressed twice; the same code. It's also carrying
duplicated *game logic*: the hidden-achievement mask (`visible ? def.name : '???'`)
is a rule about how achievements reveal, living in two adapters instead of in the
composition with the reveal verb as a prop.

**The naming convergence is the strong signal.** producer and scaler
independently named their exports `toProducerRowData` and `toUpgradeCellData` —
the same two names, in files named differently (`use-row-adapter` vs
`use-producer-row`), over different input types and signatures. The contract's
name drove the adapter's name in both heads. A convention is trying to exist and
has nowhere to live.

**Resolves #20's third uncertainty: the adapter layer is not implied.** Three of
four use a dedicated module; scaler's root inlines it. Nothing forces the layer,
and nothing documents that it's a choice.

**Bigger finding — the contract and the renderer graduate independently.**
interlocker adapts to `ResourceReadout` and then renders it with *its own*
`ui/components/ResourceList.vue`, whose header says it "Consumes the same
ResourceReadout[] the shared ResourceHeaderStrip uses". So it took the contract
and declined the renderer. That's evidence the `.ts` contract is the valuable
half of a composition, and that a fork wanting the shape but not the markup is a
supported case nobody wrote down.

**Slice D: the contract has a stated limitation, documented at a bypass.**
`interlocker/ui/panels/BuildingsPanel.vue:16-20` declines `ProducerList`
outright, with a reason:

> "Buildings have multi-resource costs; ProducerList's `ProducerRowData` shape is
> single-resource (`cost(amount): DecimalSource`, `costLabel: string`), so the
> panel renders a bespoke `<ul>` of BuildingRow instead of slotting into
> ProducerList. The slot-override gymnastics to satisfy ProducerRowData would
> cost more than the wrapper saves."

That's the studio's "document the bypass where it lives" discipline applied to a
composition, and it names a real design bound: **`ProducerRowData` assumes one
cost resource.** Either the contract grows multi-resource costs, or it is
economy-archetype-only by construction and should say so.

**And the narrowing is nominal.** `producer/ui/panels/ProducerPanel.vue:23-25`
defines `richRow(row) = row.extra as ProducerRow` and routes *every* row read
through it — an unchecked cast from `extra?: unknown` straight back to the rich
row the adapter just discarded. The thin contract is a formality when the
consumer needs anything real; `extra` is the hole it escapes through, and it is
type-unsafe by design.

### Producer-row surface — N=2 (producer, ambient), fork-copy

`useProducers()` and `useAutoProducers()` are the same ~60-line file: the same
11-field row interface (`def`, `rate`, `rateChain`, `count`, `beatSeconds`,
`maxAffordable`, `getCost`, `canAfford`, `purchase`, `purchaseMax`,
`purchasable`), the same `computed(() => { for (entry of getAll()) rows.push({…}) })`
body, the same `?? Decimal.dZero` / `?? Decimal.dInf` fallbacks.

Divergence is three renames and one line: producer filters
`if (entry.def.trigger !== 'continuous') continue;`, ambient doesn't — and
ambient's doc explains the absence ("Ambient is zero-click, so every registered
producer is `trigger: 'continuous'` and there is no manual entry to filter out"),
which is an author telling you they adapted producer's copy.

Note the ceremony this sits in: the rich row is built here, then
`toProducerRowData` narrows it to the thin contract — and re-attaches the whole
rich row as `extra` so the `#row` slot can reach it. The narrowing is nominal;
every consumer gets the source object back anyway. Worth weighing at the dive
before the contract is treated as load-bearing.

- **Sites:** `producer/composables/useProducers.ts:12-65`,
  `ambient/composables/useAutoProducers.ts:12-62`.

### Event-payload latch — N=2 (skirmish, tug), byte-identical

`useMatch()` is **identical code** in both — same `MatchView extends MatchApi`
interface, same body, same `onScopeDispose(() => unsubscribe())`. Only the prose
comments differ.

```ts
const lastMatchEnd = ref<MatchEndedPayload | null>(null);
const unsubscribe = match.on('matchEnded', (payload) => { lastMatchEnd.value = payload; });
onScopeDispose(() => unsubscribe());
return { ...match, lastMatchEnd, clearLastMatchEnd: () => { lastMatchEnd.value = null; } };
```

The shape is **latch an event payload the emitter destroys**: `end()` runs the
reset, so `outcome` is null by the time UI reads it — the payload only exists in
flight. That generalizes to any event-with-reset-on-emit, well past match, and
`src/composables/useLatchOnce.ts` already occupies the adjacent slot
(latch-once-truthy), so the family has a home and a naming precedent.

**Resolves #20's double-indexing uncertainty — the test is generalization, not
size.** All three data points now agree, and size was only ever a proxy:

| Shape | Size | Generalizes past its wiring? | Verdict |
|---|---|---|---|
| Match auto-start (slice A) | 2 lines | no | subsumed |
| `useAutobuyers` (below) | 46 lines | no | subsumed |
| Event-payload latch | 40 lines | **yes** — any event, any reset | **own entry** |

- **Sites:** `skirmish/composables/useMatch.ts:16-32`, `tug/composables/useMatch.ts:23-39`.

### Costume over shared chrome — N=2 (ambient, producer)

How a fork adopts a composition *without* forking it. Both
`AchievementGridDialog.vue` files consume the shared
`@/ui/components/AchievementGrid.vue` and reskin it entirely from outside:
`:deep(.olui-achievement-grid__cell[data-earned='true'])` and friends, scoped
under a costume class (`.almanac-entries` / `.bakery-awards`), driving off the
shared component's `data-*` state attributes rather than its internals.

The split inside each file is the whole point, and it's clean:

| Layer | ambient vs producer |
|---|---|
| `<script setup>` | **byte-identical** (one word in one string) |
| `<template>` | **structurally identical** — same slots, same `#summary`/`#cell` shape |
| `<style scoped>` | **~180 lines, genuinely different** — pressed-flower almanac (dashed rules, oldstyle numerals, rotated mark) vs wax-seal bakery (radial gradients, brass, inset shadows) |

That is exactly the divide the § UI discriminator predicts: logic and structure
converge and should be shared; the costume is the archetype's voice and must not
be. Both files even head that CSS block with the same section comment — *"Costume
override on the shared cell chrome"*.

**Honest caveat on the naming evidence:** "Costume" is already house vocabulary —
`// ─── Costume ───` is a section marker in ambient's and tug's `data/` files. So
the *word* was available; what converged is the practice, not the coinage. Weaker
than the `toProducerRowData` convergence, which had no such prior.

**Bounded deliberately at N=2 archetypes** — but slice D found it's producer's
*standard* way of consuming anything shared, not a one-off. Slice C's census
grepped `:deep(.olui-` and so missed every composition, because **compositions
don't use the `olui-` prefix**. Full picture:

| Site | Costumes | Hook prefix |
|---|---|---|
| `ambient/AchievementGridDialog` | `AchievementGrid` (×8 selectors) | `olui-achievement-grid__*` |
| `producer/AchievementGridDialog` | `AchievementGrid` (×8) | `olui-achievement-grid__*` |
| `producer/ProducerPanel` | `ProducerList` (×3) | `producer-list__*` — **bare** |
| `producer/UpgradeTray` | `UpgradeGrid` (×2, incl. `__cell-wrap`) | `upgrade-grid__*` — **bare** |
| `scaler/UpgradesPanel` | `UpgradeGrid` (×1, in `@media`) | `upgrade-grid` — **bare** |

**The costume hooks are inconsistently namespaced across the two graduation
destinations** — `src/ui/components/` emit `olui-achievement-grid__cell`, while
`src/ui/compositions/` emit bare `producer-list`, `upgrade-grid`,
`resource-header-strip`. If costuming is the supported adoption path then these
hooks are API, and it's API with two conventions and no documentation. A
composition author renaming an internal class breaks a fork silently. That's the
sharpest thing this entry has to say, and it only surfaced because the first
census used the wrong prefix.

Excluded as different acts: interlocker's `:deep(.olui-panel__body)` (a spacing
tweak), ambient's and producer's `:deep(.is-active)` (reaching into `Button`'s
state class — costuming a *component's state*, less contractual still), looper's
`:deep(svg)` and skirmish's `:deep(canvas)` (library internals, not chrome).

- **Sites:** `ambient/ui/components/AchievementGridDialog.vue:137-238`,
  `producer/ui/components/AchievementGridDialog.vue:144-267`,
  `producer/ui/panels/ProducerPanel.vue:128-136`,
  `producer/ui/panels/UpgradeTray.vue`, `scaler/ui/UpgradesPanel.vue:191-195`.

### Surface chrome — the hole in the widget layer — N=4 (defender, looper, scaler, tug)

*Slice C opened this as N=2 on a vague "row/card" practice with a stated
over-lumping worry. Slice D resolved the worry the other way: the shape is
narrower and the count is bigger than recorded.*

`src/styles/theme-widgets.css` is the scaffold's widget-selector layer —
`.olui-tooltip__content`, `.olui-popover__content`, `.olui-select__trigger`,
`.olui-progress-bar`, plus `.btn-*`/`.badge*` in `base.css`. `.olui-panel` exists
but is modal *sizing* (`min-width:360px; max-width:560px; --panel-padding`), not
surface. **There is no card/surface class** — and it's the most-repeated CSS in
the archetype layer.

Two distinct blocks, each repeated verbatim rather than approximately:

**1. Panel surface** — the same three declarations, 17 files, 4 archetypes:

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius);
```

defender (`TowerShop`, `RoundStatusHeader`, `MapCanvas`), tug (`UnitShop`,
`FortressBars`, `IncomeBar`, `LaneStrip`, `CounterMatrixPanel`), scaler
(`ChallengeRow`, `CrystalRow`, `CumulativeRow`, `RuneRow`, `ChallengesPanel`,
`PrestigePanel`, `RunesPanel`, `TranscendPanel`), looper (`HeaderBand`,
`StatsPanel`, `AppTooltip`). It also appears in three `src/showcase/gallery/`
files — outside the role map, but more evidence it's universal.

**2. Buy-card** — twelve declarations, byte-identical, across two archetypes:

```css
text-align: left; background: var(--color-bg);
border: 1px solid var(--color-border); border-radius: calc(var(--radius) * 0.75);
padding: var(--gap-sm); display: flex; flex-direction: column; gap: 4px;
cursor: pointer; font: inherit; color: inherit;
transition: border-color 0.15s ease, background-color 0.15s ease;
```

`defender/TowerShop.vue:114` (`.tower-card`), `tug/UnitShop.vue:112`
(`.unit-card`), `tug/IncomeBar.vue:157` (`.upgrade-tile`) — differing only in
`gap` (4px/2px) and one `flex: 1 1 0`. Three sites, two archetypes, twelve
declarations neither author varied.

**Why the over-lumping worry is now retired.** Slice C's version was "everyone
writes row CSS", which is a label, not a shape. This is a *specific string*, and
the count came from an exact-match census rather than a judgment about
similarity. N=4 is by consumer boundary and each of the four archetypes had at
least two sites read; the 17-site list is grep-derived supporting detail, and
five of those files (`MapCanvas`, `StatsPanel`, `ChallengesPanel`,
`TranscendPanel`, `LaneStrip`) were not read in full — cited as census, not as
judgment.

Graduates as two selectors (a surface and a buy-card), not one.

Rider for the dive, unchanged from slice C: scaler both adapts to
`UpgradeCellData` *and* hand-rolls `CrystalRow`/`CumulativeRow` taking a raw
`Purchasable` — the same archetype using the contract and bypassing it.

### Blocking end-state overlay — N=2 (defender, tug)

Both match archetypes reach **past `useModalStack`** to hand-roll a fixed-position
overlay from reka-ui's `AlertDialog` primitives — the same six imports
(`AlertDialogRoot/Portal/Overlay/Content/Title/Action`), the same structure, and
CSS that is byte-identical for `__overlay` and `__restart` and differs in
`__panel` only by `max-width` (420 vs 480) and one `text-align`.

**They independently reasoned to the same rationale, and both wrote it down:**

> *defender:* "AlertDialog (not Dialog): end-game is a blocking decision surface —
> no ESC, no overlay-click dismiss. Player must click 'New game' to reset."
>
> *tug:* "AlertDialog (not Dialog): match-end is a blocking action — no ESC, no
> overlay-click dismiss. Player must click 'Start next match' to proceed."

**This is a modal-stack gap, not a preference.** `useModalStack` wraps reka's
`Dialog`, which is dismissible by construction; neither author could express
"blocking, no-dismiss" through it, so both bypassed it — while still consuming the
modal *tokens* (`--modal-backdrop`, `--modal-surface`, `--modal-radius`,
`--modal-padding`, `--modal-z-base`). They took the theme and rebuilt the
behaviour, which is the exact inverse of § Costume over shared chrome.

**The control case confirms it.** ambient's `WelcomeBackOverlay` *is* dismissible
("click to dismiss") and goes through `useModalStack` happily. So the split isn't
archetype taste — it's whether the surface must block. Two of two archetypes that
needed blocking bypassed the stack; the one that didn't, didn't.

Resolution the dive should weigh: an alert/blocking variant on `useModalStack`, or
an `AlertDialog` sibling in `src/lib/` — the chrome is presentational and belongs
there, with each archetype keeping its content.

- **Sites:** `defender/ui/panels/EndGameOverlay.vue:1-60`,
  `tug/ui/panels/MatchEndSummary.vue:1-89`; control:
  `ambient/ui/panels/WelcomeBackOverlay.vue`.

### Read, not indexed

Recorded so the next reader doesn't re-propose them.

- **Def-driven row builder — a near-miss, deliberately not an entry.** Every
  archetype maps `data.defs` onto reactive rows with `visible` / `can*` computeds
  and an action closure: producer (`useProducers`, `useUpgrades`), ambient
  (`useAutoProducers`), interlocker (`useBuildings`, `useCrafts`, `useSciences`,
  `useJobs`), tug (`useUnits`, `useIncomeUpgrades`). N=4 across fork boundaries —
  but the field sets diverge completely (`BuildingRow` carries multi-resource
  `costs[]` + an active-count throttle; `UnitRow` carries `cooldownRemaining`;
  `ScienceRow` carries `prereqMet`). What's shared is "code that lists things",
  which is too generic to graduate — and the concrete subset that *was* specific
  enough already graduated, as `ProducerRowData`. Indexing this would be the
  over-lumping trap wearing a label.
- **Three filename-driven false leads this sweep caught by reading.** Every one
  looked like convergence from a name and died on contact:
  1. `useRateBreakdown` (scaffold) vs `useChainBreakdown` (producer) — same
     filename shape, both take a `ModifierChain`, different jobs entirely
     (contribution/beat/marginal math vs walking bindings into factors).
  2. `PlantingGlyph.vue` (ambient) vs `CookieGlyph.vue` (producer) — same
     `*Glyph.vue` suffix, unrelated components: one is an icon-set dispatcher
     switching on `producerId`, the other a single hero illustration with
     turbulence filters and a `size` prop.
  3. The "autobuyer trio" this sweep itself named in slice A — grouped by
     *duplicate filename across ambient/producer*, not by shape.
     `AchievementGridDialog` has nothing to do with autobuyers; it belongs to the
     adapter entry. The label was wrong from the moment it was coined.
  The parent file's "automated scans over-lump" warning, reproducing three times
  inside the sweep that cites it — twice on hypotheses this sweep authored. The
  read-every-site rule is not negotiable, and **filename similarity is the single
  worst signal on this surface**: it has been wrong every time it fired.
- **A graduation that worked, for contrast.** `src/composables/useRateBreakdown.ts`
  is consumed by producer's bakery-themed tooltip *and* the scaffold's default
  `RateBreakdownTooltip.vue`, and its docstring says why: "keeps contribution /
  beat / marginal math in one spot so a fix in one place lands everywhere." The
  route from archetype hand-roll to shared scaffold composable is already proven —
  it just has no cadence feeding it, which is this whole sweep's premise.

### Adoption gaps — the shared thing exists and isn't used

The inverse of a recipe, so not indexed as one: nothing needs building, something
needs adopting. Recorded because the sweep keeps surfacing them and they'd
otherwise read as convergence.

**The compositions are adopted by 2 of 9 archetypes** (slice D census). Renderer
uptake: `ProducerList` → producer, scaler. `UpgradeGrid` → producer, scaler.
`ResourceHeaderStrip` → scaler alone. `AchievementGrid` → ambient, producer. So
`src/ui/compositions/` is, in practice, producer-and-scaler infrastructure that
the other seven archetypes route around. That reframes the sweep's premise: the
loop wasn't just unclosed, it was closed around two consumers.

The declines split into two kinds, and only one is a problem:

- **Reasoned declines** — the renderer genuinely doesn't fit, and the author said
  so at the bypass. interlocker's `ResourceList` ("the strip's pill-chip model
  doesn't fit a vertical sidebar — a tight table does") and its `BuildingsPanel`
  ("`ProducerRowData` is single-resource"). These aren't adoption failures;
  they're the composition's limits, correctly documented. ambient's
  `AutoProducerList` is the same act *undocumented* — it hand-rolls the whole list
  because the almanac costume (dotted leader lines, oldstyle numerals,
  per-producer verbs, glyphs) won't fit `ProducerList`'s markup, but nothing says
  so.
- **Unaware declines** — the shared thing would have fit and wasn't reached for.
  Below.

**scaler hand-rolls reka tabs three times.** `ScalerAppRoot`, `BuildingsPanel`,
and `UpgradesPanel` each wire raw `TabsRoot`/`TabsList`/`TabsTrigger`/`TabsContent`
and repeat a byte-identical `__tab-trigger` CSS block — while
`src/ui/components/Tabs.vue` exists and interlocker's `GameView` uses it. Three
sites, one archetype, one import missed.

**looper never adopted the scaffold — four gaps, one cause.**

| looper hand-rolls | Scaffold already ships |
|---|---|
| `ui/components/AppTooltip.vue` (59 lines over reka-ui) | `src/ui/components/Tooltip.vue` + `RichTooltip.vue` |
| `composables/useTrackedResources.ts` + `HeaderBand`'s resource strip | `ResourceHeaderStrip` + the `ResourceReadout` contract |
| `HeaderBand`'s `.time-bar-container` / `.time-bar-fill` | `ProgressBar.vue` + `.olui-progress-bar` |
| `HeaderBand`'s raw `DialogRoot`/`Portal`/`Overlay`/`Content` confirm | `useModalStack` |

`AppTooltip` is the clearest: same reka-ui wiring as the scaffold's `Tooltip.vue`,
but without the `TooltipProvider`, without the `--tooltip-*` custom-property
theming, hardcoding its surface instead — a strictly worse copy of a component
one import away.

**The cause is provenance, not drift.** looper is the subtractive port from
`idle-loops-ng` (`/work/studio/CLAUDE.md` § Studio components), and it carried its
source's UI wholesale: `CurrentActionList`, `CurrentActionDetail`, `NextActionList`,
`NextActionRow`, and `next-action-drag.ts` each cite
`idle-loops-ng/src/ui/components/<same name>.vue` by path in their header. It was
ported *beside* the scaffold rather than *onto* it. So these four aren't four
decisions to re-invent — they're one decision never revisited, which makes them a
single re-basing task rather than four cleanups.

This also retires slice B's resource-strip lead: same cause, no separate finding.

### Subsumed, not indexed

- **`AutobuyerToggles` (75/75) and `AutobuyerMasterButton` (29/28)** — N=2 each
  (ambient, producer), code-identical with only vocabulary differing ("Tending"
  vs "Automation", `almanac-` vs `bakery-`). Both subsumed by the parent's
  *Autobuyer-as-content registry*: they render `autobuyers.master` /
  `autobuyers.rows` and mean nothing without that registry. **The generalization
  test doing real work at its hardest case** — these are large and were the
  declared test — and it splits them cleanly: their *autobuyer* content subsumes,
  while the *mount-timing* reason `AutobuyerMasterButton` exists at all does
  generalize, and so joins § Post-start module access gate instead. Two shapes in
  one 28-line file, routed to two different places.
- **`useAutobuyers`** — N=2 (ambient, producer), near-verbatim: identical
  `AutobuyerRow` / `AutobuyerSurface` interfaces, identical body and return.
  Subsumed by the parent's *Autobuyer-as-content registry* (N=2, same two sites):
  it is, by its own docstring, "UI surface for the autobuyer registry" and means
  nothing without it. Large but doesn't generalize — the second row of the table
  above. (Its one real divergence is a defect, not a shape: see § Housekeeping.)
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
- **ambient's `useAutobuyers` reimplements engine API.** `rowFor` hand-rolls a
  six-line `typeof` / `'value' in` unwrap of `spec.isUnlocked`
  (`ambient/composables/useAutobuyers.ts:29-36`) where producer's copy calls the
  engine's `processGetter` + `unref` in two
  (`producer/composables/useAutobuyers.ts:31-32`). The fork-copy drifted off
  engine API. Confirms the predicted class; expect more in slices C–D.
- **scaler inverts the archetype layering.** Four modules — `coin.ts:60`,
  `transcend.ts:91`, `prestige.ts:83`, `achievements.ts:45` — import
  `buildScalerGameState` / `expandUpgradeGrant` from
  `../composables/scaler-game-state`, so `modules` depends on `composables`,
  against the strict `data → modules → composables → ui` direction. The file also
  isn't a composable: no `use*` export, no Vue reactivity beyond reading refs.
  It's a module-layer accessor misfiled under `composables/`, and moving it (to
  `modules/` or `data/`) fixes the direction without touching behavior.
- **Task IDs in comments, against comment hygiene** — four now, three of them
  stale refs from a different tracker than the org's Gitea `repo#N`:
  `interlocker/ui/composables/useJobs.ts:33` ("OL-1056 umbrella"),
  `interlocker/ui/panels/BuildingsPanel.vue:20` ("OL-1060 triage discussion"),
  `tug/ui/panels/IncomeBar.vue:36` ("OL-733's macro-vs-rush framing"), and
  `tug/composables/useMatch.ts:11` ("leaf-4 contract").
  `/work/studio/CLAUDE.md` § Comment hygiene: no phase names or task IDs in
  comments. Worth fixing as a class — each one is a dangling pointer for the next
  reader, since OL-* isn't resolvable from this org at all.
- `interlocker/ui/composables/useBuildings.ts:79` hardcodes
  `const continuous = def.id === 'smelter'` with a "Generalize this flag when a
  second continuous building lands" comment — a graduation trigger with no
  `TODO(expansion)` marker to find it by.
- `scaler/variables.ts` is vendored Synergism (imports `./Calculate`, `./Tabs`,
  `./types/Synergism` — none present), is imported by nothing, and is absent from
  the `tsconfig.app.json` exclude list that covers its seven vendored siblings.
- `tsconfig.app.json` excludes `src/showcase/archetypes/_template`; the directory
  no longer exists.
