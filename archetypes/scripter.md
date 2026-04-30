# Archetype: Scripter

> **One-line identity:** Programmable action queue + Automation gradient + DSL / meta-programming surface — the artifact-is-code incremental.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Bitburner](../../open-loop-research/analyses/complete/bitburner-analysis.md) (tier-3 meta-programming, JavaScript VM, 300+ API functions), [Antimatter Dimensions](../../open-loop-research/analyses/complete/antimatter-dimensions-analysis.md) (tier-2 DSL — the Automator's visual + text dual mode), [Profectus](../../open-loop-research/analyses/complete/profectus-analysis.md) (framework-level DSL + invertible formulas), [Cavernous II](../../open-loop-research/analyses/complete/cavernous-ii-analysis.md) (tier-1 spatial queue programming with control-flow primitives — `<` repeat, `=` sync), [Points Progression](../../open-loop-research/analyses/complete/points-progression-analysis.md) (tier-1 manual strategic allocation — typed-input-as-code).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. Scripter is the first Wave-1 archetype drafted without a live consumer in `/work/studio/`; grounding is Exemplars-only. The first fork that adopts the skeleton will convert the convergent gaps in § 10 from hypothetical to observed — expected shape on second revision is Looper-style, with two consumers co-citing the same missing primitive.

---

## 1. Player experience

Scripter is the archetype where *the player is the author of the game's behaviour*. You do not click buttons to advance — you write a program that clicks for you, and progress is the diff between what your script can describe and what the game currently demands of you. The first fifteen minutes are onboarding-via-vocabulary: you learn a tiny command set (`buy`, `wait`, `if`), type a four-line script, hit run, and the screen flashes as a state mutation happens without your hand on the mouse. From that moment, every decision is a rewrite.

A thirty-minute session is a sequence of edits, runs, and observes. You notice a resource that stalls, edit the script to add a conditional, run it, watch the execution log, tighten the condition, run it again. The long-term pull is *the program plays the game better than you can* — not a number, not a territory, a proof. End-of-arc is when your script executes a multi-step strategy you could not personally hand-dispatch inside the arc's time budget. Unlike Looper, the queue is not drag-edited — it is authored in text (or in a spatial command vocab with control-flow primitives) and re-authored when the world demands something the old script cannot name. Unlike Producer, the scaling axis is script quality, not purchase count. The Bitburner player's boast — *"my first script was fifty lines, my hundredth is ten"* — is the archetype-signature mastery metric.

---

## 2. Pattern composition

**Required patterns:**

- [Player Scripting Systems](../../open-loop-research/patterns/tier-2-common/player-scripting-systems.md) — the headline pattern. 10–14% corpus prevalence per the pattern doc; tiered 1/2/3 by expressiveness (queue → DSL → meta). Scripter's archetype-level commitment is that the player-authored artifact, not a UI gesture, drives automation; all three tiers qualify as long as the authoring surface is textual or symbolic.
- [Automation Systems](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — Scripter is advanced automation. The pattern doc's Loop 4 (Automation Acceleration) is Scripter's primary progression loop: progress unlocks script authorship, scripts execute strategies, strategies accelerate progress.
- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — the action substrate the script dispatches against. Scripter actions are duration-based (B-variation) or instantaneous-with-cost (A-variation); the engine executes them under script control.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — tier-unlock gradient (queue → DSL → meta) is the archetype's progression backbone. Augmentations / Source Files / tech-tree unlocks multiply script efficiency.

**Cross-pattern properties engaged:**

- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — dominant. Scripter is the "programmable control" endpoint of the automation gradient; 95% co-occurrence with AUTOMATION SYSTEMS per the pattern doc.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — augmentations / skills / source-files stack multiplicatively on top of script-executed actions (Bitburner hack-money × augmentations × server-score; Antimatter Dimensions IP × glyphs × time studies).
- [Unlock Requirements](../../open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md) — tier-gate unlocks (queue-level → DSL-level → meta-level), API-surface unlocks ("you can now call `buy()`" after first prestige), per-command unlocks.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — scripts-executed counts, actions-dispatched counts, resources-earned-while-scripting flows; feeds meta-achievements and script-efficiency metrics.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — script runtime budgets (Bitburner RAM cost per API call, iteration limits), augmentation multiplier stacks.

**Optional modifiers (fork may add):**

- **Prestige layer with script carry-over** — Bitburner's Augmentations + Source Files shape. Prestige resets world state but preserves script code *and* multiplies script efficiency. A fork that adopts this inherits the "scripts-persist-through-prestige" compulsion (the pattern doc's Dynamic 5.2 aha moment).
- **Sandboxed multi-agent script execution** — Bitburner-shape. Multiple scripts run concurrently on distinct sandboxes with per-agent resource budgets (RAM). Introduces scheduler correctness surface; most forks stay single-agent.
- **Visual + text dual authoring** — Antimatter Dimensions Automator pattern. Visual block mode for onboarding, text mode for power users, both compile to the same AST. Double UI development cost; justified when the fork targets casual + hardcore audiences.
- **Invertible-formula grounding** — Profectus framework pattern. Formulas exposed as evaluable-and-invertible values the script can query ("what level can I afford with X?"). Changes how scripts are authored; a fork that ships this inherits `createFormula`-shaped engine friction.

**Novel-patterns cluster alignment:**

- **Cluster #1 (Programming-as-Gameplay, ~10% prevalence, 7 games)** — Scripter *is* the archetype for this cluster. Promotion is pending engine primitive design per `novel-patterns-synthesis-v4.md` § "Programming-as-Gameplay" — Scripter's implementation is what would close that loop.
- **Cluster #4 (Prestige Architecture Innovations)** — a script-aware fork crosses into this cluster when scripts persist across prestige (Bitburner's Source Files shape).

**Distinguishing the two cousins.** A Looper's action queue is a drag-edited timeline; a Scripter's queue is a program. The dividing line is authorship surface: if the queue is edited with pointer gestures (drag to reorder, click to toggle auto-repeat) it is Looper-shaped; if the queue is edited as text, as symbolic commands with control flow, or as nested visual blocks compiling to an AST, it is Scripter-shaped. Nucaranlaeg's `<` (repeat) and `=` (sync) primitives are the boundary — spatial commands are drag-drop, but the control-flow primitives make the artifact a program. Cavernous II is therefore cited here and by Looper for different reasons: Looper cites it for the loop-reset + mana-as-time shape; Scripter cites it for the queue-as-code shape. A fork that hybridises both is a Looper-Scripter and inherits both archetypes' stress axes.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Script-execution budgets (Bitburner RAM, Antimatter Dimensions tick-speed) + game-state resources the script mutates (money, energy points). |
| core | `createModifierChain` | Augmentation / glyph / source-file stacks that multiply script-executed action yields. Depth is archetype-signature — tier-3 forks stack 6–10 named factors. |
| core | `createMultiplicativeModifier` | Per-augmentation multipliers composed into the chain. |
| core | `createSequentialModifier` | Ordered stacks where evaluation order matters (skill × augmentation × source-file × prestige). |
| core | `createPolynomialFormula` | Cost / reward curves the script queries via a read-only API (augmentation costs, action yields). `createLogFormula` / `createSqrtFormula` cover the other common shapes; all three return cost functions the runtime can evaluate on behalf of a script `afford()` query. |
| core | `createSequencer` | Tier-1 Scripter's action queue primitive (the "program" is a sequence with control-flow nodes). Tier-2 and tier-3 forks use a custom interpreter instead — see § 10. |
| core | `createCompositeStrategy` | Composable execution strategies the script can select (emergency-resource-only, priority-sweep, balanced); scripts pick a strategy, engine executes it. |
| core | `createTimedProgress` | Per-action duration tracking for script-dispatched actions (Bitburner hack/weaken/grow timers; Antimatter Automator `wait` statements). |
| core | `withChain` | Attribution of script-induced gains into named modifier chains for trace-view readability. |
| core | `runHeadless` | Beat-timing sim tests; scripts executed against a headless engine instance. |
| systems | `createSkillCategory` | Programming-literacy-adjacent skills — Bitburner's Hacking skill, Antimatter Dimensions' Reality-Glyph talent tree. Used as a multiplier source in the script-yield chain. |
| systems | `createContentRegistry` | Command registry — the set of actions the script can dispatch (`buy`, `wait`, `prestige`, `hack`, `grow`, etc.). Every dispatchable command is a registry entry with a validator, cost schema, and execution hook. |
| systems | `createPurchasableCategory` | Augmentation / glyph / source-file purchase surfaces. Purchases compose into the modifier chain, so a script's relative power grows without the script itself changing. |
| systems | `createTieredAchievement` | Script-authorship milestones (wrote-first-script, script-ran-for-1h, script-reached-prestige-N). |
| systems | `createPersistentEffectSystem` | Run-state effects — `scriptRunning`, `scriptPaused`, per-script timeout, per-iteration safety limits. Effects expose duration + stack semantics that the scheduler reads. |
| harness | `runMatrix` | Probe robustness across vars space; common probes iterate tier-unlock thresholds and command-vocab sizes. |
| harness | `runSensitivity` | Sensitivity analysis on script-yield modifier chains — which augmentation / skill factor has the largest marginal impact on arc duration. |

**Engine systems explicitly not used (required):**

- `createLoop` / `createReset` — Scripter baseline is *persistent* code authorship. A script written at t=0 is still available (as text) at t=N hours regardless of prestige cycles. Forks that add Bitburner-style Augmentation prestige compose `createCumulativeConversion` on top of the skeleton; the skeleton itself does not prescribe a reset tier. (A fork that wraps the whole game in a Looper reset is crossing into Looper-Scripter; the skeleton stays persistent.)
- `createInventory` — Scripter does not manage discrete item instances at the skeleton level. Bitburner has no inventory in the Explorer sense; Antimatter Dimensions' glyph inventory is a Scaler-shaped modifier chain, not an Explorer-shaped bag. Forks that want an inventory layer reach for it, but the archetype's signature friction is elsewhere.
- `createZoneSystem` — Scripter baseline is single-context execution. Bitburner's server network looks zone-ish but is better modelled as a graph content registry with per-server state; a literal `createZoneSystem` is over-structured for the query shape. Cavernous II's zones are inherited from its Looper-Explorer hybrid, not from Scripter.

Naming what is absent is half the Scripter contract: the archetype refuses loop resets, inventory, and zone gating, spending its surface budget on command-registry richness, modifier-chain depth, and the DSL-execution primitives that do not yet exist. Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`; the gaps (§ 10) are primitives that *should* exist and do not.

**Primary stress axes:**

1. **Sandboxed script execution.** The engine has no primitive for a DSL interpreter, a JavaScript VM, or an iteration-limited evaluator. Every Scripter fork will hand-roll one of these three. The stress axis is: *does the engine grow a `createScriptRuntime({ commands, safetyLimits, persist })` primitive, or does it stay game-side forever?* Cluster #1 in `novel-patterns-synthesis-v4.md` flags this as the blocker for pattern promotion.
2. **Command registry + dispatch validation.** Scripts invoke named commands (`buy`, `hack`, `prestige`); every command must validate its arguments, check cost / availability, mutate state, and report success/failure to the script. Bitburner's 300+ NetScript functions and Antimatter Dimensions' 40+ Automator commands are both hand-wired registries. Two consumers, identical shape. The engine's `createContentRegistry` covers the *registration* surface; the *validation + dispatch hook* layer is the gap.
3. **Modifier-chain depth.** Scripter forks stack augmentations / glyphs / source-files / skills / prestige-layer multipliers into a chain that can run 6–10 factors deep. The engine's `createModifierChain` + `createSequentialModifier` / `createMultiplicativeModifier` composition handles depth cleanly; the stress is around *traceability* — the script needs to query "why is my hack yield 3.2×?" and get a named-contributor breakdown. `withChain` already attributes; the question is whether a script-facing trace API emerges as a second primitive.
4. **Script persistence + versioning.** Scripts are the player's authored content. They need to serialise (save), survive game-version migrations (API-compatibility versioning), and — in multi-script forks — co-persist with their execution state. `createPersistentEffectSystem` covers transient flags; `persistent()` covers the script text; the gap is the *versioning* layer (Bitburner's Source Files include API-version stamps; Antimatter Dimensions' Automator migrates scripts across version bumps with deprecation warnings).

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 3–5 at baseline — a primary game-state resource (money / antimatter / points) + a script-execution budget (RAM / tickspeed / mana-per-script) + 1–3 prestige-multiplier currencies (augmentations / source-files / glyphs). Each has a `trackTotal` accumulator for meta-achievements.
- **Commands (tier-1):** 12 — `buy`, `sell`, `wait`, `waitUntil`, `prestige`, `click`, `toggle`, `set`, `increment`, `log`, `halt`, `noop`. Every command has cost schema + validator + execution hook. Repeat (`<`) and sync (`=`) are control-flow primitives, not commands.
- **Commands (tier-2):** +24 — `if`, `while`, `for`, `function`, arithmetic operators, comparison operators, resource query (`get`, `max`, `afford`), branch (`break`, `continue`), async (`await`, `sleep`), logging (`console.log`, `trace`), script-local variables (`let`, `const`).
- **Commands (tier-3, optional):** +unbounded — full JS API with game-state read/write, per-script VM namespace, inter-script messaging, file-system metaphor (Bitburner's `/scripts/*.js`).
- **Augmentations / glyphs / source-files:** 15 at baseline across 3 categories (yield, efficiency, unlock). Each is a `createPurchasableCategory` entry that composes into the script-yield modifier chain.
- **Script slots:** 5 default, up to 10 via purchasable upgrades. Each slot persists code text + last-execution metrics.
- **Achievements:** 20 — 8 script-authorship milestones (first script, first 10-line script, first 100-action run, first unattended hour), 6 efficiency milestones (per-unique-command count, distinct-strategy count), 6 hidden (script-that-runs-forever, script-that-beats-dev-benchmark, etc.).
- **Progression gates:** tier-2 unlocks via action-count / resource / script-execution-count; tier-3 unlocks via prestige-count or augmentations-owned; per-command unlocks via skill / purchasable.

**Density target:** every beat maps to at least one content entry. Beat 1 → first tier-1 command (`buy` or `click`); beat 2 → queue authoring surface + repeat primitive affordance; beat 3 → `<` repeat loop primitive; beat 4 → `if` / `waitUntil` conditional affordance (tier-1-conditional); beat 5 → augmentation category visible + first multiplier applied; beat 6 → text editor surface + tier-2 command vocabulary appears; beat 7 → multi-command script trace readout; beat 8 → prestige-adjacent milestone action + script-persistence proof.

---

## 9. UI prescription

- **Primary shell:** `SidebarMainShell` — automation-idle 2/2 convergent per `subgenre-shell-mapping-2026.md § "automation-idle"` (N=2, insufficient corpus flag but 100% convergent — Bitburner, The Farmer Was Replaced). Exemplar rows from `layout-audit-2026.md`: Bitburner (sidebar-main, Monaco Editor as main panel), The Farmer Was Replaced (sidebar-main, code editor panel). Also matched by Antimatter Dimensions' sidebar-main shape in the prestige-idle sub-genre — its Automator surface lives inside the main panel, consistent with the Scripter prescription.
- **Secondary shell:** `ThreePanelShell` — `declared invention` for tier-1-only Scripter forks. Tier-1 Scripters (Cavernous II, Idle Loops family, Omsi Loops) appear in the `time-loop` sub-genre's three-panel cluster per `subgenre-shell-mapping-2026.md § "time-loop"` (Idle Loops, Omsi Loops as three-panel). Tag `declared invention` because the sub-genre is time-loop not automation-idle — the prescription relies on the structural-shape match (left: command drawer, centre: queue, right: stats/log) rather than a Scripter-labelled corpus row. Use when the fork caps at `tierCeiling: 'queue'`.
- **Form-factor intent:** `desktop` — automation-idle is desktop-convergent per `layout-audit-2026.md` rows (Bitburner desktop, The Farmer Was Replaced desktop). Code authoring is pointer + keyboard primary; touch-first is a declared-invention territory Scripter does not claim. (Antimatter Dimensions' Automator is also desktop-dominant in the corpus rows even though the base game ships mobile builds — the Automator itself is not a mobile surface.)
- **ARIA-aligned widgets (lift targets):**
  - `Dialog` — script save/load picker, augmentation tree, language-reference overlay. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Tooltip` — command reference on hover, cost preview on purchase rows, modifier breakdowns on stat readouts. Cites `widget-vocabulary.md` Layer 1 (frequency 5; Profectus modifier tooltips cited as exemplar).
  - `Tabs` — script-slot switcher, augmentation-category tabs, tier-gradient progression tabs. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — per-script execution progress, per-action duration bars, tier-unlock progress. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Accordion` — collapsible command-reference sections, collapsible per-augmentation detail. Cites `widget-vocabulary.md` Layer 1 (frequency 4).
  - `NavigationMenu` — sub-nav for command categories within the reference panel (queries / actions / control-flow / system). Cites `widget-vocabulary.md` Layer 1 nested-nav (frequency 4; Synergism / Celestial Incremental exemplars).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - code editor panel — the signature Scripter widget. Monaco Editor (Bitburner — `widget-vocabulary.md` Layer 2 row: Bitburner) or textarea-with-syntax-highlighting (Antimatter Dimensions Automator). Cites `widget-vocabulary.md` Layer 2 row: "Code editor panel: The Farmer Was Replaced; Bitburner — multiple rows — single sub-genre (automation-idle)".
  - terminal / REPL — Bitburner's CLI for ad-hoc command execution and script-management orchestration. `widget-vocabulary.md` Layer 2 notes the ASCII / monospace aesthetic as a separate presentational row; the terminal itself is widget-family unique to automation-idle. Fork-optional — tier-2-only forks may skip.
  - execution log — scrolling log of script-emitted output, per-action dispatch trace, and error messages. Cites `widget-vocabulary.md` Layer 2 (frequency 5 for log / history family).
  - script slot panel — list of saved script slots with active / paused / error state per slot. Cavernous II's saved-queues widget is a structural cousin. Cites `widget-vocabulary.md` Layer 2 (adjacent to the inventory-panel family).
  - action queue widget — tier-1-only forks. Drag-to-reorder with repeat / sync markers inline; same widget-family as Looper's action-queue widget but structurally extended with control-flow nodes. Cites `widget-vocabulary.md` Layer 2 (Cavernous II + Idle Loops exemplars).
  - command reference / API documentation panel — tier-2+ forks. Searchable list of available commands with signatures + examples. Bitburner's in-game NetScript documentation is the corpus anchor; no other Layer 2 row today — `declared invention` within a per-fork implementation.

  Per-fork implementation — no pre-abstraction (OL-273 Phase 2).
- **Layout detail:** sidebar-main region assignment — left sidebar holds icon navigation (script slots, augmentation tree, command reference, settings); main panel holds the code editor (tier-2+) or the queue builder (tier-1), with a secondary execution-log pane docked below or right. Modal (`Dialog`) hosts the augmentation tree, script import/export, and the command-reference overlay when invoked from the editor. Bitburner's city-map / hacknet auxiliary surfaces are fork-level additions on top of the main panel, not base shell.
- **Nav pattern:** icon sidebar (left), matching Bitburner directly. Sub-nav within the main panel uses `Tabs` for script-slot switching; `NavigationMenu` for command-category nesting inside the command reference.
- **Declared-invention notes:** the primary-shell citation rests on an N=2 `automation-idle` convergence (below the 40% threshold that would earn a named majority); the secondary-shell tag makes the structural-shape-match reasoning explicit for tier-1-only forks. A future audit expansion that grows the `automation-idle` row past N=3 would let the primary prescription drop its insufficient-N caveat; that follow-up is out of scope for this archetype.

---

## 10. Predicted engine gaps

Scripter is designed to surface the engine's DSL / script-execution surface. Each row below is a hypothesis; the first fork that adopts the skeleton will confirm or reject. Confirmed gaps become engine tickets; rejected ones get deleted from a later revision of this doc.

| Gap | Severity | Notes |
|-----|----------|-------|
| Script runtime primitive absent | High | No `createScriptRuntime`, no DSL interpreter, no iteration-limited evaluator in the engine today. Every Scripter fork will hand-roll one. The `novel-patterns-synthesis-v4.md` entry for cluster #1 flags this as the promotion blocker. Proposed resolution: `createScriptRuntime({ commands, safetyLimits, persist })` returning a `{ parse, run, pause, stop, trace }` façade — tier-1 (queue) and tier-2 (DSL) compose the same primitive with different `commands` + parse stages; tier-3 (meta) sandboxes a host-language VM and registers the same command surface as the script API. Blocks pattern promotion and probably blocks any Scripter fork from landing cleanly. |
| Command dispatch + validation layer | High | `createContentRegistry` covers registration; the *validation + dispatch hook* layer (argument schema, cost check, availability check, execution hook, trace emission) is wired game-side in every exemplar. Bitburner's 300+ NetScript functions and Antimatter Dimensions' 40+ Automator commands share this shape. Proposed resolution: `createCommand({ id, args, cost, validate, execute, trace })` that composes with `createContentRegistry`. Shared with Scripter only; not a cross-archetype primitive. |
| Script persistence + versioning | Medium | `persistent()` handles the text; script-execution state (active slot, pause flag, per-script runtime cursor) is a separate shape. Bitburner's Source Files include API-version stamps; Antimatter Dimensions' Automator migrates scripts across version bumps with deprecation warnings. Proposed resolution: `createPersistentScript({ id, code, state, apiVersion })` as a thin wrapper around `createPersistentEffectSystem` + `persistent()`. Low-ish severity because game-side wrapping is ergonomic today; graduates when a second Scripter fork replicates the migration logic. |
| Formula inversion surface | Medium | Profectus-pattern: formulas that evaluate forward *and* invert on demand (`formula.invert(target) → input`). The engine's `Formula<T>` type + `createPolynomialFormula` / `createLogFormula` / `createSqrtFormula` builders are forward-only today. Scripts benefit hugely from inversion ("what do I need for the next augmentation?" answered without bisection). Proposed resolution: extend `Formula<T>` with optional `invert` / `integrate` methods when the formula's algebraic shape permits; add an inverse-aware variant of each cost-shape builder. Profectus's `formulas.ts:43-91` is prior art. Graduates if a second consumer (Scripter fork + Scaler fork) co-requests it. |
| Multi-agent script scheduler | Medium | Bitburner's concurrent-script model — multiple sandboxes, per-agent RAM budget, round-robin or priority-weighted dispatch — has no engine analogue. `createCompositeStrategy` is close in shape but strategy-selection is not scheduling. Proposed resolution: `createScriptScheduler({ agents, budget, policy })` that composes with `createScriptRuntime`. Medium because single-agent forks skip this entirely; blocks only Bitburner-shape forks. |
| Modifier-chain trace API for scripts | Medium | `withChain` attributes gains into named chains for dev-time trace-view readability; the script-facing equivalent ("why is my hack yield 3.2×?" answered with a named-contributor breakdown) is game-side. Proposed resolution: expose `chain.trace(): { factor, source, contribution }[]` as a first-class read API that scripts can call at runtime. Looper's § 10 flags an adjacent cost-contribution registry gap — the two probably collapse into one primitive. |
| Safety-limit primitive (iteration / timeout / depth) | Low-medium | Every Scripter fork wires iteration caps, timeout, and loop-depth limits individually. `createPersistentEffectSystem` covers effect flags; a shared `createExecutionLimit({ iterations, timeout, depth })` config struct consumed by the runtime primitive would unify the three. Low-medium because it's a small ergonomic win alone; pairs naturally with the runtime primitive. |
| Script-observable state snapshot | Low | Scripts want a read-only view of game state (`state.money`, `state.augmentations.owned`, `state.zones.current`). Today's alternatives — Vue reactive refs directly, or ad-hoc snapshot functions — both leak mutation risk or performance cost. Proposed resolution: a `getReadonlySnapshot(): ScriptView` helper that emits a shallow-frozen object the script can read without escaping into the reactive system. Low because forks can template their own; graduates if two consumers converge on the same view shape. |

---

## 11. Themes

### Theme A — Hacker sandbox (the Bitburner baseline)

- **Hook:** The canonical. You start with a terminal and a tiny budget of RAM. Write a script that hacks a neighbour's server for money, buy a bigger server, run more scripts, hack harder targets. Prestige via Augmentations that multiply script efficiency. Cultural shorthand for the archetype.
- **Resource mapping:** primary-resource = money; execution-budget = RAM; prestige-multiplier = augmentations + source-files. Commands: `hack`, `weaken`, `grow`, `scan`, `purchaseServer`, `install`. Editor label: "NetScript Editor". Run verb: `run`.
- **Narrative framing:** medium — a neon-noir backdrop with implied corporate-cyberpunk stakes; arc closure is the first Augmentation install, narratively framed as "reinstalling your mind."

### Theme B — Alchemical grimoire (fantasy DSL)

- **Hook:** You are a wizard inheriting a family grimoire. The grimoire contains spell *recipes*; you author new spells as macros that chain the basic incantations. More-advanced runes (tier-2) appear as your mastery grows; by the end of arc, your script-spells self-cast as wards across a small world.
- **Resource mapping:** primary-resource = mana; execution-budget = incantations-per-day; prestige-multiplier = runes + elemental-affinities. Commands: `cast`, `bind`, `await`, `summon`, `dispel`, `consecrate`. Editor label: "Grimoire". Run verb: `cast`.
- **Narrative framing:** strong — each augmentation unlock is a spell-tier discovery; arc closure is the binding of a permanent ward-script.

### Theme C — Space-station operator (logistics terminal)

- **Hook:** You pilot a deep-space cargo-hauler with a captain's terminal. Type commands to route goods, upgrade modules, and automate docking cycles. Your script becomes the crew. Prestige is a jump to a new sector; your captain's log (script library) survives.
- **Resource mapping:** primary-resource = credits; execution-budget = compute-cycles; prestige-multiplier = sector-charts + hyperdrive-upgrades. Commands: `dock`, `transfer`, `patrol`, `bid`, `refuel`, `jump`. Editor label: "Captain's Terminal". Run verb: `execute`.
- **Narrative framing:** medium — log-entries on augmentation unlock; arc closure is the first jump to a sector with a preserved script library.

### Theme D — Autonomous gardener (cosy idle)

- **Hook:** You author growth-plans for a plant nursery. Scripts water, prune, transplant, harvest; seasons rotate and the plants compound. A gentler-feeling Scripter where the fantasy is watching a garden maintain itself elegantly.
- **Resource mapping:** primary-resource = seeds → produce → coin; execution-budget = gardener-hours; prestige-multiplier = soil-quality + biodiversity. Commands: `water`, `prune`, `transplant`, `harvest`, `compost`, `wait-season`. Editor label: "Growth Plan". Run verb: `tend`.
- **Narrative framing:** light — seasonal flavour-text, no over-arching plot; arc closure is the first self-sustaining season where the garden survives on the script alone.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
