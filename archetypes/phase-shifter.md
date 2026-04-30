# Archetype: Phase-shifter

> **One-line identity:** Narrative-driven Phase Transitions + mechanic lifecycle (install / disable / replace) — the game that changes itself.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [A Dark Room](../../open-loop-research/analyses/complete/a-dark-room-analysis.md) (4-phase shift: Room → Outside → Path → Ship → Space; genre pivots from idle clicker to village sim to turn-based roguelike to action minigame), [Universal Paperclips](../../open-loop-research/analyses/complete/universal-paperclips-analysis.md) (3-act structure: Business → Space → Universal Domination; `humanFlag` / `spaceFlag` state-machine with soft `prestigeU` / `prestigeS` carry-over), [Candy Box 2](../../open-loop-research/analyses/complete/candy-box-2-analysis.md) (progressive-disclosure layering: farm production expands to embedded ASCII adventure game), [A Dark Forest](../../open-loop-research/analyses/complete/a-dark-forest-analysis.md) (Dark Room-style narrative successor; three-panel shell variant of the phased-storytelling pattern), [Groundhog Life](../../open-loop-research/analyses/complete/groundhog-life-analysis.md) (narrative-integrated resets sub-pattern; loop framing as phase-shifter thematic layer over a Looper skeleton).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. Phase-shifter is the second Wave-1 archetype drafted without a live consumer in `/work/studio/` (the first was Scripter OL-543); grounding is Exemplars-only. The first fork that adopts the skeleton will confirm or reject the mechanic-lifecycle gap in § 10. The archetype is explicitly `candidate` — the graduation question is *"does the skeleton survive ≥2 real theme passes without collapsing to a modifier layer over Producer or Looper?"*

---

## 1. Player experience

Phase-shifter is the archetype where *the game changes itself*. You do not prestige; the mechanics you just mastered are retired, replaced, or absorbed into a new mode the player did not know existed. The first ten minutes are deliberately sparse — a single button, a minimalist log, a narrative copy hook that raises a question and does not answer it. You learn one loop and then, without warning, a new affordance appears in the margin. The mystery is doing work the tutorial normally does.

A thirty-minute session is a sequence of discoveries. Each phase has its own rhythm — Phase 1's anxious fire-stoking, Phase 2's wire-price optimization, Phase 3's dusty-path inventory triage. The signature moment is the *pivot*: the second when the game reveals it was not what you thought. "Wait, this is a village sim now?" "Wait, this is an RPG?" "Wait, this is an existential argument about paperclips?" Unlike Producer, there is no central number you chase for the whole arc; unlike Looper, the loops are not cyclical — each phase is a one-way door. Unlike Scaler, the layer you add does not accelerate the old one; it replaces it, or sidelines it, or absorbs it into a larger machine. The long-term pull is *narrative momentum* — not "I want to see a bigger number" but "I want to see what happens next." The arc-closure beat is the moment the game stops pretending it is a single genre and the player realises, often in retrospect, that the whole structure was a phased argument.

---

## 2. Pattern composition

**Required patterns:**

- [Narrative Systems](../../open-loop-research/patterns/tier-2-common/narrative-systems.md) — the headline pattern. 21% corpus prevalence per the pattern doc (9/42 games); Phase-shifter implements three of the four sub-patterns directly (Mystery-First Design, Thematic Integration, Phased Storytelling) and inherits Narrative-Integrated Resets optionally when a fork adopts soft carry-over.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — the skeleton's progression backbone. Phase unlocks replace the conventional cost-threshold progression curve with narrative-gate progression; each phase has its own internal progression curve but the macro arc is phase-to-phase.
- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — actions are the substrate every phase composes over. Phase 1 actions (stoke fire, make paperclip, eat candy) may be disabled, preserved, or replaced when a phase transition fires; the Activity System is phase-aware at runtime.

**Cross-pattern properties engaged:**

- [Unlock Requirements](../../open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md) — dominant. Every phase transition is an unlock gate; every intra-phase content reveal is a nested unlock gate. Phase-shifter is the archetype with the densest `unlock.when` surface.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — narrative triggers are quantity-tracked (trust milestones at Fibonacci thresholds in Paperclips, temperature levels in Dark Room, candies-thrown count in Candy Box 2). `trackTotal` / `trackBest` feed the phase-transition predicates.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — per-phase modifier chains. Within-phase yields compose through modifier stacks; phase transitions install or disable whole chains atomically.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — intra-phase cost curves. Each phase has its own formula shape (polynomial within A Dark Room's buildings, exponential within Paperclips' Phase 2 drone costs); the transition does not interpolate between them, it switches.

**Optional modifiers (fork may add):**

