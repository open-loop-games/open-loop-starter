# Candidate Recipes — UI & bridge

Companion to `candidate-recipes.md`, the **presentation & bridge** flavor of the
recipe surface: shapes whose repetition is purely in the UI layer — app assembly,
Vue composables, panels, widgets. Same back-flow cadence and counting rule as the
parent (`/work/studio/CLAUDE.md` § Back-flows); nothing here restates them. Like
the parent (studio/meta#11), it resolves by home:

| Flavor | Resolved home |
|---|---|
| scaffolding | shared starter standard module (`src/modules/`) |
| engine-composition | engine `consumer-guide-recipes.md` |
| **presentation & bridge** | **`src/lib/` · `src/ui/components/` · `src/ui/compositions/`** |

The parent indexes recipes by their *wiring*; a shape indexed there doesn't get a
second entry here because its UI copies rode along.

## The UI discriminator

The parent's delete-test (invent engine API → primitive; re-wire it → recipe)
doesn't bite here — UI hand-rolls compose Vue, reka-ui, and lib shells, not engine
primitives. The UI test asks **which layer the re-invention lands in**. Delete the
thing; what must a fork re-invent?

- **Layout / cross-cutting surface** (shell, modal, focus trap, theme root) →
  `src/lib/`, if it clears that layer's cut line (`.claude/CLAUDE.md` § `src/lib/`
  scope). Presentational, no engine imports.
- **A widget** → `src/ui/components/`.
- **Engine-state → widget-contract wiring** → `src/ui/compositions/`: a `.ts`
  contract + `.vue` renderer + test (the `ProducerList` / `UpgradeGrid` /
  `ResourceHeaderStrip` shape).
- **Only archetype vocabulary over an existing composition** → stays copied. The
  default and largest bucket. Ambient's "Tending" vs producer's "Automation" is
  archetype voice, not drift.

## `_blank` weighting

`_blank` is the fork template (`pnpm eject --clean` hoists it to `src/game/`), so
its copies count differently. For an ordinary shape, N=k means *k authors hit the
same problem* — evidence a shared thing is wanted. For a `_blank`-resident shape,
N=k means *the template mandates it* — evidence it should be code the template
**uses**, not code it **contains**, since every clean fork inherits it as its own
`src/game/` code forever and can't tell it from what it wrote. Reading direction:
diff an archetype against `_blank`, and what's left is the archetype. (Verified: the
spine predates `_blank`; `e5acd56` enshrined it as *copy*, and skirmish copied it
again three days later rather than importing — the template promoted the
duplication from accident to policy.)

## Graduated & routed

Precedent, not live work. Each landed as noted; the durable lesson is what's kept.

- **App-root spine → `useGameSession` (`73719c0`).** The N=9 lifecycle
  (select→start→load, `returnToSlots`, `getActiveModules`) became one composable;
  the four real `startGame` tails became `onLoaded(result)` callbacks. **The split
  ran through the middle of the spine:** `getActiveModules` took 0/9 chances to
  diverge (pure copy, extracted), while `startGame`'s tail diverged four ways (real
  archetype needs, left owned). Nine chances to differ taken zero times is copying,
  not ownership.

- **Composition-contract → typed `extra<T>` (`15d61d6`, `5dcb855`).** The `.ts`
  contract is the battery, the `.vue` renderer one default. Killed the
  `row.extra as ProducerRow` cast (contracts + renderers now generic); did **not**
  grow single-resource `cost` to multi-resource — the typed `extra` + slot already
  carries that, and growing the core contract for one consumer is the N-driven
  over-extraction the goal warns against. Costume hooks documented as stable API
  (panel-compositions bare BEM, widgets `olui-`). `ResourceHeaderStrip` is the
  reference case: interlocker adopts the *shape* and renders its own markup.