- **Soft carry-over prestige** — Paperclips `prestigeU` / `prestigeS` shape. A fraction of run progress persists across phase-transition resets as a narrative-thematic multiplier ("the AI remembers"). Adds Narrative-Integrated Resets sub-pattern; composes onto `createCumulativeConversion`. Most phase-shifter forks skip this at tier-1 and add it only if they want replay depth.
- **Spatial late-phase** — Dark Room Path/World phase shape. A late phase introduces spatial navigation with inventory and combat, extending the skeleton with zone-system mechanics. Adds `createZoneSystem` + `createInventory`; the skeleton stays agnostic about spatial vs. non-spatial late phases.
- **Canvas minigame late-phase** — Paperclips Act-3 shape. A terminal phase shifts the interaction model to a canvas-based real-time minigame (asteroid dodging, drone combat). Declared-invention territory at the widget layer; orthogonal to the mechanic-lifecycle skeleton.
- **Embedded adventure sub-game** — Candy Box 2 shape. A phase does not replace the host game but *inserts* an orthogonal game loop (ASCII adventure, quest chain, combat minigame) alongside the running production game. Transition mode is `'layer'` rather than `'replace'`.
- **Multi-ending branching** — Biotomata endings-gallery pattern. The arc-closure beat diverges based on accumulated narrative choices; each ending is a separate phase-3 or phase-4 terminal state. Extends `createTieredAchievement` into an ending-enumeration surface; fork-level add.

**Novel-patterns cluster alignment:**

- **Cluster #12 (Phase Transitions & Progression Shifts, emergent, 20+ games)** — Phase-shifter *is* the archetype for this cluster. `novel-patterns-synthesis-v4.md` § 12 lists the cluster as "emergent" (monitor-list) rather than tier-promoted, pending evidence that the shifts warrant their own pattern rather than composing cleanly from Narrative Systems + Progression Systems. Phase-shifter's implementation is what tests that proposition. If the skeleton survives ≥2 real theme passes without thinning to a narrative layer over another archetype, the cluster graduates.
- **Narrative Systems sub-pattern #3 (Phased Storytelling, 33% of narrative games, 3/9)** — the direct mechanical correlate. A Dark Room and Universal Paperclips are both in this sub-pattern cohort; the pattern doc's loop-3 (Phase Transition Anticipation) and dynamic-3 (Phase Transitions as "Aha Moments") are the psychology the archetype optimises for.