- **Post-start module gate → resolved starter-side, no engine change
  (`studio/open-loop-engine#10`).** N=6 workarounds to one fact — module getters /
  `inject` are only valid after `engine.start()`. The engine triage found the fix
  is *not* a primitive: real consumers already dodge the gap by construction
  (start-at-boot: incloneution, multiverse-hr) or clean screen-routing (idle-loops-ng,
  maldacena, frontier confine all module reads to a post-start game screen), and no
  consumer invented a `started`/`whenStarted` signal — the signal's natural owner is
  whoever calls `start()`, always consumer-side. Resolution is the **app-root routing
  discipline** (`.claude/rules/app-root-discipline.md`): roots are routing+chrome only,
  a `<XGameView>` subtree under the post-start `v-else` owns every module read. The
  five start-order workarounds collapse (the three mount-timing components become plain
  game-view boundaries; ambient's `Screen.Game` gate drops). scaler's variant is
  *install*-order, not start-order — benign localized try/catch in the accessor's
  eager-register closures (grants resolve backward in dependency order, so no chain
  read actually fails); left as-is deliberately, since honest `| undefined` getters
  would spread `?.` across ~28 correct post-start callers to remove defense from one
  file. Landed: engine#10 needs no change; starter discipline + per-archetype
  game-view extraction across all nine roots.

- **Surface chrome → `.olui-surface` + `.olui-buy-card` (`aa11d20`).** Two widget
  classes: the surface/border/radius trio and the 12-declaration buy tile. Adopted
  across defender, tug, and scaler; looper's sites ride its re-base. **Read-every-
  site caught a false site:** defender's `MapCanvas` matched the census grep but uses
  an accent border on a positioned overlay, not a panel surface — a grep-only census
  would have shipped a wrong border.

- **Blocking overlay → `src/lib/modal/BlockingDialog.vue` (`aa11d20`).** N=2
  no-dismiss surfaces that `useModalStack` (wraps dismissible reka `Dialog`) couldn't
  express. **The portal decided the reskin seam:** the panel teleports to `<body>`,
  so scoped `:deep()` can't reach it — it reskins by a `panel-class` prop + unscoped
  rule, not costume hooks. So the costume-hook convention holds for *inline*
  compositions but **not** portaled chrome. Chose a lib component over a `blocking`
  flag: the consumers render declaratively off game state, which the stack's
  imperative push/pop model fights.

## Parked candidates

Live index — N=2 shapes awaiting a third instance or the dive. Sites kept so the
dive can find the hand-rolls.

- **Web-font injection — N=2 (ambient, producer).** A `FONTS_HREF` + `ensure*Fonts()`
  appending preconnect/stylesheet links from `onMounted`, byte-identical modulo
  href/id. **Deferred, not built:** a `useWebFont` helper would ease *runtime
  Google-Fonts fetching*; the prior question — fetch at runtime at all, or
  bundle/self-host (privacy, offline, perf, layout-shift) — comes first. The one
  candidate where the well-generalized-battery goal argues *against* a battery.
  Sites: `ambient/ui/AmbientAppRoot.vue:30-50`, `producer/ui/ProducerAppRoot.vue:28-48`.

- **Event-payload latch — N=2 (skirmish, tug).** `useMatch()` is identical: latch a
  `'matchEnded'` payload the emitter destroys on reset, so UI can read it post-event.
  Generalizes to any event-with-reset-on-emit; `src/composables/useLatchOnce.ts` is
  the adjacent home. **Deferred:** both consumers are `useMatch`, so demand is
  match-only. Build `useEventLatch` when a non-match consumer appears, or when the
  match-lifecycle recipe graduates and pulls it in. Sites:
  `skirmish/composables/useMatch.ts:16-32`, `tug/composables/useMatch.ts:23-39`.

- **Producer-row surface — N=2 (producer, ambient).** `useProducers` /
  `useAutoProducers` are the same ~60-line 11-field row builder; divergence is three
  renames and one filter line (ambient's doc says it adapted producer's copy). The
  rich row is built, narrowed to the thin contract, then re-attached whole as
  `extra` — the narrowing is nominal; weigh before treating the contract as
  load-bearing. Sites: `producer/composables/useProducers.ts:12-65`,
  `ambient/composables/useAutoProducers.ts:12-62`.

- **Archetype-local slot grid — N=2 (defender, tug) — stays copied.** Raw CSS grid
  with `grid-template-areas` + a narrow-window single-column floor. The *components*
  don't converge (3 vs 5 regions); the *practice* does, and both files independently
  reason to "inline until a second consumer of the same shape." The discriminator's
  last bucket working as intended; indexed so the third instance doesn't mistake it
  for a missing shell. Sites: `defender/ui/DefenderFrameLayout.vue:1-16`,
  `tug/ui/TugFrameLayout.vue:1-19`.

- **Costume-over-chrome — N=2 (ambient, producer), practice validated.** How a fork
  reskins a composition without forking it: `:deep()` on the shared component's
  `data-*` hooks under a costume class; logic + structure shared, ~180 lines of CSS
  the archetype's own voice. Now documented as stable API — but with **two
  conventions**: `src/ui/components/` emit `olui-*` hooks, `src/ui/compositions/`
  emit bare BEM. Prefix unification is an open optional follow-up. Sites: ambient's +
  producer's `ui/components/AchievementGridDialog.vue`,
  `producer/ui/panels/{ProducerPanel,UpgradeTray}.vue`, `scaler/ui/UpgradesPanel.vue`.

- **Cross-repo lead (unread).** `looper/ui/next-action-drag.ts:5` cites
  `idle-loops-ng/src/ui/components/next-action-drag.ts` as the same `InjectionKey`
  drag-tag pattern — N=2 across repos, but the sibling is unread, so a lead, not an N.

## Gated on a visual pass

Two adoption gaps that are visible *restyles*, not pixel-identical lifts — held for
the `game-frontend-design` screenshot loop rather than landed blind.

- **scaler tabs → `Tabs.vue`.** On read it's **2 adoptions, not 3**: `BuildingsPanel`
  and `UpgradesPanel` are clean fits; `ScalerAppRoot` is a *reasoned* exception (its
  triggers sit in `TabsBarShell`'s slot with a non-tab Achievements button
  interleaved and content slotted separately — `Tabs.vue`'s all-in-one
  `Root>List>Content` structure can't express it). Adopting the two fits restyles
  scaler's pill triggers → Tabs.vue's underline default.
- **looper scaffold re-base.** looper is the subtractive `idle-loops-ng` port,
  carried *beside* the scaffold rather than *onto* it; four rendered surfaces
  hand-roll what the scaffold ships: `AppTooltip`→`Tooltip.vue`,
  `useTrackedResources` + HeaderBand strip→`ResourceHeaderStrip`,
  time-bar→`ProgressBar.vue`, raw Dialog confirm→`useModalStack`. One re-basing task,
  not four cleanups; looper's 3 surface sites ride it (those files get replaced).

## Adoption gaps — shared thing exists, isn't used

`src/ui/compositions/` is adopted by **2 of 9 archetypes** (`ProducerList` /
`UpgradeGrid` → producer, scaler; `ResourceHeaderStrip` → scaler; `AchievementGrid`
→ ambient, producer). The loop wasn't just unclosed — it closed around two
consumers. Declines split two ways, and only the second is a problem:

- **Reasoned** — the renderer genuinely doesn't fit, said at the bypass:
  interlocker's `ResourceList` ("the pill-chip model doesn't fit a vertical sidebar")
  and `BuildingsPanel` ("`ProducerRowData` is single-resource"). These are the
  composition's documented limits, not failures. ambient's `AutoProducerList` is the
  same act left *undocumented*.
- **Unaware** — would have fit, wasn't reached for: the scaler-tabs and looper items
  in § Gated on a visual pass.

## Path divergence

For a later standardization pass on the code — deliberately not doc/lint-enforced;
the convention isn't finished being learned.

- Composables at `<archetype>/composables/` everywhere except interlocker (`ui/composables/`).
- `ui/` splits `components/` + `panels/` in ambient/defender/interlocker/producer/tug;
  looper has `components/` only (panels by role); scaler/skirmish flat.
- Frame tier: 3 archetypes, 2 names (`*FrameLayout` in defender/tug,
  `InterlockerGameView`) and two jobs — defender/tug's are raw slot grids,
  interlocker's uses `ThreePanelShell` and owns tab logic + a mount gate.
- Composable naming: camelCase majority (`useAutobuyers.ts`) vs kebab adapters/scaler
  (`use-producer-row.ts`, `scaler-game-state.ts`); `/work/studio/CLAUDE.md` says
  kebab, so the majority — incl. scaffold's own `useGame.ts` — drifts. Doc or ~25
  files, not both.
- `_blank` ships a root only (no `composables/`), so models none of the above for a fork.

## Not indexed — don't re-propose

- **Def-driven row builder — near-miss.** Every archetype maps `data.defs` → reactive
  rows (producer, ambient, interlocker ×4, tug ×2), N=4 across forks — but field sets
  diverge completely (`BuildingRow` multi-resource `costs[]`; `UnitRow`
  `cooldownRemaining`; `ScienceRow` `prereqMet`). Shared is "code that lists things,"
  too generic; the specific-enough subset already graduated as `ProducerRowData`.
- **Filename similarity is the worst signal here** — wrong every time it fired:
  `useRateBreakdown` vs `useChainBreakdown` (different jobs), `PlantingGlyph` vs
  `CookieGlyph` (unrelated), the "autobuyer trio" (grouped by duplicate filename, not
  shape). Read every site: a truncated `grep` window once produced a confident false
  finding (a claimed-missing tsconfig exclude that was in fact present) — the exact
  failure the read-every-site rule exists to prevent.
- **Subsumed by parent wiring entries:** `AutobuyerToggles` / `AutobuyerMasterButton` /
  `useAutobuyers` (autobuyer content, meaningless without the registry — though
  `AutobuyerMasterButton`'s mount-timing reason joined the post-start gate); match
  auto-start residue (two lines under *Two-sided match lifecycle*). The generalization
  test at work: content subsumes, the cross-cutting reason graduates.
- **A graduation that already worked:** `src/composables/useRateBreakdown.ts` feeds
  producer's themed tooltip *and* the scaffold default — the archetype-hand-roll →
  shared-composable route is proven; it just had no cadence feeding it, which is this
  sweep's premise.

## Open housekeeping

- **skirmish has no offline catch-up; tug does.** Both auto-start a match after load,
  but only tug advances the tick driver over the gap (`tug/ui/TugAppRoot.vue:39-42`
  vs `skirmish/ui/SkirmishAppRoot.vue:35-39`). Possibly deliberate (bot-vs-bot), but
  unstated.
- **Gallery theme machinery survives eject.** ambient/looper/producer set
  `body.dataset.archetype` for `*-theme.css` scoping that exists to stop themes
  leaking across the *gallery*; a fork has no gallery, so `pnpm eject` should arguably
  strip the setters + scoping. Needs a decision (edits a story's theme, not dead code).
- `tsconfig.app.json` excludes `src/showcase/archetypes/_template`, a directory that no
  longer exists — trivial cleanup.