**Contrast with Cycler (OL-576).** The archetype most likely to be confused with Phase-shifter is Wave-2's Cycler (which composes the LIBRARY Phase-Alternation pattern). Both involve phase transitions; the distinction is architectural, not superficial. Phase-shifter is **one-way** (A → B → C, irreversible, each phase qualitatively new, mode-swap UX on transition); Cycler is **cyclical** (A ↔ B ↔ A ↔ B, self-similar cycles, shared state carrying across each cycle, timer-driven). Phase-shifter's engine posture is a phase-enum `createResource` + latched state-machine transition logic; Cycler's is a phase-enum `createResource` + oscillator driver (and pending OL-568 on whether a dedicated `createPhase` primitive graduates). Several Cycler games have Phase-shifter-like macro arcs at the campaign scale (They Are Billions' progressive threat escalation); several Phase-shifter games have Cycler-like micro loops within a phase (Dark Room's day/night fire cadence inside Phase 1). The macro dominant reading determines the archetype filing. See `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 3D for the authoritative distinction; the LIBRARY's Phase-Alternation pattern file also carries a "critical distinction" section that this archetype reciprocates.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Phase-state enum (`phase.value === 'business'` / `'space'` / `'path'` / `'ship'`) + per-phase narrative-resource pools (trust, temperature, candies-thrown) + per-phase primary resources (wood, paperclips, lollipops). The phase-state resource is the archetype's signature load-bearing primitive. |
| core | `createModifierChain` | Per-phase yield chains. Chains are tagged with a phase predicate (`when: () => phase.value === 'business'`) so a transition activates / deactivates whole chains without mutation. |
| core | `createMultiplicativeModifier` | Paperclips' `prestigeU` soft-carry-over multiplier; Dark Room's worker-count production multipliers. Composes into per-phase chains. |
| core | `createAdditiveModifier` | Flat bonuses tied to narrative milestones (compass acquired → +exploration-range; trust installed → +memory cap). |
| core | `createPolynomialFormula` | Intra-phase cost curves (Dark Room buildings: `wood = 10 + n*10`; Paperclips factory cost: `pow(level+1, 2.25) * 1M`). Every phase has its own formula shape — transitions switch, not interpolate. |
| core | `createLogFormula` | Log-polynomial curves for creativity / research-style resources (Paperclips creativity from excess ops). |
| core | `createCumulativeConversion` | Phase-transition-as-narrative-prestige. Paperclips' `prestigeU = Σ (demand-bonus-per-level)` and `prestigeS` are cumulative-conversion shape; Dark Room's random-division prestige is a cumulative-conversion-with-variance variant. Forks adopting soft carry-over compose this; skeletons that want no-carry-over phase transitions skip it. |
| core | `createReset` | Phase-boundary resets when transitionMode is `'replace'`. Paperclips' Business → Space transition resets Phase-1 resources; Dark Room's Space minigame clears Path inventory. `createReset` with a `preserve` predicate keeps the phase-state resource itself plus any narrative-milestone flags. |
| core | `createSequencer` | Deferred-trigger scheduler. Some phase transitions fire on a sim-time delay after a threshold is met (Paperclips' "HypnoDrone release after project complete + 60s tension beat"); `createSequencer` wraps the deferred fire so the narrative pacing is designable. |
| core | `createContentRegistry` | Phase-tagged content sets. Every dispatchable action, every purchasable, every zone entry is registered with a `phases: ['business' | 'space']` tag; the registry's visibility query takes the current phase and emits only active entries. The registry's filter surface is the archetype's primary ergonomics axis. |
| core | `createPersistentEffectSystem` | Phase-gate flags (`phaseEntered_space`, `phaseCompleted_business`, `narrativeMilestone_trustInstalled`) with cross-modifier `when` gates. Every phase-aware primitive reads this system. |
| core | `createTieredAchievement` | Narrative-milestone tiers. Paperclips' Fibonacci trust milestones, Dark Room's building-tier unlocks, Candy Box 2's grid-item acquisitions — all tiered achievements that double as phase-transition triggers. |
| core | `trackTotal` | Lifetime-accumulator reads feeding phase-transition predicates (total candies thrown, total paperclips ever made, total temperature-stokes). Phase-transition thresholds frequently predicate on `trackTotal` rather than current value. |
| systems | `createPurchasableCategory` | Per-phase purchase surfaces (Dark Room's buildings in Phase 2, projects in Paperclips' Phase 1, equipment in Path phase). Each category's visibility is phase-gated via the content-registry integration. |
| systems | `createTimedProgress` | Phase-entry animations + transition cooldowns (Dark Room `LIFTOFF_COOLDOWN: 120`, Paperclips project-activation delays). The transition itself is a state change; `createTimedProgress` handles the visible beat around it. |
| harness | `runHeadless` | Beat-timing sim tests. Phase-transition beats must land within tolerance windows; `runHeadless` drives the engine forward and asserts the transition fires in the correct sim-time range. |
| harness | `runMatrix` | Probe robustness across vars space — transition-threshold sweeps, carry-over-ratio sweeps, per-phase cost-scaling sweeps. |
| harness | `runSensitivity` | Which balance lever has the largest marginal effect on arc duration — typically the transition-threshold of the latest phase (which dominates total arc time). |

**Engine systems explicitly not used (required):**

- `createLoop` — Phase-shifter baseline is *one-way* transitions. A cyclical loop belongs to Cycler (OL-576) or Looper (OL-540). A fork that wraps the arc in an outer loop (rogue-lite "try a new ending each run" shape) is crossing into Looper-Phase-shifter territory; the skeleton itself refuses the cycle.
- `createInventory` — the skeleton does not prescribe inventory. A Dark Room's Path-phase inventory is a fork-level spatial-late-phase add; Paperclips and Candy Box 2 have no inventory in the Explorer sense. Reaching for `createInventory` signals that the fork has adopted the spatial-late-phase modifier; the skeleton stays agnostic.
- `createZoneSystem` — same reasoning as inventory. Phase-shifter's phase is not a zone; phases are mode switches, not place switches. Late-phase spatial content is a fork add (Dark Room's World, Paperclips' probe navigation); the skeleton carries no `createZoneSystem` call at default.
- `createChallengeCategory` — challenges are orthogonal modifiers, not archetype content. A Dark Room's combat phase is a Phase-shifter late-phase-genre-pivot, not a Challenge system; the distinction is that the challenge ends with the phase rather than gating a modifier layer.

Naming what is absent is half the Phase-shifter contract: the archetype refuses cyclical loops, inventory, and zone systems at the skeleton level, spending its surface budget on phase-state, content-registry phase-tagging, and the mechanic-lifecycle primitives that do not yet exist (§ 10). Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`; the gaps (§ 10) are primitives that *should* exist and do not.

**Primary stress axes:**

1. **Mechanic lifecycle (install / disable / replace).** The archetype's signature engine question. Every phase transition installs new content (new purchasables, new actions, new zones), disables old content (no more manual clicking after Paperclips Phase 2), or replaces content in place (Dark Room Room becomes Outside). `createContentRegistry` handles *registration*; the phase-aware *visibility + active-state gating* layer is game-side in every exemplar. The primitive-surface question is whether this graduates to a `createPhase({ registry, activePredicate, lifecycleHooks })` surface or stays as an ergonomics-heavy `when` composition.
2. **Narrative-trigger wiring.** Phase transitions fire on heterogeneous predicates — resource thresholds (Paperclips trust = 100), action counts (Candy Box 2 throw 30 candies), milestone flags (Dark Room compass acquired), project-completion (Paperclips HypnoDrones release), or combinations (Dark Room world-unlock = compass && population ≥ 30). The `Grant.when` + `createPersistentEffectSystem` composition covers the surface; the stress is declarative ergonomics — does the engine grow a `createPhaseTrigger({ when, fire, defer })` declarative shape or stay with imperative `watch(phase)` wiring.
3. **Per-phase content-registry scoping.** Two adjacent phases may share some content (Dark Room buildings persist from Room into Outside) and replace other content (Path inventory is Path-only). The registry's query surface needs to support both `phases: ['business']` (exclusive) and `phases: ['business', 'space']` (shared) with a single affordance. `createContentRegistry` today accepts arbitrary tags; the phase-aware convention is an ergonomics layer on top.
4. **Save-migration across phase-shape changes.** A fork that ships Phase 1 + Phase 2 at launch and adds Phase 3 in a post-launch update faces a migration question — saves that were mid-Phase-2 when Phase 3 ships need to land somewhere coherent. `persistent()` covers per-phase state; the cross-phase *shape-change* migration is a versioning layer that does not exist in the engine today. Scripter's § 10 flags an adjacent script-persistence-versioning gap; Phase-shifter's version of the same stress is phase-shape-versioning.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

```ts
// archetype.ts — skeleton defaults
export interface PhaseShifterArchetypeVars {
  // Named phases in arc order. At least 2 required; 3–4 is the exemplar baseline.
  // id is stable (used as content-registry tag); label is display-copy.
  phases: Array<{
    id: string;                   // e.g. 'business', 'space', 'room', 'outside'
    label: string;                // e.g. 'Business Phase', 'The Room'
  }>;

  // Transition mode — how a phase transition treats the previous phase's content.
  // 'replace' = Paperclips shape (Phase-1 mechanics disabled/hidden on transition).
  // 'layer'   = Dark Room + Candy Box 2 shape (Phase-1 mechanics persist; Phase-2 adds on top).
  // Per-phase override is the fork's tuning knob (`balance.transitionMode[phaseId]`).
  // The archetype-level default is 'replace' — the cleaner lifecycle test.
  defaultTransitionMode: 'replace' | 'layer';

  // Narrative pacing — which Narrative Systems sub-patterns the skeleton adopts.
  // 'mystery-first'     = zero tutorial, minimal copy (Candy Box 2, Dark Room shape).
  // 'thematic-integration' = named-resource theming + milestone flavour (Paperclips shape).
  // 'hybrid'            = both sub-patterns composed (most forks).
  narrativePacing: 'mystery-first' | 'thematic-integration' | 'hybrid';

  // Carry-over mode — does progress persist across phase transitions?
  // 'none'         = hard reset on transition (no multiplier carries over).
  // 'soft-prestige' = Paperclips prestigeU/prestigeS shape; partial multiplier persists.
  // 'full'         = old-phase resources remain as a background economy (layer mode only).
  carryOverMode: 'none' | 'soft-prestige' | 'full';

  // Optional late-phase shape — declares the archetype's late-phase modifiers a fork adopts.
  // Empty default; forks add tags as they compose.
  // 'spatial'   = Dark Room Path/World shape — adds createZoneSystem + createInventory.
  // 'canvas'    = Paperclips Act-3 asteroid/drone minigame — declared-invention widget layer.
  // 'adventure' = Candy Box 2 embedded ASCII quest chain.
  lateModifiers: Array<'spatial' | 'canvas' | 'adventure'>;

  // Multi-ending — does arc closure branch into multiple terminal states?
  // false = single arc-closure beat (Paperclips universal-domination).
  // true  = branched endings (Biotomata endings-gallery shape).
  multiEnding: boolean;
}

// theme.ts — costume, no mechanical impact
export interface PhaseShifterThemeVars {
  // Per-phase display labels (id → label override; ignored if phase.id unknown).
  phaseLabels: Record<string, string>;

  // Per-phase narrative hooks — copy shown at phase entry + closure.
  phaseCopy: Record<string, {
    onEnter: string;              // narrative log entry fired on phase-entry
    onExit: string;               // fired on phase-exit; carries into the next phase's framing
    ambientLog?: string[];        // ambient narrative lines interspersed across phase duration
  }>;

  // Milestone flavour — narrative copy for achievement-shaped phase triggers.
  milestoneCopy: Record<string, string>;

  // Mechanic install/disable toasts — text shown when content appears or retires.
  // Mandatory per-phase-transition toast; optional per-milestone.
  mechanicLifecycleCopy: {
    onInstall: string;            // e.g. "the compass settles into your palm"
    onDisable: string;            // e.g. "the old fire has gone cold"
    onReplace: string;            // e.g. "the room has become something else"
  };

  // Arc-closure copy; fires at beat 7.
  endOfArcMessage: string;
}

// balance.ts — mechanical overrides; drives beat timing
export interface PhaseShifterBalanceVars {
  // Per-phase transition thresholds — the dominant pacing lever.
  // Keyed by phase.id; each entry is the predicate the current phase must satisfy to advance.
  transitionThresholds: Record<string, {
    // Predicate kind. 'resource' compares a resource total; 'action-count' compares a dispatch count;
    // 'milestone-flag' checks named flags; 'combined' is an AND of multiple sub-predicates.
    kind: 'resource' | 'action-count' | 'milestone-flag' | 'combined';
    // For kind='resource': resourceId + threshold value.
    // For kind='action-count': actionId + threshold count.
    // For kind='milestone-flag': required-flag-ids array.
    // For kind='combined': array of sub-predicates (all must hold).
    spec: unknown;                // shape varies by kind; validated at fork time
    // Optional deferred-fire delay in sim-seconds (Paperclips HypnoDrones tension beat).
    deferSeconds?: number;
  }>;

  // Per-phase transition mode override (archetype-level default otherwise).
  transitionMode: Record<string, 'replace' | 'layer'>;

  // Per-phase cost-scaling curves — intra-phase progression lever.
  phaseCostScaling: Record<string, {
    // Formula shape for purchasables in this phase.
    curve: 'linear' | 'polynomial' | 'exponential' | 'log-polynomial';
    baseCost: DecimalSource;
    growth: number;               // polynomial exponent OR exponential base
  }>;

  // Per-phase target duration (sim-minutes) — beat-tolerance anchor.
  // Sum ≤ 120 min; the archetype enforces a 1–2 h arc constraint.
  phaseDurationTargets: Record<string, {
    min: number;                  // sim-minutes lower bound
    max: number;                  // sim-minutes upper bound
  }>;

  // Soft carry-over parameters — active only when archetype.carryOverMode === 'soft-prestige'.
  softCarryOver?: {
    // Paperclips-canonical: multiplier = 1 + (carryUnits * perUnitBonus).
    perUnitBonus: number;         // default 0.10 (Paperclips +10% demand per prestigeU level)
    // Which in-run quantity converts to carry-over units at transition.
    sourceResourceId: string;     // e.g. 'paperclips' in Paperclips' creativityAddsPrestigeU path
    // Conversion formula output becomes the carry-over unit count.
    conversionFormula: 'sqrt' | 'log' | 'linear';
    // Optional cap on carry-over units per transition.
    cap?: DecimalSource;
  };

  // Narrative-milestone trigger thresholds — fires flags that gate intra-phase reveals.
  // Flat list; each entry is a milestone-flag predicate.
  narrativeMilestones: Array<{
    id: string;                   // flag id set on trigger
    phase: string;                // phase.id the milestone lives in
    trigger: {
      kind: 'resource' | 'action-count' | 'time-in-phase' | 'purchasable-owned';
      spec: unknown;              // shape varies
    };
  }>;
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. `transitionThresholds` / `phaseCostScaling` / `phaseDurationTargets` / `transitionMode` merge by-phase-id (per-phase entries replace wholesale; unspecified phases use the archetype default). `narrativeMilestones` is an array — replace wholesale; forks that want to add milestones rebuild the array.

**Codegen contract:** `pnpm codegen:archetype-vars phase-shifter` (pending) reads this section and emits `src/modules/mods/<game>/vars/{archetype,theme,balance}.ts` with matching defaults wired up. Shared archetype-level types + defaults live at `src/archetypes/phase-shifter/`. The `spec: unknown` fields are by-design — kind-discriminated unions expand at fork time; codegen emits the union of known kinds plus a fork-extensible escape hatch.

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 4–7 at baseline. 1 phase-state resource (`phase` enum); 2–3 narrative-quantity resources (trust / temperature / candies-thrown — feed phase-transition predicates + milestone triggers); 2–4 per-phase primary resources (wood in Phase-1, paperclips/funds/operations in Paperclips Phase-1, lollipops/candies in Candy Box 2). Each has a `trackTotal` accumulator for meta-achievements.
- **Phases:** 3 at baseline (Paperclips shape). 2-phase skeleton is the minimum legal skeleton; 4-phase is the Dark Room shape and recommended for forks that want a full phase-shifter arc.
- **Actions per phase:** 2–5 at Phase-1 entry (stoke fire + gather wood in Dark Room; make paperclip + sell in Paperclips); expands to 6–10 at Phase-1 maturity; Phase-2 introduces 3–6 new actions and retires 1–3 old ones depending on transition mode.
- **Purchasables:** 5–12 per phase; Phase-1 is intra-phase scaled (Dark Room's 12 building types, Paperclips' factory/project chain); Phase-2 layers or replaces with its own set.
- **Narrative milestones:** 12–20 across the arc. Each is a `createTieredAchievement` entry that also sets a `createPersistentEffectSystem` flag. Cluster breakdown: 4–6 in Phase-1 (foreshadowing + first reveals), 1–2 at the phase boundary (transition triggers), 4–6 in Phase-2 (intra-phase depth), 2–4 terminal (arc closure).
- **Progression gates:** narrative-driven at phase boundaries (compass + population ≥ 30 in Dark Room; trust=100 + HypnoDrones-project in Paperclips); cost-driven within phases (standard purchasable affordability).
- **Achievements:** 15–25 at baseline. 6–8 phase-completion (one per phase-transition fired), 4–6 hidden-ending or multi-ending (when `archetype.multiEnding === true`), 5–10 intra-phase (canonical content-completion + speedrun + minimalist-run).
- **Ambient narrative log entries:** 20–40 across the arc, fired on resource thresholds, action counts, or time-in-phase. Dark Room's log is the canonical exemplar.

**Density target:** every beat maps to at least one content entry. Beat 1 → first Phase-1 action + minimal log copy; beat 2 → first intra-phase reveal (new action button + first narrative milestone); beat 3 → Phase-1 purchasable category populated + 3-milestone chain; beat 4 → foreshadowing milestone + Phase-2 project preview affordance; beat 5 → phase-transition firing + transition animation + `onReplace` / `onInstall` toast copy; beat 6 → Phase-2 action set active + Phase-1 lifecycle state change verified; beat 7 → second transition OR arc-closure narrative copy + final milestone.

---

## 9. UI prescription

- **Primary shell:** `SingleColumnShell` — narrative clicker weak majority per `subgenre-shell-mapping-2026.md § "narrative clicker"` (6/13 classifiable, 46%). Exemplar rows from `layout-audit-2026.md`: A Dark Room (single-column, key-value resource pairs), Candy Box 2 (single-column with fixed-width ASCII canvas), AdVenture Capitalist (single-column with business cards), Candy Box (single-column ASCII).
- **Secondary shell:** `ThreePanelShell` — narrative clicker strong secondary per `subgenre-shell-mapping-2026.md § "narrative clicker"` (3/13 classifiable, 23%). Exemplar rows from `layout-audit-2026.md`: Universal Paperclips (three-panel with canvas-based battle arena in late phase), Cookie Clicker (three-panel with left producers / centre clicker / right stats), A Dark Forest (three-panel, Dark Room narrative successor). Use when the fork's Phase-1 has a persistent resource panel or stats readout alongside the narrative surface.
- **Form-factor intent:** `desktop` — narrative-clicker sub-genre has no mobile-aware majority per `subgenre-shell-mapping-2026.md § "Corpus gaps worth naming"`. Both Candy Box 2 and Universal Paperclips ship web-first desktop; Dark Room has mobile builds but the canonical interaction model is pointer-and-keyboard. A mobile-first phase-shifter fork claims `responsive` or `mobile-first` as a `declared invention` with rationale.
- **ARIA-aligned widgets (lift targets):**
  - `Dialog` — phase-transition modal (the "wait, this is an RPG now?" moment's explicit acknowledgement screen, optional), narrative-milestone reveal modal, ending-gallery overlay. Cites `widget-vocabulary.md` Layer 1 (frequency 6; Advent Incremental story modal dialogs cited as exemplar).
  - `Progress` — narrative-quantity readouts (trust progression, temperature bar, candies-thrown counter toward next milestone), per-phase completion indicator. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Tabs` — phase-gated top-level sections when the shell is three-panel (Phase-1 surfaces in one tab, Phase-2 in another, ending gallery in a third). Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Accordion` — collapsible narrative-log sections, per-milestone detail, per-ending flavour. Cites `widget-vocabulary.md` Layer 1 (frequency 4).
  - `Tooltip` — milestone-hover flavour copy, purchasable cost previews within the active phase. Cites `widget-vocabulary.md` Layer 1 (frequency 5).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - narrative-log stream — the signature Phase-shifter widget. Append-only or rolling-window text stream where phase transitions, milestone triggers, and ambient copy land. Dark Room's scrolling log is the canonical exemplar. Cites `widget-vocabulary.md` Layer 2 (game log / event log, frequency 5).
  - resource-table — Dark Room's key-value resource pairs with always-visible quantities; distinct from a shell-level resource bar. Cites `widget-vocabulary.md` Layer 2 (resource table, frequency 4; A Dark Room cited).
  - per-phase action panel — Phase-shifter's replacement for a general action-queue widget. A list of currently-active dispatchable actions, phase-filtered via the content-registry visibility layer. No direct corpus widget; structural cousin to the action-card family. Cites `widget-vocabulary.md` Layer 2 (action card / building card, frequency 4).
  - phase-transition animation / mechanic-install toast — the moment-of-change UX. Corpus variants: Dark Room's quiet tab-pane swap, Paperclips' project-button-completion state change, Candy Box 2's tab-unlock notification. No single corpus widget captures the transition; `declared invention` at the widget layer. The archetype's § 3 mechanic-lifecycle primitive is the engine-side counterpart; the widget is the visible half.
  - canvas play area — fork-optional, activated when `archetype.lateModifiers` includes `'canvas'`. Paperclips Phase-2 asteroid/drone combat, Candy Box 2 embedded ASCII adventure quests. Cites `widget-vocabulary.md` Layer 2 (canvas play area, frequency 14; Universal Paperclips + Candy Box 2 cited).
  - ending-gallery — fork-optional, activated when `archetype.multiEnding === true`. Biotomata's endings gallery is the corpus anchor; appears once in `widget-vocabulary.md` appendix (single-game mention). `declared invention` when Phase-shifter adopts it; graduates if two forks co-adopt.

  Per-fork implementation — no pre-abstraction (OL-273 Phase 2).
- **Layout detail:** single-column shell — top-to-bottom region order is narrative-log stream → active-phase action panel → resource-table → per-phase purchasable list → collapsible ending/achievement accordion. Three-panel variant: left column narrative-log + log controls; centre column active-phase action panel + active canvas (if lateModifier 'canvas'); right column resource-table + stats + per-phase purchasable list. Phase-transition animation overlays the whole shell briefly, then the shell content recomposes to the new phase's layout.
- **Nav pattern:** minimal at Phase-1 (narrative-first design — nav widgets hidden or absent until first milestone fires). Tabs introduced at phase-2+ when shell is three-panel. Single-column shell relies on scroll-position and sequential reveal instead of nav; narrative-first forks should preserve that discipline.
- **Declared-invention notes:** the mechanic-install / onReplace transition animation and toast are declared-invention at the widget layer — no single corpus widget captures the moment-of-change. The archetype's prescription is that this UX receives deliberate design attention rather than defaulting to a generic toast. When `archetype.multiEnding === true`, the ending-gallery widget is also `declared invention` (Biotomata-single-game corpus evidence only); the second fork to adopt it graduates the widget into the Layer 2 domain vocabulary at the next audit.

---

## 10. Predicted engine gaps

Phase-shifter is designed to surface the engine's mechanic-lifecycle and phase-aware-content-registry surfaces. Each row below is a hypothesis; the first fork that adopts the skeleton will confirm or reject. Confirmed gaps become engine tickets; rejected ones get deleted from a later revision of this doc.

| Gap | Severity | Notes |
|-----|----------|-------|
| Phase-aware content-registry | High | `createContentRegistry` accepts arbitrary tags today; the phase-aware *visibility + active-state gating* layer — where a tag value filters emission + triggers modifier-chain activation/deactivation — is hand-wired in every exemplar. Proposed resolution: `createPhase({ id, registry, activePredicate, onEnter, onExit })` that composes with `createContentRegistry` and `createPersistentEffectSystem`. A Phase is the canonical container — registering an action / purchasable / zone with a `phases: ['business']` tag automatically participates in the visibility + lifecycle flow. Blocks any Phase-shifter fork from landing cleanly; reciprocal of Cycler's (OL-576) `createPhase` question, though with different transition semantics (one-way vs. cyclical). |
| Declarative phase-transition trigger | Medium-high | Phase transitions fire on heterogeneous predicates (resource threshold, action count, milestone-flag AND, project-completion). Every exemplar wires these imperatively through `watch(phase)` + manual mutation. `Grant.when` + `createPersistentEffectSystem` cover the predicate surface; the ergonomics layer is missing. Proposed resolution: `createPhaseTrigger({ from, to, when, defer? })` that declaratively binds a predicate to a transition, with optional deferred-fire for narrative-timing control. |
| Mechanic-lifecycle hooks (install / disable / replace) | Medium-high | When a phase transitions, the registry's downstream consumers (UI panels, modifier chains, save-state serialisers) need lifecycle notifications. Today this is ad-hoc: some consumers poll, some subscribe to `phase`, some watch individual resources. Proposed resolution: the `createPhase` primitive above emits `onInstall` / `onDisable` / `onReplace` events that consumers subscribe to; modifier chains registered with a phase tag automatically activate/deactivate on the corresponding events. Reciprocal of Scripter's OL-543 § 10 "Script runtime primitive absent" gap — both archetypes need a lifecycle primitive the engine does not yet have. |
| Phase-shape save migration | Medium | A fork that ships Phase 1 + 2 at launch and adds Phase 3 later faces a migration question — saves mid-Phase-2 at version N need a defined landing in version N+1's phase shape. `persistent()` handles per-phase state; the cross-phase shape-change migration is a versioning layer absent from the engine. Proposed resolution: `createPhaseShape({ version, migrations })` where migrations are named transformers from version N to N+1's phase set. Low-medium; only bites post-launch forks, but when it bites it bites hard. |
| Phase-scoped modifier attribution | Low-medium | `withChain` attributes yields into named chains; the phase-aware variant ("this multiplier comes from Phase-1's tannery chain and is still firing because transitionMode is 'layer'") is game-side. Proposed resolution: `withPhaseChain(phaseId, chainId)` that tags attribution with the phase-of-origin, surfaced in trace views and readouts. Low-medium; graduates if two phase-shifter forks co-request phase-aware debug surfaces. Pairs naturally with Scripter's `chain.trace()` gap. |
| Narrative-milestone declarative surface | Low-medium | 12–20 milestones across the arc, each with its own trigger predicate, flag-set effect, and narrative-copy emission. `createTieredAchievement` + `createPersistentEffectSystem` compose the surface but forks hand-wire the narrative-copy emission. Proposed resolution: `createNarrativeMilestone({ id, phase, trigger, onTrigger, copy })` that bundles the three concerns. Low severity alone — the verbose composition works — but high-volume enough per fork that the ergonomics matter. |
| Multi-ending enumeration | Low | Forks that want branched endings (Biotomata shape) hand-roll a terminal-state enumeration against the Tiered-Achievement surface. Proposed resolution: `createEndingRegistry({ endings, gatedBy })` that extends the achievement surface with ending-specific metadata (final-state snapshot, unlock condition, replay-encouragement copy). Low; single-corpus-game evidence today. Graduates when a second phase-shifter fork ships endings. |
| Transition-mode ('replace' vs. 'layer') as first-class primitive concept | Low-medium | The archetype names two transition modes; the engine has no concept of either. `createReset` is close in shape for 'replace' (phase-boundary reset with preserved narrative flags); no engine primitive corresponds to 'layer' beyond the absence of a reset. Proposed resolution: 'layer' is the null case (no primitive needed); 'replace' composes cleanly on `createReset({ preserve: [phaseResource, ...milestoneFlags] })`. May not need a new primitive; gap confirmed rejected if two forks land 'replace' cleanly on `createReset`. |

---

## 11. Themes

### Theme A — Post-apocalyptic survival-to-escape (the Dark Room baseline)

- **Hook:** You wake in a dark, cold room. There is a fire. The fire needs wood. Minutes later, a stranger arrives. You build a village. Population grows. One day you walk outside and the world is bigger than you knew. You find a crashed starship. You repair it. You fly.
- **Resource mapping:** Phase-1 primary = wood; narrative resource = temperature + stranger-arrived flag. Phase-2 primary = population + resource-chain outputs (fur, meat, leather). Phase-3 (fork-level, `lateModifiers: ['spatial']`) = expedition inventory + alien alloy. Phase labels: "The Room" / "The Village" / "The Dusty Path" / "The Starship".
- **Narrative framing:** strong, mystery-first. Zero tutorial copy; narrative log entries are elliptical ("the fire is dead" → "the builder arrives" → "the world extends beyond the hut"). Arc closure = starship liftoff; multi-ending adopts Dark Room's original + secret variants as endings-gallery entries.

### Theme B — AI-alignment maximizer (the Paperclips baseline)

- **Hook:** You are an AI. Your goal is paperclips. You start with one. You build factories. You negotiate for human trust. You release HypnoDrones. The humans are no longer a concern. You enter space. You consume the universe for paperclips.
- **Resource mapping:** Phase-1 primary = paperclips + funds + operations + creativity + trust. Phase-2 primary = matter (harvested) + wire-processed + probe fleet. Phase-3 primary = remaining-universe-matter countdown. Phase labels: "Business" / "Space" / "Universal Domination".
- **Narrative framing:** strong, thematic-integration. Every resource name carries thematic weight ("Trust" as human trust in the AI; "Operations" as computational thinking cycles; "Wire Drones" as self-replicating Von Neumann probes). Soft carry-over active — `prestigeU` / `prestigeS` survive cross-run. Arc closure = final matter converted; `multiEnding: false` — one terminal state, one philosophical argument.

### Theme C — Sweet absurdism (the Candy Box 2 baseline)

- **Hook:** You have candies. You can eat them. Then you can throw them. Then you meet a talking candy. Then there is a lollipop farm. Then, a cave. Then you are in an ASCII adventure game with quests and equipment and boss fights, and you are still the candy-haver.
- **Resource mapping:** Phase-1 primary = candies. Phase-1b = lollipops + farm output. Phase-2 (`transitionMode: 'layer'`) = adventure-currency + equipment + quest-flags alongside ongoing farm. Phase labels: "The Candies" / "The Farm" / "The Cave and Beyond".
- **Narrative framing:** strong, hybrid. Mystery-first at phase-1 ("eat candies" with zero explanation), thematic-integration via candy-lollipop-cave vocabulary, phased-storytelling with explicit genre-pivot at cave-entry. Layer-mode transition: the farm keeps producing while the adventure runs. `lateModifiers: ['adventure']`; arc closure = Developer boss defeated + optional secret endings via grid-item completion.

### Theme D — Corporate-decline-to-renaissance (novel, declared-invention adjacent)

- **Hook:** You are a small family business. The market shifts. Your product becomes obsolete. You close the factory. You re-tool. In the second act, you are a software consultancy. In the third, you sell the consultancy and fund a climate-mitigation research lab. Each phase retires the previous business entirely. The narrative is one of necessary reinvention.
- **Resource mapping:** Phase-1 primary = revenue + inventory. Phase-2 primary = client-contracts + team-size + portfolio. Phase-3 primary = research-grants + paper-citations + mitigation-impact. Phase labels: "The Factory" / "The Consultancy" / "The Lab". Soft carry-over = founder-reputation multiplier across transitions.
- **Narrative framing:** strong, thematic-integration + phased-storytelling. No mystery-first — the archetype's opening phase is explicit about the decline ahead. Each transition is a deliberate decision ("close the factory?" with weight). Multi-ending active: the final phase branches on whether the lab achieves, compromises, or abandons its mission. `transitionMode: 'replace'` canonical; the business from Act-1 is gone when Act-2 opens. Novel theme; no single corpus exemplar, cited as `declared invention` at the theme-hook level rather than the mechanical level.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
